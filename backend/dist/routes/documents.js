import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AIRequestError, createAIProvider } from '../services/ai/maxplus.js';
import { extractPdfText } from '../services/pdf/extract-text.js';
import { requireAuth, checkRateLimit, recordUsage } from '../lib/rate-limit.js';
const MAX_BYTES = 12 * 1024 * 1024;
const root = path.join(process.cwd(), 'data', 'documents');
export async function POST(request) {
    // Check authentication
    const auth = await requireAuth(request);
    if (auth instanceof Response)
        return auth;
    const { userId } = auth;
    // Check rate limit
    const rateLimit = await checkRateLimit(userId, 'FREE');
    if (!rateLimit.allowed) {
        return Response.json({
            error: `Rate limit exceeded. You can make ${rateLimit.remaining} more requests. Try again in ${rateLimit.resetIn} seconds.`,
            resetIn: rateLimit.resetIn
        }, { status: 429 });
    }
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File))
        return Response.json({ error: 'A PDF file is required.' }, { status: 400 });
    const name = file.name.trim() || 'brief.pdf';
    if (!name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        return Response.json({ error: 'Only a PDF brief can be read here.' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES)
        return Response.json({ error: 'PDF must be 12 MB or smaller.' }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdf(bytes))
        return Response.json({ error: 'That file is not a PDF.' }, { status: 400 });
    const stored = Buffer.from(bytes);
    const projectId = textField(form, 'projectId') || `project-${userId}`;
    let extracted;
    try {
        extracted = await extractPdfText(bytes);
    }
    catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : 'Could not read the PDF.' }, { status: 422 });
    }
    const manifest = await readManifest();
    const version = manifest.filter((item) => item.projectId === projectId).length + 1;
    const id = `DOC-${Date.now()}`;
    const uploadedAt = new Date().toISOString();
    const document = { id, projectId, name, version, pageCount: extracted.pages.length, uploadedAt };
    await keepLocalCopy(stored, manifest, document);
    // Record usage after successful upload
    await recordUsage(userId, 'extract_requirements');
    try {
        const result = await createAIProvider().extractRequirements({
            projectId,
            document: {
                id,
                projectId,
                name,
                version,
                sourceType: 'brief',
                storagePath: `data/documents/${id}.pdf`,
                uploadedAt,
                processingStatus: 'ready',
            },
            text: extracted.text,
        });
        return Response.json({ proposalOnly: true, document, pageCount: extracted.pages.length, ...result });
    }
    catch (error) {
        const status = error instanceof AIRequestError ? 502 : 422;
        return Response.json({
            error: error instanceof Error ? error.message : 'AI request failed.',
            document,
        }, { status });
    }
}
async function keepLocalCopy(stored, manifest, document) {
    try {
        await mkdir(root, { recursive: true });
        await writeFile(path.join(root, `${document.id}.pdf`), stored);
        manifest.push(document);
        await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
    }
    catch (error) {
        if (error.code !== 'EROFS' && error.code !== 'EPERM')
            throw error;
    }
}
function isPdf(bytes) {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
}
function textField(form, name) {
    const value = form?.get(name);
    return typeof value === 'string' ? value.trim() : '';
}
async function readManifest() {
    try {
        const parsed = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
        if (!Array.isArray(parsed))
            return [];
        return parsed.flatMap((entry) => {
            if (!entry || typeof entry !== 'object')
                return [];
            const row = entry;
            if (typeof row.id !== 'string' || typeof row.projectId !== 'string' || typeof row.name !== 'string')
                return [];
            return [{
                    id: row.id,
                    projectId: row.projectId,
                    name: row.name,
                    version: typeof row.version === 'number' ? row.version : 1,
                    pageCount: typeof row.pageCount === 'number' ? row.pageCount : 0,
                    uploadedAt: typeof row.uploadedAt === 'string' ? row.uploadedAt : '',
                }];
        });
    }
    catch {
        return [];
    }
}

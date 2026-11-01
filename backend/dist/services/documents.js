import { extractPdfText } from './pdf/extract-text.js';
export class DocumentUploadLimitError extends Error {
    constructor() { super('Document upload rate limit exceeded. Try again later.'); }
}
export async function storePdf(file, access) {
    if (file.size < 1 || file.size > 12 * 1024 * 1024)
        throw new Error('PDF must be between 1 byte and 12 MB.');
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf')
        throw new Error('Only a PDF brief is supported.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-')
        throw new Error('That file is not a PDF.');
    const extracted = await extractPdfText(bytes);
    const id = crypto.randomUUID();
    const storagePath = `${access.projectId}/${id}.pdf`;
    const { data, error } = await access.client.rpc('reserve_project_document', {
        project_uuid: access.projectId, document_id: id, document_name: file.name || 'brief.pdf',
        page_count: extracted.pages.length, object_path: storagePath,
    });
    if (error?.message.includes('document_upload_limit'))
        throw new DocumentUploadLimitError();
    if (error || !data)
        throw new Error('Document persistence is unavailable.');
    const { error: uploadError } = await access.client.storage.from('project-documents').upload(storagePath, bytes, { contentType: 'application/pdf', upsert: false });
    if (uploadError) {
        await access.client.from('project_documents').delete().eq('id', id);
        throw new Error('Document storage is unavailable. Please retry.');
    }
    return {
        text: extracted.text,
        storagePath,
        document: { id, projectId: access.projectId, name: data.name, version: data.version,
            pageCount: extracted.pages.length, uploadedAt: data.uploaded_at },
    };
}

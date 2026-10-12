import { supabaseAdmin } from '../lib/supabase-admin';
import { extractPdfText } from './pdf/extract-text';
import type { StoredDocument } from '../domain/workspace';

const BUCKET = 'project-briefs';

/** The caller must verify project edit access before reading or uploading a PDF. */
export async function storeProjectPdf(file: File, projectId: string, userId: string, sourceType: 'brief' | 'revision') {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') throw new Error('Only a PDF brief can be read here.');
  if (file.size <= 0 || file.size > 12 * 1024 * 1024) throw new Error('PDF must be 12 MB or smaller.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('That file is not a PDF.');
  const extracted = await extractPdfText(bytes);
  const id = crypto.randomUUID();
  const storagePath = `${projectId}/${id}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(storagePath, bytes, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw new Error('Could not save the PDF online. Check workspace migration 005 and retry.');
  const { data, error } = await supabaseAdmin.rpc('register_project_document', {
    project_uuid: projectId, actor_uuid: userId, document_uuid: id,
    document_name: file.name.trim() || 'brief.pdf', document_pages: extracted.pages.length, source_type: sourceType,
  });
  if (error) {
    // Only remove this request's newly uploaded object if its metadata transaction failed.
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    throw new Error('Could not register the PDF online. Check workspace migration 005 and retry.');
  }
  const row = Array.isArray(data) ? data[0] : data;
  const document: StoredDocument = { id: row.id, name: row.name, version: row.version, pageCount: row.page_count, uploadedAt: row.uploaded_at };
  return { document, text: extracted.text, storagePath };
}

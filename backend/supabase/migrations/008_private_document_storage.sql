-- Supabase Storage migration; local PostgreSQL tests emulate only its policy schema.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('project-documents', 'project-documents', false, 12582912, array['application/pdf'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "members read project PDFs" on storage.objects for select to authenticated
using(bucket_id = 'project-documents' and exists (
  select 1 from public.projects p where p.id::text = split_part(storage.objects.name, '/', 1) and public.is_project_member(p.id)
));
create policy "editors upload project PDFs" on storage.objects for insert to authenticated
with check(bucket_id = 'project-documents' and exists (
  select 1 from public.project_documents d where d.storage_path = storage.objects.name and public.can_edit_project(d.project_id)
));

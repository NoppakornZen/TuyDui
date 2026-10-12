import { supabaseAdmin } from './supabase-admin';

export async function requireProjectAccess(userId: string, projectId: string, edit = false): Promise<Response | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    return Response.json({ error: 'A valid projectId is required.' }, { status: 400 });
  }
  const { data: project, error } = await supabaseAdmin.from('projects').select('owner_id').eq('id', projectId).maybeSingle();
  if (error) return Response.json({ error: 'Could not check project access.' }, { status: 503 });
  if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });
  if (project.owner_id === userId) return null;
  const { data: member, error: memberError } = await supabaseAdmin.from('project_members').select('role').eq('project_id', projectId).eq('user_id', userId).not('accepted_at', 'is', null).maybeSingle();
  if (memberError) return Response.json({ error: 'Could not check project access.' }, { status: 503 });
  if (!member || (edit && member.role !== 'owner' && member.role !== 'editor')) {
    return Response.json({ error: 'You do not have permission to use this project.' }, { status: 403 });
  }
  return null;
}

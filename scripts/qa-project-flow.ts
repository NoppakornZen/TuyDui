import assert from 'node:assert/strict';
import {
  combineProjectRows,
  loadProjectList,
  projectCreateErrorMessage,
  ProjectVisibilityError,
  verifyCreatedProject,
} from '../src/lib/project-queries';

type Result = { data?: unknown; error?: unknown };

function query(result: Result) {
  const chain: Record<string, unknown> & {
    select: () => typeof chain;
    eq: () => typeof chain;
    not: () => typeof chain;
    in: () => typeof chain;
    order: () => Promise<Result>;
    maybeSingle: () => Promise<Result>;
  } = {
    select: () => chain,
    eq: () => chain,
    not: () => chain,
    in: () => chain,
    order: async () => result,
    maybeSingle: async () => result,
  };
  (chain as Record<string, unknown>).then = (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function clientFor(results: Record<string, Result[]>) {
  return {
    from(table: string) {
      const result = results[table]?.shift() ?? { data: [], error: null };
      return query(result);
    },
  } as never;
}

const owner = {
  id: 'owner-project', name: 'Owned project', client_name: 'Client', description: '',
  baseline_confirmed_at: null, created_at: '2026-10-12T00:00:00Z', updated_at: '2026-10-12T00:00:00Z',
};

const sharedA = { ...owner, id: 'shared-a', name: 'Shared A', updated_at: '2026-10-11T00:00:00Z' };
const sharedB = { ...owner, id: 'shared-b', name: 'Shared B', updated_at: '2026-10-10T00:00:00Z' };

const ownedSurvivesMembershipFailure = await loadProjectList(clientFor({
  projects: [{ data: [owner], error: null }],
  project_members: [{ data: null, error: { message: 'relation project_members does not exist' } }],
}), 'user-1');
assert.equal(ownedSurvivesMembershipFailure.projects.length, 1);
assert.equal(ownedSurvivesMembershipFailure.projects[0].access, 'owner');
assert.equal(ownedSurvivesMembershipFailure.ownerProjectCount, 1);
assert.equal(ownedSurvivesMembershipFailure.sharedLoadWarning, true);

const multipleShared = await loadProjectList(clientFor({
  projects: [{ data: [owner], error: null }, { data: [sharedA, sharedB], error: null }],
  project_members: [{ data: [{ project_id: 'shared-a' }, { project_id: 'shared-b' }, { project_id: 'owner-project' }], error: null }],
}), 'user-1');
assert.deepEqual(multipleShared.projects.map((project) => project.id), ['owner-project', 'shared-a', 'shared-b']);

const created = await verifyCreatedProject(clientFor({
  projects: [{ data: owner, error: null }],
}), 'user-1', owner.id);
assert.equal(created.id, owner.id);

await assert.rejects(
  () => verifyCreatedProject(clientFor({ projects: [{ data: null, error: null }] }), 'user-1', 'missing'),
  (error) => error instanceof ProjectVisibilityError,
);

const quotaMessage = projectCreateErrorMessage(
  { code: 'PGRST202', message: 'Could not find the function create_project_with_free_limit' },
  'fallback',
);
assert.match(quotaMessage, /Dev/);

const emptyAfterQuota = await loadProjectList(clientFor({
  projects: [{ data: [], error: null }],
  project_members: [{ data: [], error: null }],
}), 'user-1');
assert.equal(emptyAfterQuota.projects.length, 0);
assert.equal(emptyAfterQuota.ownerProjectCount, 0);

assert.deepEqual(
  combineProjectRows([owner], [sharedA, owner]),
  [{ ...owner, access: 'owner' }, { ...sharedA, access: 'shared' }],
);

console.log('project-flow QA passed: owned fallback, shared projects, read-after-write verification, quota error, empty-state recovery');

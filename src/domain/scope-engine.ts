import type { ChangeDecision, ProjectNode, Requirement, ScopeChange } from './models';

export interface ScopeState {
  baselineRequirementIds: string[];
  includedRequirementIds: string[];
  approvedRequirementIds: string[];
}

export function currentApprovedRequirementIds(state: ScopeState): string[] {
  return [...new Set([
    ...state.baselineRequirementIds,
    ...state.includedRequirementIds,
    ...state.approvedRequirementIds,
  ])];
}

export function canMutateBaseline(confirmedAt?: string): boolean {
  return !confirmedAt;
}

export function applyChangeToScope(state: ScopeState, change: Pick<ScopeChange, 'decision'> & { requirementIds?: string[] }): ScopeState {
  const ids = change.requirementIds ?? [];
  if (change.decision !== 'included' && change.decision !== 'approved') return state;
  const target = change.decision === 'included' ? 'includedRequirementIds' : 'approvedRequirementIds';
  return { ...state, [target]: [...new Set([...state[target], ...ids])] };
}

export function affectedOwners(nodes: ProjectNode[], requirements: Requirement[], requirementIds: string[]): string[] {
  const ids = new Set(requirementIds);
  return [...new Set(nodes.filter((node) => node.requirementIds.some((id) => ids.has(id)) && node.assigneeId).map((node) => node.assigneeId as string))];
}

export function decisionUpdatesScope(decision: ChangeDecision): boolean {
  return decision === 'included' || decision === 'approved';
}

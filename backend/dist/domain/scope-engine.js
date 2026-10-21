export function currentApprovedRequirementIds(state) {
    return [...new Set([
            ...state.baselineRequirementIds,
            ...state.includedRequirementIds,
            ...state.approvedRequirementIds,
        ])];
}
export function canMutateBaseline(confirmedAt) {
    return !confirmedAt;
}
export function applyChangeToScope(state, change) {
    const ids = change.requirementIds ?? [];
    if (change.decision !== 'included' && change.decision !== 'approved')
        return state;
    const target = change.decision === 'included' ? 'includedRequirementIds' : 'approvedRequirementIds';
    return { ...state, [target]: [...new Set([...state[target], ...ids])] };
}
export function affectedOwners(nodes, requirements, requirementIds) {
    const ids = new Set(requirementIds);
    return [...new Set(nodes.filter((node) => node.requirementIds.some((id) => ids.has(id)) && node.assigneeId).map((node) => node.assigneeId))];
}
export function decisionUpdatesScope(decision) {
    return decision === 'included' || decision === 'approved';
}

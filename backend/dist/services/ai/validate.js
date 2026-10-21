const CLASSIFICATIONS = new Set(['in_scope', 'modified', 'new_scope', 'ambiguous']);
const CLARITY = new Set(['clear', 'ambiguous', 'missing_detail', 'conflict']);
const CONFIDENCE = new Set(['low', 'medium', 'high']);
const IMPACT = new Set(['new', 'modified', 'removed', 'impacted', 'unchanged']);
export function readJsonObject(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = (fenced?.[1] ?? text).trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end <= start)
        throw new Error('Model output did not contain a JSON object.');
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('Model output was not a JSON object.');
    return parsed;
}
function textOf(value, field) {
    if (typeof value !== 'string' || !value.trim())
        throw new Error(`Missing ${field}.`);
    return value.trim();
}
function optionalText(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function stringList(value, allowed) {
    if (!Array.isArray(value))
        return [];
    const items = value.filter((item) => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
    return allowed ? items.filter((item) => allowed.has(item)) : items;
}
export function validateRequirements(payload, projectId, documentId) {
    if (!Array.isArray(payload.requirements))
        throw new Error('Missing requirements array.');
    return payload.requirements.map((entry, index) => {
        if (!entry || typeof entry !== 'object')
            throw new Error(`Requirement ${index + 1} is invalid.`);
        const row = entry;
        const clarityRaw = row.clarity === 'needs_clarification' ? 'missing_detail' : row.clarity;
        if (!CLARITY.has(clarityRaw))
            throw new Error(`Requirement ${index + 1} has an invalid clarity.`);
        const quote = optionalText(row.quote) ?? textOf(row.description, `requirements[${index}].description`);
        const page = typeof row.page === 'number' && Number.isFinite(row.page) ? row.page : undefined;
        return {
            id: `REQ-${String(index + 1).padStart(3, '0')}`,
            projectId,
            title: textOf(row.title, `requirements[${index}].title`),
            description: textOf(row.description, `requirements[${index}].description`),
            category: optionalText(row.category) ?? 'General',
            clarity: clarityRaw,
            evidence: [{ documentId, page, quote }],
            suggestedRoles: stringList(row.suggestedRoles),
            approved: false,
        };
    });
}
export function validateProposal(payload, allowed) {
    if (!CLASSIFICATIONS.has(payload.classification))
        throw new Error('Invalid classification.');
    const confidence = CONFIDENCE.has(payload.confidence) ? payload.confidence : 'low';
    return {
        summary: textOf(payload.summary, 'summary'),
        classification: payload.classification,
        matchedRequirementIds: stringList(payload.matchedRequirementIds, allowed.requirementIds),
        affectedNodeIds: stringList(payload.affectedNodeIds, allowed.nodeIds),
        affectedMemberIds: stringList(payload.affectedMemberIds, allowed.memberIds),
        explanation: textOf(payload.explanation, 'explanation'),
        confidence,
        evidenceQuotes: stringList(payload.evidenceQuotes).slice(0, 6),
    };
}
export function validateImpacts(payload, allowed) {
    if (!Array.isArray(payload.impacts))
        throw new Error('Missing impacts array.');
    return payload.impacts.map((entry, index) => {
        if (!entry || typeof entry !== 'object')
            throw new Error(`Impact ${index + 1} is invalid.`);
        const row = entry;
        if (!IMPACT.has(row.impactType))
            throw new Error(`Impact ${index + 1} has an invalid type.`);
        const requirementId = typeof row.requirementId === 'string' && allowed.requirementIds.has(row.requirementId) ? row.requirementId : null;
        return {
            requirementId,
            nodeIds: stringList(row.nodeIds, allowed.nodeIds),
            memberIds: stringList(row.memberIds, allowed.memberIds),
            impactType: row.impactType,
            explanation: textOf(row.explanation, `impacts[${index}].explanation`),
        };
    });
}
export function validatePairStates(payload, allowedPairs) {
    if (!Array.isArray(payload.pairs))
        throw new Error('Missing pairs array.');
    return payload.pairs.map((entry, index) => {
        if (!entry || typeof entry !== 'object')
            throw new Error(`Pair ${index + 1} is invalid.`);
        const row = entry;
        const incomingIndex = typeof row.incomingIndex === 'number' ? row.incomingIndex : Number.NaN;
        const currentRequirementId = typeof row.currentRequirementId === 'string' ? row.currentRequirementId : '';
        const key = `${currentRequirementId}:${incomingIndex}`;
        if (!allowedPairs.has(key))
            throw new Error(`Pair ${index + 1} was not requested.`);
        const state = row.state === 'modified' || row.state === 'unchanged' || row.state === 'ambiguous' ? row.state : null;
        if (!state)
            throw new Error(`Pair ${index + 1} has an invalid state.`);
        return { currentRequirementId, incomingIndex, state, explanation: textOf(row.explanation, `pairs[${index}].explanation`) };
    });
}
const PRICE = /\d[\d,.]{0,12}\s*(บาท|thb|usd|\$|ชั่วโมง|hours|วัน|days)/i;
export function validateReview(payload, nodeIds) {
    if (!CLASSIFICATIONS.has(payload.classification))
        throw new Error('Invalid classification.');
    const classification = payload.classification;
    const hold = classification === 'in_scope' || classification === 'ambiguous';
    const major = !hold && classification === 'new_scope' && payload.magnitude === 'major';
    let clientMessage = null;
    if (major) {
        clientMessage = textOf(payload.clientMessage, 'clientMessage');
        if (PRICE.test(clientMessage))
            throw new Error('Client message included a price or a deadline.');
    }
    return {
        classification,
        magnitude: major ? 'major' : 'small',
        summary: textOf(payload.summary, 'summary'),
        explanation: textOf(payload.explanation, 'explanation'),
        clientMessage,
        edits: hold ? [] : readEdits(payload.edits, nodeIds, classification),
    };
}
function readEdits(value, nodeIds, classification) {
    if (!Array.isArray(value))
        return [];
    return value.flatMap((entry) => {
        if (!entry || typeof entry !== 'object')
            return [];
        const row = entry;
        const title = optionalText(row.title);
        const summary = optionalText(row.summary);
        if (!title || !summary)
            return [];
        if (row.action === 'update') {
            const nodeId = optionalText(row.nodeId);
            if (!nodeId || !nodeIds.has(nodeId))
                return [];
            return [{ action: 'update', nodeId, title, summary }];
        }
        if (row.action !== 'add' || classification === 'modified')
            return [];
        const parentId = optionalText(row.parentId);
        if (!parentId || !nodeIds.has(parentId))
            return [];
        return [{ action: 'add', parentId, title, summary }];
    });
}
export function validateStructure(payload, requirementIds, members) {
    if (!Array.isArray(payload.nodes))
        throw new Error('Missing nodes array.');
    const memberIds = new Set(members.map((member) => member.id));
    const tempIds = new Set();
    const nodes = payload.nodes.map((entry, index) => {
        if (!entry || typeof entry !== 'object')
            throw new Error(`Node ${index + 1} is invalid.`);
        const row = entry;
        const tempId = optionalText(row.tempId) ?? `node-${index + 1}`;
        if (tempIds.has(tempId))
            throw new Error(`Duplicate tempId ${tempId}.`);
        tempIds.add(tempId);
        const suggestedMemberId = typeof row.suggestedMemberId === 'string' && memberIds.has(row.suggestedMemberId) ? row.suggestedMemberId : undefined;
        return {
            tempId,
            parentTempId: optionalText(row.parentTempId),
            title: textOf(row.title, `nodes[${index}].title`),
            summary: textOf(row.summary, `nodes[${index}].summary`),
            category: optionalText(row.category) ?? 'General',
            requirementIds: stringList(row.requirementIds, requirementIds),
            suggestedRole: optionalText(row.suggestedRole),
            suggestedMemberId,
        };
    });
    for (const node of nodes) {
        if (node.parentTempId && !tempIds.has(node.parentTempId))
            node.parentTempId = undefined;
    }
    return nodes;
}
export function allowedIds(requirements, nodes = [], members = []) {
    return {
        requirementIds: new Set(requirements.map((item) => item.id)),
        nodeIds: new Set(nodes.map((item) => item.id)),
        memberIds: new Set(members.map((item) => item.id)),
    };
}

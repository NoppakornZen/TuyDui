export interface MatchableRequirement {
  id: string;
  title: string;
  description: string;
  category?: string;
}

export interface SemanticPair {
  currentRequirementId: string;
  incomingIndex: number;
}

export interface SettledDiff {
  state: 'added' | 'removed' | 'unchanged';
  currentRequirementId?: string;
  incomingIndex?: number;
  explanation: string;
}

export interface DeterministicMatch {
  settled: SettledDiff[];
  uncertain: SemanticPair[];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(' ').filter((token) => token.length > 1));
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) return 1;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  const union = left.size + right.size - shared;
  return union === 0 ? 0 : shared / union;
}

/**
 * Clear matches stay in code. Only overlapping-but-not-identical pairs are
 * returned for a later semantic model call.
 */
export function matchRequirements(current: MatchableRequirement[], incoming: MatchableRequirement[]): DeterministicMatch {
  const usedCurrent = new Set<string>();
  const usedIncoming = new Set<number>();
  const settled: SettledDiff[] = [];
  const uncertain: SemanticPair[] = [];

  const currentKeys = current.map((item) => normalize(`${item.title} ${item.description}`));
  const incomingKeys = incoming.map((item) => normalize(`${item.title} ${item.description}`));

  incoming.forEach((item, index) => {
    const exact = current.findIndex((candidate, candidateIndex) => !usedCurrent.has(candidate.id) && currentKeys[candidateIndex] === incomingKeys[index]);
    if (exact === -1) return;
    usedCurrent.add(current[exact].id);
    usedIncoming.add(index);
    settled.push({
      state: 'unchanged',
      currentRequirementId: current[exact].id,
      incomingIndex: index,
      explanation: 'Normalized title and description match the current approved requirement.',
    });
  });

  const leftoverCurrent = current.filter((item) => !usedCurrent.has(item.id));
  const leftoverIncoming = incoming.map((item, index) => ({ item, index })).filter((entry) => !usedIncoming.has(entry.index));

  for (const entry of leftoverIncoming) {
    let best: { id: string; score: number } | null = null;
    const incomingTokens = tokens(`${entry.item.title} ${entry.item.description}`);
    for (const candidate of leftoverCurrent) {
      if (usedCurrent.has(candidate.id)) continue;
      if (entry.item.category && candidate.category && normalize(entry.item.category) !== normalize(candidate.category)) continue;
      const score = jaccard(incomingTokens, tokens(`${candidate.title} ${candidate.description}`));
      if (score >= 0.45 && (!best || score > best.score)) best = { id: candidate.id, score };
    }
    if (!best) continue;
    usedCurrent.add(best.id);
    usedIncoming.add(entry.index);
    uncertain.push({ currentRequirementId: best.id, incomingIndex: entry.index });
  }

  for (const candidate of current) {
    if (usedCurrent.has(candidate.id)) continue;
    settled.push({
      state: 'removed',
      currentRequirementId: candidate.id,
      explanation: 'No matching requirement was found in the incoming document.',
    });
  }
  incoming.forEach((item, index) => {
    if (usedIncoming.has(index)) return;
    settled.push({
      state: 'added',
      incomingIndex: index,
      explanation: `No current requirement matches “${item.title}”.`,
    });
  });

  return { settled, uncertain };
}

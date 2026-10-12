export const FREE_PROJECT_LIMIT = 1;

export function isFreeProjectLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
  const text = [candidate.code, candidate.message, candidate.details]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return text.includes('free_project_limit_reached') || text.includes('free trial project limit');
}

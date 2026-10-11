import { matchRequirements } from '../../domain/requirement-match';
import type { Requirement, ScopeChange } from '../../domain/models';
import type {
  AIProvider,
  AIResult,
  AIStatus,
  AITaskType,
  AIUsage,
  AnalyzeChangeInput,
  ChangeProposal,
  CompareRequirementsInput,
  CompareRequirementsResult,
  DraftExplanationInput,
  ExtractRequirementsInput,
  ImpactItem,
  ReviewChangeInput,
  ChangeReview,
  SuggestStructureInput,
  SuggestedNode,
} from './contract';
import {
  classificationSystem,
  compareSystem,
  draftSystem,
  extractionSystem,
  extractionUser,
  impactSystem,
  reviewSystem,
  structureSystem,
} from './prompts';
import { recordAIUsage } from './usage';
import { UnconfiguredAIProvider } from './unconfigured';
import {
  allowedIds,
  readJsonObject,
  validateImpacts,
  validatePairStates,
  validateProposal,
  validateRequirements,
  validateReview,
  validateStructure,
} from './validate';

interface MaxPlusConfig {
  apiKey: string;
  model: string;
  messagesUrl: string;
  modelsUrl: string;
}

interface ProviderUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface ProviderMessage {
  id?: string;
  model?: string;
  content?: Array<{ type?: string; text?: string }>;
  usage?: ProviderUsage;
  error?: { type?: string; message?: string };
  cost?: number;
  provider_cost?: number;
}

const TEXT_LIMIT = 80_000;

export function aiStatus(env: Record<string, string | undefined> = process.env): AIStatus {
  const provider = env.AI_PROVIDER?.trim() || 'unconfigured';
  return {
    provider,
    model: env.AI_MODEL?.trim() || 'claude-opus-5',
    pool: env.MAXPLUSAI_POOL?.trim() || 'claude-native',
    configured: provider === 'maxplus' && Boolean(env.MAXPLUSAI_API_KEY?.trim()),
  };
}

export function createAIProvider(env: Record<string, string | undefined> = process.env): AIProvider {
  if (aiStatus(env).configured) return new MaxPlusAIProvider(readConfig(env));
  return new UnconfiguredAIProvider();
}

function readConfig(env: Record<string, string | undefined>): MaxPlusConfig {
  const apiKey = env.MAXPLUSAI_API_KEY?.trim() ?? '';
  if (!/^ccsk-[a-f0-9]{64}$/.test(apiKey)) throw new Error('MAXPLUSAI_API_KEY is missing or malformed.');
  const model = env.AI_MODEL?.trim() || 'claude-opus-5';
  const pool = (env.MAXPLUSAI_POOL?.trim() || 'claude-native').replace(/^\/+|\/+$/g, '');
  const configuredBase = (env.MAXPLUSAI_BASE_URL || env.MAXPLUSAI_GATEWAY_URL || 'https://api.maxplus-ai.cc').trim();
  const base = configuredBase
    .replace(/\/+$/, '')
    .replace(/\/(?:claude-native|v1)\/v1\/(?:messages|models|chat\/completions)$/i, '')
    .replace(/\/v1\/(?:messages|models|chat\/completions)$/i, '')
    .replace(/\/claude-native$/i, '');
  return {
    apiKey,
    model,
    messagesUrl: `${base}/${pool}/v1/messages`,
    modelsUrl: `${base}/${pool}/v1/models`,
  };
}

export class MaxPlusAIProvider implements AIProvider {
  readonly name = 'maxplus';

  constructor(private readonly config: MaxPlusConfig) {}

  async extractRequirements(input: ExtractRequirementsInput): Promise<AIResult<Requirement[]>> {
    const text = clip(input.text);
    const completion = await this.complete('extract_requirements', input.projectId, input.userId, extractionSystem(), extractionUser(text, input.document.name), 8000);
    return {
      data: validateRequirements(completion.json, input.projectId, input.document.id),
      usage: completion.usage,
    };
  }

  async classifyClientChange(input: AnalyzeChangeInput): Promise<AIResult<ChangeProposal>> {
    const allowed = allowedIds(input.currentRequirements, input.nodes, input.members);
    const user = JSON.stringify({
      rawRequest: clip(input.rawRequest),
      currentRequirements: input.currentRequirements.map(publicRequirement),
      nodes: input.nodes ?? [],
      members: input.members ?? [],
      output: {
        summary: '',
        classification: 'ambiguous',
        matchedRequirementIds: [],
        affectedNodeIds: [],
        affectedMemberIds: [],
        explanation: '',
        confidence: 'low',
        evidenceQuotes: [],
      },
    });
    const completion = await this.complete('classify_client_message', input.projectId, input.userId, classificationSystem(), user, 2500);
    return { data: validateProposal(completion.json, allowed), usage: completion.usage };
  }

  async analyzeImpact(input: AnalyzeChangeInput): Promise<AIResult<ImpactItem[]>> {
    const allowed = allowedIds(input.currentRequirements, input.nodes, input.members);
    const user = JSON.stringify({
      rawRequest: clip(input.rawRequest),
      currentRequirements: input.currentRequirements.map(publicRequirement),
      nodes: input.nodes ?? [],
      members: input.members ?? [],
      output: { impacts: [{ requirementId: null, nodeIds: [], memberIds: [], impactType: 'impacted', explanation: '' }] },
    });
    const completion = await this.complete('analyze_change_impact', input.projectId, input.userId, impactSystem(), user, 2500);
    return { data: validateImpacts(completion.json, allowed), usage: completion.usage };
  }

  async compareRequirements(input: CompareRequirementsInput): Promise<AIResult<CompareRequirementsResult>> {
    const local = matchRequirements(input.current, input.incoming.map((item, index) => ({
      id: `incoming-${index}`,
      title: item.title,
      description: item.description,
      category: item.category,
    })));
    const uncertain = local.uncertain.flatMap((pair) => {
      const incoming = input.incoming[pair.incomingIndex];
      const current = input.current.find((item) => item.id === pair.currentRequirementId);
      if (!incoming || !current) return [];
      return [{ ...pair, current: publicRequirement(current), incoming }];
    });
    if (uncertain.length === 0) {
      return { data: { diffs: local.settled.map(codeDiff), pendingSemantic: [] }, usage: null };
    }

    try {
      const user = JSON.stringify({
        pairs: uncertain,
        output: { pairs: [{ currentRequirementId: '', incomingIndex: 0, state: 'ambiguous', explanation: '' }] },
      });
      const completion = await this.complete('compare_requirement_pair', input.projectId, input.userId, compareSystem(), user, 4000);
      const allowedPairs = new Set(uncertain.map((pair) => `${pair.currentRequirementId}:${pair.incomingIndex}`));
      const judged = validatePairStates(completion.json, allowedPairs);
      return { data: mergeComparison(local, judged), usage: completion.usage };
    } catch (error) {
      return {
        data: {
          diffs: local.settled.map(codeDiff),
          pendingSemantic: local.uncertain,
          aiError: error instanceof Error ? error.message : 'Semantic comparison failed.',
        },
        usage: null,
      };
    }
  }

  async draftClientExplanation(input: DraftExplanationInput): Promise<AIResult<string>> {
    const change = commercialFacts(input.change);
    const user = JSON.stringify({
      change,
      existingScopeSummary: input.existingScopeSummary ?? '',
      output: { explanation: '' },
    });
    const completion = await this.complete('draft_change_explanation', input.change.projectId, input.userId, draftSystem(), user, 1200);
    const explanation = completion.json.explanation;
    if (typeof explanation !== 'string' || !explanation.trim()) throw new Error('Missing explanation.');
    return { data: explanation.trim(), usage: completion.usage };
  }

  async reviewChange(input: ReviewChangeInput): Promise<AIResult<ChangeReview>> {
    const nodes = input.nodes ?? [];
    const user = JSON.stringify({
      rawRequest: clip(input.rawRequest),
      currentRequirements: input.currentRequirements.map(publicRequirement),
      nodes,
      members: input.members ?? [],
      output: { classification: 'ambiguous', magnitude: 'small', summary: '', explanation: '', clientMessage: null, edits: [{ action: 'update', nodeId: '', parentId: null, title: '', summary: '' }] },
    });
    const completion = await this.complete('review_change', input.projectId, input.userId, reviewSystem(), user, 3000);
    return { data: validateReview(completion.json, new Set(nodes.map((node) => node.id))), usage: completion.usage };
  }

  async suggestProjectStructure(input: SuggestStructureInput): Promise<AIResult<SuggestedNode[]>> {
    const user = JSON.stringify({
      requirements: input.requirements.map(publicRequirement),
      members: input.members ?? [],
      output: { nodes: [{ tempId: 'phase-1', parentTempId: null, title: '', summary: '', category: '', requirementIds: [], suggestedRole: '', suggestedMemberId: null }] },
    });
    const completion = await this.complete('suggest_project_structure', input.projectId, input.userId, structureSystem(), user, 8000);
    const ids = new Set(input.requirements.map((item) => item.id));
    return { data: validateStructure(completion.json, ids, input.members ?? []), usage: completion.usage };
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(this.config.modelsUrl, { headers: this.headers() });
    const payload = await response.json().catch(() => null) as { data?: Array<{ id?: string }>; error?: { message?: string } } | null;
    if (!response.ok || !payload) throw new AIRequestError(response.status, this.redact(payload?.error?.message));
    return (payload.data ?? []).map((item) => item.id).filter((id): id is string => Boolean(id));
  }

  private headers(): Record<string, string> {
    return {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': this.config.apiKey,
    };
  }

  private async complete(task: AITaskType, projectId: string, userId: string | undefined, system: string, user: string, maxTokens: number): Promise<{ json: Record<string, unknown>; usage: AIUsage }> {
    let lastError = 'Model output was invalid.';
    let totalIn = 0;
    let totalOut = 0;
    let requestId: string | null = null;
    let providerCost: number | null = null;
    let prompt = user;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let message: ProviderMessage;
      try {
        message = await this.requestMessage(system, prompt, maxTokens);
      } catch (error) {
        const code = error instanceof AIRequestError ? error.code : 'provider_error';
        await this.log(task, projectId, userId, false, code, totalIn, totalOut, null, null);
        throw error;
      }
      totalIn += message.usage?.input_tokens ?? 0;
      totalOut += message.usage?.output_tokens ?? 0;
      requestId = message.id ?? requestId;
      providerCost = readCost(message) ?? providerCost;
      const text = (message.content ?? []).filter((block) => block.type === 'text' && block.text).map((block) => block.text).join('\n');
      try {
        const json = readJsonObject(text);
        const usage = {
          provider: this.name,
          model: message.model || this.config.model,
          taskType: task,
          inputTokens: totalIn,
          outputTokens: totalOut,
          providerCost,
          requestId,
        };
        await this.log(task, projectId, userId, true, null, totalIn, totalOut, providerCost, requestId);
        return { json, usage };
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
        prompt = `${user}\n\nThe previous reply was invalid (${lastError}). Return only the JSON object.`;
      }
    }

    await this.log(task, projectId, userId, false, 'invalid_output', totalIn, totalOut, providerCost, requestId);
    throw new Error(lastError);
  }

  private async requestMessage(system: string, user: string, maxTokens: number): Promise<ProviderMessage> {
    const response = await fetch(this.config.messagesUrl, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(240_000),
    });
    const payload = await response.json().catch(() => null) as ProviderMessage | null;
    if (!response.ok || !payload) throw new AIRequestError(response.status, this.redact(payload?.error?.message));
    const text = (payload.content ?? []).some((block) => block.type === 'text' && block.text);
    if (!text) throw new AIRequestError(response.status, 'The model returned no text.');
    return payload;
  }

  private redact(value: string | undefined): string | undefined {
    return value?.split(this.config.apiKey).join('[redacted]');
  }

  private log(task: AITaskType, projectId: string, userId: string | undefined, success: boolean, errorCode: string | null, inputTokens: number, outputTokens: number, providerCost: number | null, requestId: string | null): Promise<void> {
    return recordAIUsage({
      id: crypto.randomUUID(),
      userId: userId ?? null,
      projectId,
      provider: this.name,
      model: this.config.model,
      taskType: task,
      inputTokens,
      outputTokens,
      providerCost,
      requestId,
      success,
      errorCode,
      createdAt: new Date().toISOString(),
    }).catch(() => undefined);
  }
}

export class AIRequestError extends Error {
  readonly code: string;

  constructor(status: number, detail?: string) {
    const code = status === 401 ? 'authentication_error'
      : status === 402 ? 'insufficient_credit'
        : status === 429 ? 'rate_limit_error'
          : status === 503 ? 'service_unavailable'
            : 'provider_error';
    super(detail?.trim() || `AI provider returned ${status}.`);
    this.name = 'AIRequestError';
    this.code = code;
  }
}

function readCost(message: ProviderMessage): number | null {
  const value = message.provider_cost ?? message.cost;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clip(value: string): string {
  const text = value.trim();
  if (text.length <= TEXT_LIMIT) return text;
  return `${text.slice(0, TEXT_LIMIT)}\n\n[truncated]`;
}

function publicRequirement(requirement: Requirement) {
  return {
    id: requirement.id,
    title: requirement.title,
    description: requirement.description,
    category: requirement.category,
    quote: requirement.evidence[0]?.quote ?? '',
  };
}

function commercialFacts(change: ScopeChange) {
  return {
    summary: change.summary,
    classification: change.classification,
    rawRequest: change.rawRequest,
    priceThb: change.price ?? null,
    additionalDays: change.additionalDays ?? null,
    newDeadline: change.newDeadline ?? null,
  };
}

function codeDiff(diff: { state: 'added' | 'removed' | 'unchanged'; currentRequirementId?: string; incomingIndex?: number; explanation: string }) {
  return { ...diff, decidedBy: 'code' as const };
}

function mergeComparison(local: ReturnType<typeof matchRequirements>, judged: Array<{ currentRequirementId: string; incomingIndex: number; state: 'modified' | 'unchanged' | 'ambiguous'; explanation: string }>): CompareRequirementsResult {
  const judgedKeys = new Set(judged.map((item) => `${item.currentRequirementId}:${item.incomingIndex}`));
  const pending = local.uncertain.filter((pair) => !judgedKeys.has(`${pair.currentRequirementId}:${pair.incomingIndex}`));
  return {
    diffs: [
      ...local.settled.map(codeDiff),
      ...judged.map((item) => ({ ...item, decidedBy: 'ai' as const })),
    ],
    pendingSemantic: pending,
  };
}

import { matchRequirements } from '../../domain/requirement-match';
import type { Requirement } from '../../domain/models';
import type {
  AIProvider,
  AIResult,
  AnalyzeChangeInput,
  ChangeProposal,
  CompareRequirementsInput,
  CompareRequirementsResult,
  DraftExplanationInput,
  ExtractRequirementsInput,
  ImpactItem,
  SuggestStructureInput,
  SuggestedNode,
  ReviewChangeInput,
  ChangeReview,
} from './contract';

const NOT_CONFIGURED = 'AI provider is not configured. Set AI_PROVIDER=maxplus and a server-side MAXPLUSAI_API_KEY.';

/** Used when no server-side provider is configured. It never calls the network. */
export class UnconfiguredAIProvider implements AIProvider {
  readonly name = 'unconfigured';

  extractRequirements(): Promise<AIResult<Requirement[]>> {
    return Promise.reject(new Error(NOT_CONFIGURED));
  }

  classifyClientChange(): Promise<AIResult<ChangeProposal>> {
    return Promise.reject(new Error(NOT_CONFIGURED));
  }

  analyzeImpact(): Promise<AIResult<ImpactItem[]>> {
    return Promise.reject(new Error(NOT_CONFIGURED));
  }

  compareRequirements(input: CompareRequirementsInput): Promise<AIResult<CompareRequirementsResult>> {
    const local = matchRequirements(input.current, input.incoming.map((item, index) => ({
      id: `incoming-${index}`,
      title: item.title,
      description: item.description,
      category: item.category,
    })));
    if (local.uncertain.length > 0) return Promise.reject(new Error(NOT_CONFIGURED));
    return Promise.resolve({
      data: {
        diffs: local.settled.map((diff) => ({ ...diff, decidedBy: 'code' as const })),
        pendingSemantic: [],
      },
      usage: null,
    });
  }

  draftClientExplanation(_input: DraftExplanationInput): Promise<AIResult<string>> {
    return Promise.reject(new Error(NOT_CONFIGURED));
  }

  suggestProjectStructure(_input: SuggestStructureInput): Promise<AIResult<SuggestedNode[]>> {
    return Promise.reject(new Error(NOT_CONFIGURED));
  }

  reviewChange(_input: ReviewChangeInput): Promise<AIResult<ChangeReview>> {
    return Promise.reject(new Error(NOT_CONFIGURED));
  }
}

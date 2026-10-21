import { matchRequirements } from '../../domain/requirement-match.js';
const NOT_CONFIGURED = 'AI provider is not configured. Set AI_PROVIDER=maxplus and a server-side MAXPLUSAI_API_KEY.';
/** Used when no server-side provider is configured. It never calls the network. */
export class UnconfiguredAIProvider {
    name = 'unconfigured';
    extractRequirements() {
        return Promise.reject(new Error(NOT_CONFIGURED));
    }
    classifyClientChange() {
        return Promise.reject(new Error(NOT_CONFIGURED));
    }
    analyzeImpact() {
        return Promise.reject(new Error(NOT_CONFIGURED));
    }
    compareRequirements(input) {
        const local = matchRequirements(input.current, input.incoming.map((item, index) => ({
            id: `incoming-${index}`,
            title: item.title,
            description: item.description,
            category: item.category,
        })));
        if (local.uncertain.length > 0)
            return Promise.reject(new Error(NOT_CONFIGURED));
        return Promise.resolve({
            data: {
                diffs: local.settled.map((diff) => ({ ...diff, decidedBy: 'code' })),
                pendingSemantic: [],
            },
            usage: null,
        });
    }
    draftClientExplanation(_input) {
        return Promise.reject(new Error(NOT_CONFIGURED));
    }
    suggestProjectStructure(_input) {
        return Promise.reject(new Error(NOT_CONFIGURED));
    }
    reviewChange(_input) {
        return Promise.reject(new Error(NOT_CONFIGURED));
    }
}

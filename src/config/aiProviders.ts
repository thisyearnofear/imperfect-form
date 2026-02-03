/**
 * AI Provider Configuration
 *
 * Manages multiple AI providers with automatic fallback:
 * 1. Gemini 2.0 Flash (Primary) - Fast, accurate, cost-effective
 * 2. Venice AI (Fallback) - Privacy-focused, uncensored alternative
 *
 * Features:
 * - Automatic provider rotation on failure
 * - User preference support
 * - Cost tracking per provider
 * - Privacy-first option via Venice
 */

export type AIProvider = 'gemini' | 'venice' | 'local';

export interface AIProviderConfig {
  name: AIProvider;
  enabled: boolean;
  priority: number; // Lower = higher priority
  model: string;
  baseUrl?: string;
  apiKeyEnvVar: string;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  features: {
    streaming: boolean;
    vision: boolean;
    toolCalling: boolean;
    maxTokens: number;
  };
}

export const AI_PROVIDERS: Partial<Record<AIProvider, AIProviderConfig>> = {
  gemini: {
    name: 'gemini',
    enabled: true,
    priority: 1,
    model: 'gemini-3.0-flash-preview', // 3x faster than 2.5 Pro, 218 tokens/sec output
    apiKeyEnvVar: 'GEMINI_API_KEY',
    costPer1kTokens: {
      input: 0.0005, // $0.50 per 1M tokens
      output: 0.003, // $3.00 per 1M tokens (67% higher than 2.5 Flash, but 3x faster)
    },
    features: {
      streaming: true,
      vision: true,
      toolCalling: true,
      maxTokens: 1000000, // 1M token context, 2000 RPM, 90% caching discount available
    },
  },
  venice: {
    name: 'venice',
    enabled: true,
    priority: 2,
    model: 'qwen3-4b', // Venice Small - fast, efficient
    baseUrl: 'https://api.venice.ai/api/v1',
    apiKeyEnvVar: 'VENICE_API_KEY',
    costPer1kTokens: {
      input: 0.0001, // Pay-as-you-go or Pro subscription ($10 free credits)
      output: 0.0001,
    },
    features: {
      streaming: true,
      vision: false,
      toolCalling: true,
      maxTokens: 32000,
    },
  },
};

export interface CoachRequest {
  mode: 'pushups' | 'squats';
  metrics: {
    trunkLean: number;
    kneeValgus: number;
    ankleFlexion: number;
    depth: number;
    symmetry: number;
    isStable: boolean;
    warnings: string[];
  };
  repCount: number;
  preferredProvider?: AIProvider;
}

export interface CoachResponse {
  feedback: string;
  severity: 'info' | 'warning' | 'critical';
  shouldSpeak: boolean;
  provider: AIProvider;
  latencyMs: number;
}

/**
 * Get available providers in priority order
 */
export function getAvailableProviders(): AIProviderConfig[] {
  return Object.values(AI_PROVIDERS)
    .filter((p): p is AIProviderConfig => p !== undefined && p.enabled)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Check if a provider is configured (has API key)
 */
export function isProviderConfigured(provider: AIProvider): boolean {
  const config = AI_PROVIDERS[provider];
  if (!config) return false;
  const apiKey = process.env[config.apiKeyEnvVar];
  return !!apiKey && apiKey.length > 0;
}

/**
 * Get the next available provider after a failure
 */
export function getNextProvider(
  currentProvider: AIProvider,
  failedProviders: Set<AIProvider> = new Set()
): AIProviderConfig | null {
  const available = getAvailableProviders().filter(
    (p) =>
      p.name !== currentProvider && !failedProviders.has(p.name) && isProviderConfigured(p.name)
  );

  return available.length > 0 ? available[0] : null;
}

/**
 * Estimate cost for a request
 */
export function estimateCost(
  provider: AIProvider,
  inputTokens: number,
  outputTokens: number
): number {
  const config = AI_PROVIDERS[provider];
  if (!config) return 0;
  const inputCost = (inputTokens / 1000) * config.costPer1kTokens.input;
  const outputCost = (outputTokens / 1000) * config.costPer1kTokens.output;
  return inputCost + outputCost;
}

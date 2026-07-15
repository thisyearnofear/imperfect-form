/**
 * AI Provider Configuration
 *
 * Manages multiple AI providers with automatic fallback:
 * 1. Gemini 2.0 Flash (Primary) - Fast, accurate, cost-effective
 * 2. Venice AI (Fallback) - Privacy-focused, uncensored alternative
 * 3. AWS Bedrock Nova 2 Lite (Fallback / premium analysis) - ported from imperfectcoach
 *
 * Features:
 * - Automatic provider rotation on failure
 * - User preference support
 * - Cost tracking per provider
 * - Privacy-first option via Venice
 */

import type { CoachPersonality } from '@/lib/coachPersonalities';

export type AIProvider = 'gemini' | 'venice' | 'bedrock' | 'local';

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
  bedrock: {
    name: 'bedrock',
    enabled: true,
    priority: 3,
    // Nova 2 Lite is cross-region-inference only: the bare model ID
    // (amazon.nova-2-lite-v1:0) is rejected at invoke time. Always use an
    // inference profile ID ('global.' works from any region).
    model: process.env.BEDROCK_MODEL_ID || 'global.amazon.nova-2-lite-v1:0',
    apiKeyEnvVar: 'AWS_ACCESS_KEY_ID',
    costPer1kTokens: {
      input: 0.00006, // Nova Lite-class pricing (approximate)
      output: 0.00024,
    },
    features: {
      streaming: true,
      vision: true,
      toolCalling: true,
      maxTokens: 300000,
    },
  },
};

export interface CoachRequest {
  mode: 'pushups' | 'squats';
  userId?: string; // User wallet address or ID - for persistent sessions
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
  personality?: CoachPersonality; // Coach persona driving feedback tone (default RASTA)
  sessionId?: string; // Persistent session ID from client
}

/**
 * Individual coaching issue
 * Structure allows multi-issue feedback, prioritization, and detailed analysis
 */
export interface CoachingIssue {
  type:
    | 'stability'
    | 'depth'
    | 'trunk_lean'
    | 'knee_valgus'
    | 'ankle_flexion'
    | 'symmetry'
    | 'momentum'
    | 'recovery';
  severity: 'critical' | 'warning' | 'info';
  current: number;
  target: number;
  cue: string;
  priority: number;
  confidence: number;
}

/**
 * Enhanced coach response supporting multi-issue feedback
 * Also includes legacy single-message format for backward compatibility
 */
export interface CoachResponse {
  // Legacy format (maintained for backward compatibility)
  feedback: string;
  severity: 'info' | 'warning' | 'critical';
  shouldSpeak: boolean;

  // New multi-issue format
  issues?: CoachingIssue[];
  summary?: string;
  primaryIssue?: CoachingIssue | null;

  // Metadata
  provider: AIProvider | 'local' | 'cached';
  latencyMs: number;
  sessionTrend?: 'improving' | 'degrading' | 'stable';
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
  if (provider === 'bedrock') {
    // Bedrock accepts either an IAM key pair or a Bedrock API key
    return Boolean(
      (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
      process.env.AWS_BEARER_TOKEN_BEDROCK
    );
  }
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

/**
 * Circuit Breaker State Management
 *
 * Prevents thundering herd and credit waste:
 * - Track failures per provider
 * - Cool down provider after N consecutive failures
 * - Resume after cooldown period
 */
interface CircuitBreakerState {
  failureCount: number;
  lastFailure: number;
  isCoolingDown: boolean;
}

const circuitBreakerState = new Map<AIProvider, CircuitBreakerState>();
const FAILURE_THRESHOLD = 3; // Open circuit after 3 failures
const COOLDOWN_MS = 30000; // 30 second cooldown before retry

function initializeBreaker(provider: AIProvider): CircuitBreakerState {
  if (!circuitBreakerState.has(provider)) {
    circuitBreakerState.set(provider, {
      failureCount: 0,
      lastFailure: 0,
      isCoolingDown: false,
    });
  }
  return circuitBreakerState.get(provider)!;
}

/**
 * Record a failure for a provider
 */
export function recordProviderFailure(provider: AIProvider): void {
  const state = initializeBreaker(provider);
  state.failureCount++;
  state.lastFailure = Date.now();

  if (state.failureCount >= FAILURE_THRESHOLD) {
    state.isCoolingDown = true;
    console.warn(
      `⚠️ Circuit breaker OPENED for ${provider} (${state.failureCount} failures). Cooldown: ${COOLDOWN_MS}ms`
    );
  }
}

/**
 * Record a success for a provider (reset failures)
 */
export function recordProviderSuccess(provider: AIProvider): void {
  const state = initializeBreaker(provider);
  state.failureCount = 0;
  state.isCoolingDown = false;
  console.log(`✅ Circuit breaker RESET for ${provider}`);
}

/**
 * Check if provider is available (not in cooldown)
 */
export function isProviderAvailable(provider: AIProvider): boolean {
  const state = initializeBreaker(provider);

  // Check if cooldown has expired
  if (state.isCoolingDown && Date.now() - state.lastFailure > COOLDOWN_MS) {
    state.isCoolingDown = false;
    state.failureCount = 0; // Reset on cooldown recovery
    console.log(`🔄 Circuit breaker HALF_OPEN for ${provider} (retrying)`);
    return true;
  }

  return !state.isCoolingDown;
}

/**
 * Get provider state (for monitoring)
 */
export function getProviderState(provider: AIProvider): CircuitBreakerState {
  return initializeBreaker(provider);
}

/**
 * Get the best available provider considering circuit breaker
 * Prefers: configured + not cooling down + lowest priority
 */
export function getBestAvailableProvider(preferredProvider?: AIProvider): AIProviderConfig | null {
  // Try preferred provider first if specified and available
  if (preferredProvider) {
    if (isProviderConfigured(preferredProvider) && isProviderAvailable(preferredProvider)) {
      return AI_PROVIDERS[preferredProvider] || null;
    }
  }

  // Get all available providers (configured + not cooling down)
  const available = getAvailableProviders()
    .filter((p) => isProviderConfigured(p.name) && isProviderAvailable(p.name))
    .sort((a, b) => a.priority - b.priority);

  return available.length > 0 ? available[0] : null;
}

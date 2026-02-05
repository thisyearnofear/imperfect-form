import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIProvider,
  AI_PROVIDERS,
  getNextProvider,
  getBestAvailableProvider,
  recordProviderFailure,
  recordProviderSuccess,
  estimateCost,
} from '@/config/aiProviders';

/**
 * Shared AI provider utilities (single source of truth).
 * Used by both live coaching and post-session reports.
 */

async function callGemini(prompt: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const providerConfig = AI_PROVIDERS.gemini;
  if (!providerConfig) throw new Error('Gemini provider config not found');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: providerConfig.model });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Gemini');
  }

  return JSON.parse(jsonMatch[0]);
}

async function callVenice(prompt: string): Promise<any> {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) throw new Error('VENICE_API_KEY not configured');

  const config = AI_PROVIDERS.venice;
  if (!config || !config.baseUrl) throw new Error('Venice provider config not found');

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a concise fitness coach. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    throw new Error(`Venice API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Venice');
  }

  return JSON.parse(jsonMatch[0]);
}

export async function callAIProvider(
  prompt: string,
  preferredProvider?: AIProvider
): Promise<{ result: any; provider: AIProvider; latencyMs: number; estimatedCost: number }> {
  const startTime = Date.now();
  const failedProviders = new Set<AIProvider>();

  let currentProvider: AIProvider | null = null;
  let config = getBestAvailableProvider(preferredProvider);
  currentProvider = config?.name || null;

  if (!currentProvider) {
    throw new Error('No AI providers available (all in cooldown or misconfigured)');
  }

  while (currentProvider && config) {
    try {
      let result;
      if (currentProvider === 'gemini') {
        result = await callGemini(prompt);
      } else if (currentProvider === 'venice') {
        result = await callVenice(prompt);
      } else {
        throw new Error(`Unknown provider: ${currentProvider}`);
      }

      const latencyMs = Date.now() - startTime;
      const estimatedCost = estimateCost(currentProvider, 400, 120);
      recordProviderSuccess(currentProvider);

      return { result, provider: currentProvider, latencyMs, estimatedCost };
    } catch (error) {
      failedProviders.add(currentProvider);
      recordProviderFailure(currentProvider);

      const nextConfig = getNextProvider(currentProvider, failedProviders);
      currentProvider = nextConfig?.name || null;
      config = nextConfig || null;
    }
  }

  throw new Error('No AI providers available');
}

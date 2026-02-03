import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIProvider,
  AI_PROVIDERS,
  CoachRequest,
  CoachResponse,
  getAvailableProviders,
  getNextProvider,
  isProviderConfigured,
} from '@/config/aiProviders';

/**
 * Multi-Provider Live Coach API
 *
 * Supports:
 * - Gemini 2.0 Flash (Primary)
 * - Venice AI (Fallback)
 *
 * Features:
 * - Automatic provider rotation on failure
 * - User preference support
 * - Privacy-first option
 */

const COACHING_PROMPT = `You are Coachy, an expert biomechanics coach analyzing real-time exercise form.

Your role:
- Provide CONCISE, actionable feedback (max 10 words)
- Focus on the most critical issue first
- Use encouraging, motivational language
- Be specific about body parts and movements

Exercise Context:
- Mode: {mode}
- Current Rep: {repCount}

Current Metrics:
- Trunk Lean: {trunkLean}° (ideal: <30° for squats, <15° for pushups)
- Knee Valgus: {kneeValgus}px (ideal: <30px, measures inward knee collapse)
- Depth: {depth} (0-1 scale, ideal: >0.8)
- Stability: {isStable}
- Active Warnings: {warnings}

Rules:
1. If warnings exist, address the first one directly
2. If depth < 0.3, say "Go deeper!" or "Lower down more!"
3. If depth > 0.9, say "Perfect depth!" or "Excellent range!"
4. If trunk lean > 45° (squats), say "Stay more upright!"
5. If knee valgus > 40px, say "Push knees out!"
6. If no issues, give brief encouragement

Respond with ONLY a JSON object:
{
  "feedback": "Your concise feedback here",
  "severity": "info" | "warning" | "critical",
  "shouldSpeak": true/false (speak if warning or critical)
}`;

/**
 * Call Gemini API
 */
async function callGemini(
  prompt: string
): Promise<{ feedback: string; severity: string; shouldSpeak: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const providerConfig = AI_PROVIDERS.gemini;
  if (!providerConfig) throw new Error('Gemini provider config not found');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: providerConfig.model });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Gemini');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Call Venice AI (OpenAI-compatible)
 */
async function callVenice(
  prompt: string
): Promise<{ feedback: string; severity: string; shouldSpeak: boolean }> {
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
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`Venice API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Venice');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Call AI provider with automatic fallback
 */
async function callAIProvider(
  prompt: string,
  preferredProvider?: AIProvider
): Promise<{ result: any; provider: AIProvider; latencyMs: number }> {
  const startTime = Date.now();
  const failedProviders = new Set<AIProvider>();

  // Start with preferred provider if specified and configured
  let currentProvider: AIProvider | null = null;

  if (preferredProvider && isProviderConfigured(preferredProvider)) {
    currentProvider = preferredProvider;
  } else {
    // Use highest priority available provider
    const available = getAvailableProviders();
    currentProvider = available.find((p) => isProviderConfigured(p.name))?.name || null;
  }

  while (currentProvider) {
    try {
      console.log(`🤖 Attempting AI call with provider: ${currentProvider}`);

      let result;
      if (currentProvider === 'gemini') {
        result = await callGemini(prompt);
      } else if (currentProvider === 'venice') {
        result = await callVenice(prompt);
      } else {
        throw new Error(`Unknown provider: ${currentProvider}`);
      }

      const latencyMs = Date.now() - startTime;
      console.log(`✅ AI call successful with ${currentProvider} (${latencyMs}ms)`);

      return { result, provider: currentProvider, latencyMs };
    } catch (error) {
      console.warn(`❌ ${currentProvider} failed:`, error);
      failedProviders.add(currentProvider);

      // Try next provider
      const nextConfig = getNextProvider(currentProvider, failedProviders);
      currentProvider = nextConfig?.name || null;

      if (currentProvider) {
        console.log(`🔄 Falling back to ${currentProvider}`);
      }
    }
  }

  throw new Error('All AI providers failed');
}

export async function POST(request: NextRequest) {
  try {
    const body: CoachRequest = await request.json();
    const { mode, metrics, repCount, preferredProvider } = body;

    // Validate input
    if (!mode || !metrics) {
      return NextResponse.json(
        { error: 'Missing required fields: mode, metrics' },
        { status: 400 }
      );
    }

    // Prepare prompt with actual data
    const prompt = COACHING_PROMPT.replace('{mode}', mode)
      .replace('{repCount}', repCount.toString())
      .replace('{trunkLean}', metrics.trunkLean.toFixed(1))
      .replace('{kneeValgus}', metrics.kneeValgus.toFixed(1))
      .replace('{depth}', metrics.depth.toFixed(2))
      .replace('{isStable}', metrics.isStable.toString())
      .replace('{warnings}', metrics.warnings.join(', ') || 'None');

    // Call AI with automatic fallback
    try {
      const { result, provider, latencyMs } = await callAIProvider(prompt, preferredProvider);

      const response: CoachResponse = {
        ...result,
        provider,
        latencyMs,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('All AI providers failed:', error);

      // Graceful fallback to local feedback
      return NextResponse.json(
        {
          feedback: 'Keep pushing!',
          severity: 'info',
          shouldSpeak: false,
          provider: 'local',
          latencyMs: 0,
        } as CoachResponse,
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Live coach error:', error);

    // Graceful fallback
    return NextResponse.json(
      {
        feedback: 'Keep going!',
        severity: 'info',
        shouldSpeak: false,
        provider: 'local',
        latencyMs: 0,
      } as CoachResponse,
      { status: 200 }
    );
  }
}

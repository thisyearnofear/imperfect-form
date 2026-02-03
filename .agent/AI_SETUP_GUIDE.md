# 🤖 AI Coaching Setup Guide

## Quick Start

### 1. Get Your API Keys

#### Gemini API Key (Recommended - Primary Provider)

1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key

**Why Gemini 3 Flash Preview?**

- ✅ 3x faster than Gemini 2.5 Pro (218 tokens/sec)
- ✅ Frontier-level reasoning (90.4% GPQA Diamond)
- ✅ 30% more token-efficient
- ✅ 2000 RPM rate limit
- ✅ Cost: $0.50/$3 per 1M tokens (with 90% caching discount)

#### Venice API Key (Optional - Privacy Fallback)

1. Visit: https://venice.ai
2. Sign up for an account
3. Upgrade to Pro ($10 includes free credits) or buy DIEM
4. Go to Settings → API Keys
5. Create a new API key
6. Copy the key

**Why Venice AI?**

- ✅ Privacy-focused (self-hosted option)
- ✅ Uncensored alternative
- ✅ OpenAI-compatible API
- ✅ Pay-as-you-go pricing
- ✅ Cost: $0.10/$0.10 per 1M tokens

### 2. Add to Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your keys:

```bash
# AI Coaching Providers
GEMINI_API_KEY=your_actual_gemini_key_here
VENICE_API_KEY=your_actual_venice_key_here  # Optional
```

### 3. Test the Setup

Start the dev server:

```bash
pnpm turbo dev
```

Do a workout and check the console:

```
🤖 Attempting AI call with provider: gemini
✅ AI call successful with gemini (450ms)
🤖 AI Coach (gemini): Push knees out! (450ms)
```

## Provider Behavior

### Automatic Fallback Chain

```
User starts workout
    ↓
Try Gemini 3 Flash → Success! ✅
    ↓
[If Gemini fails or rate limited]
    ↓
Try Venice AI → Success! ✅
    ↓
[If Venice fails]
    ↓
Use Local Feedback ✅ (always available)
```

### Configuration Options

**Both Keys Configured (Recommended):**

- Primary: Gemini 3 Flash
- Fallback: Venice AI
- Last Resort: Local feedback
- **Best reliability**

**Only Gemini Key:**

- Primary: Gemini 3 Flash
- Fallback: Local feedback
- **Best quality, good reliability**

**Only Venice Key:**

- Primary: Venice AI
- Fallback: Local feedback
- **Privacy-focused, good reliability**

**No Keys:**

- Local feedback only
- **Always works, basic quality**

## Cost Estimates

### Per Workout (2-min session, 24 AI calls)

| Configuration    | Cost    | Notes            |
| ---------------- | ------- | ---------------- |
| Gemini only      | $0.01   | Before caching   |
| Gemini + caching | $0.001  | 90% discount     |
| Venice only      | $0.0132 | Privacy mode     |
| Mixed (95/5)     | $0.0097 | Best reliability |
| Local only       | FREE    | Basic feedback   |

### At Scale (1M workouts/month)

| Configuration    | Monthly Cost | As % of Revenue\* |
| ---------------- | ------------ | ----------------- |
| Gemini + caching | $1,000       | 0.1%              |
| Mixed (95/5)     | $1,610       | 0.16%             |
| Venice only      | $13,200      | 1.32%             |

\*Assuming $10/month subscription × 100K users = $1M revenue

## User Controls

Users can choose their preferred provider in the AgentInsightTray:

1. Click the **"···"** button during workout
2. Select provider preference:
   - **Auto** (default): Gemini → Venice → Local
   - **Gemini Only**: Best quality, falls back to local
   - **Venice Only**: Privacy-first, falls back to local

## Troubleshooting

### "AI coaching failed, using local feedback"

**Possible causes:**

1. API key not set or invalid
2. Rate limit exceeded
3. Network error
4. API service down

**Solutions:**

1. Check `.env.local` has correct keys
2. Verify keys are valid (test in AI Studio/Venice)
3. Restart dev server after adding keys
4. Check console for specific error messages

### "All AI providers failed"

**This means:**

- Both Gemini and Venice failed
- System fell back to local feedback
- Workout continues normally (graceful degradation)

**Check:**

1. Both API keys are valid
2. Network connection is stable
3. No rate limits exceeded
4. Services are operational

### Rate Limits

**Gemini 3 Flash Preview:**

- Free tier: 15 RPM (requests per minute)
- Paid tier: 2000 RPM
- Context: 1M tokens
- Daily: 1500 requests

**Venice AI:**

- Pay-as-you-go: No hard limits
- Pro subscription: Generous limits
- Rate limits based on account tier

**Tip:** If you hit Gemini's free tier limit, Venice automatically takes over!

## Best Practices

### 1. **Start with Gemini Only**

- Get free API key
- Test the system
- Upgrade to paid if needed

### 2. **Add Venice for Redundancy**

- Prevents downtime
- Privacy option for users
- Handles overflow traffic

### 3. **Monitor Usage**

- Check console logs
- Track which provider is used
- Optimize based on patterns

### 4. **Implement Caching (Future)**

- 90% cost savings
- Same coaching prompt every time
- Easy to implement

## Security Notes

### ⚠️ Never Commit API Keys

- `.env.local` is in `.gitignore`
- Never push keys to GitHub
- Use environment variables in production

### ✅ Production Deployment

```bash
# Vercel/Netlify
GEMINI_API_KEY=your_key
VENICE_API_KEY=your_key

# Docker
docker run -e GEMINI_API_KEY=your_key ...

# Kubernetes
kubectl create secret generic ai-keys \
  --from-literal=GEMINI_API_KEY=your_key \
  --from-literal=VENICE_API_KEY=your_key
```

## FAQ

**Q: Do I need both API keys?**
A: No, but recommended for best reliability. Gemini alone works great.

**Q: Which provider is better?**
A: Gemini 3 Flash is faster and higher quality. Venice is more private.

**Q: What if I don't add any keys?**
A: Local feedback works fine, just less personalized.

**Q: How much will this cost me?**
A: ~$0.001 per workout with caching. Negligible at any scale.

**Q: Can users choose their provider?**
A: Yes! Via the debug panel in AgentInsightTray.

**Q: Is my data private?**
A: Gemini sends to Google. Venice is more private. Local is 100% private.

**Q: What happens if both fail?**
A: Local feedback always works. Workout never breaks.

## Support

- **Gemini Issues**: https://aistudio.google.com/app/apikey
- **Venice Issues**: https://discord.gg/askvenice
- **App Issues**: Check `.agent/AI_QUICK_REFERENCE.md`

---

**Ready to coach!** 🚀

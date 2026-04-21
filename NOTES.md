# Auto-Speak TTS Notes

## Cloud TTS Performance Comparison (2026-04)

| Provider / Model | TTFB | Latency (~10 chars) | Latency (~100 chars) | Japanese Quality | Price |
|---|---|---|---|---|---|
| **Browser built-in** | ~50ms | ~50ms | ~50ms | Low–Mid (OS-dependent; macOS good, Linux bad) | Free |
| **Gemini Flash TTS** | ~2-5s | ~3-8s | ~10-30s | High (native-level, emotional) | ~$0.01/1K chars |
| **OpenAI tts-1** | ~200ms | ~0.5-1s | ~2-4s | Mid (English-focused, Japanese is stiff) | $15/1M chars |
| **OpenAI gpt-4o-mini-tts** | ~300ms | ~0.8-2s | ~3-6s | High (style instructions supported) | $12/1M chars |
| **ElevenLabs Turbo v2.5** | ~150ms | ~0.3-0.8s | ~1-3s | Best (most natural, voice control) | $0.15/1K chars |
| **ElevenLabs Multilingual v2** | ~300ms | ~0.5-1.5s | ~2-5s | Best (multilingual optimized) | $0.30/1K chars |

### Key Observations

- **Gemini TTS does NOT support streaming** — generates full audio then returns in one shot. Long text = long wait. Not ideal for hover-triggered word reading.
- **OpenAI and ElevenLabs support streaming** — short text (single words) returns in <1s.
- **Browser built-in is instant** but voice quality varies wildly by OS. macOS has decent Japanese voices; Linux has only espeak-ng (robotic).

## Recommended Configuration for Language Learners

**Best UX: split word and sentence engines.**

| Scope | Engine | Why |
|---|---|---|
| **Word** | `browser` (built-in) | Instant feedback (~50ms). For a single word, voice quality matters less than speed. |
| **Sentence** | `openai/gpt-4o-mini-tts/nova` | High-quality Japanese with ~1-3s latency. Acceptable for sentence-length audio that plays AFTER the instant word reading. |

Flow:
1. Hover a word → browser built-in speaks "寄与しませんでした" instantly
2. Word finishes → gpt-4o-mini-tts speaks the full sentence with natural prosody
3. Move mouse away → both cancel immediately

Alternative combos:
- **Budget**: browser (word) + Gemini Flash TTS (sentence) — free + cheap, but sentence has 5-10s delay
- **Premium**: ElevenLabs Turbo (word) + ElevenLabs Multilingual (sentence) — best quality, ~$0.15-0.30/1K chars
- **Offline-only**: browser (both) — no API key needed, works without internet

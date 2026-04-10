# 10ten-ja-reader auto-speak TODO

## DONE

- [x] Auto-speak matched word on hover (Web Speech API)
- [x] Speak inflected surface text, not just dictionary headword
- [x] Configurable: source (matched/reading), modifier keys, engine select
- [x] Double-click reads selection aloud (Japanese only)
- [x] Sentence-level reading: hovering the first word of a sentence reads the full sentence up to 。！？
- [x] Mouse leave cancels mid-sentence speech
- [x] Audio options section in extension settings UI
- [x] Upstream minimal PR (birchill/10ten-ja-reader#2869)
- [x] Demo video pipeline (Docker + Xvfb + Gemini TTS narration)

## NEXT

- [ ] **Online TTS model selection** — let users choose a cloud TTS provider instead of (or in addition to) the browser's built-in Web Speech API. The browser engine sounds robotic on many platforms; cloud voices are dramatically better for Japanese.

  **Settings to add:**
  - `autoSpeakEngine`: expand from `'browser'` to `'browser' | 'gemini' | 'openai' | 'claude'`
  - `autoSpeakApiKey`: encrypted/stored API key input (use `chrome.storage.local`, NOT sync — keys must not leave the device via sync)
  - `autoSpeakModel`: model ID string, e.g. `gemini-2.5-flash-preview-tts`, `gpt-4o-mini-tts`, `claude-sonnet-4-6` (when audio output is GA)
  - `autoSpeakVoice`: voice name/preset per provider (e.g. Gemini `Kore`, OpenAI `alloy`)

  **UI (AudioSettings.tsx):**
  - Engine dropdown: Browser built-in / Gemini / OpenAI / Claude
  - When cloud engine selected → show API key input (password field, stored in local storage)
  - Model selector (text input or dropdown with common presets)
  - Voice selector (provider-specific presets)
  - "Test" button that speaks a sample phrase

  **Implementation notes:**
  - Cloud TTS runs in the **background service worker** (content scripts can't make cross-origin fetch to API endpoints). Content script sends `{ type: 'speak', text, engine, model }` message to background; background fetches audio, returns base64 PCM/WAV; content script plays via `AudioContext`.
  - Gemini TTS returns raw PCM (L16, 24kHz) — must decode to Float32 for AudioContext
  - OpenAI TTS returns mp3/opus — decode via `AudioContext.decodeAudioData()`
  - Claude TTS (when available) — TBD, likely similar to OpenAI
  - Rate limiting / caching: cache recent utterances in memory (LRU, ~50 entries) to avoid re-fetching the same word
  - Error handling: if API call fails, fall back to browser built-in with a console warning
  - API key validation: on save, make a tiny test request and show ✓/✗ next to the input

## LATER

- [ ] **Chunked TTS for reduced TTFB** — split long sentences/articles at natural boundaries (、。) into small chunks (~20-50 chars), fetch TTS for each chunk concurrently, play chunk 1 as soon as it returns while chunks 2+ continue fetching in background. Seamless gapless playback via AudioContext buffer queuing. Expected improvement: TTFB drops from 10-30s (full sentence) to 1-3s (first clause). Requires:
  - Sentence splitter that respects Japanese clause boundaries (、。！？)
  - AudioContext buffer queue with pre-buffering of next chunk
  - Graceful cancel mid-stream when mouse leaves
  - Cache individual chunks for re-hover
- [ ] Voice speed / pitch controls
- [ ] Per-site auto-speak enable/disable
- [ ] Keyboard shortcut to speak current popup content on demand
- [ ] Anki integration: auto-add audio to exported cards

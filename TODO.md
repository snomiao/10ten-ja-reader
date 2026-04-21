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
- [x] Cloud TTS model selection (Gemini/OpenAI/ElevenLabs) with searchable combobox + API key
- [x] Separate word/sentence TTS engines (browser for instant word, cloud for quality sentence)
- [x] Test button with editable sample text (枕草子) + elapsed timer + error display
- [x] Sentence-level reading on hover (word first, then sentence)
- [x] Configurable auto-speak scope (word+sentence / word only / sentence only)

## NEXT

- [ ] **Chunked TTS streaming** — split long text at clause boundaries, fetch concurrently, play first chunk immediately (see LATER section for details)

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

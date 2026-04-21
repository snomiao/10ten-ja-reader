// Cloud TTS providers for the auto-speak feature.
//
// Each provider takes a text string + API key and returns a base64-encoded
// audio blob that the content script can play via AudioContext.

export interface CloudTtsRequest {
  text: string;
  // Format: 'provider/model/voice'
  engine: string;
  apiKey: string;
}

export interface CloudTtsResponse {
  // base64-encoded audio data
  audio: string;
  // MIME type of the audio ('audio/mp3', 'audio/wav', etc.)
  mimeType: string;
}

// ── Preset models ──────────────────────────────────────────────────────────
// Shown in the options combobox as searchable/selectable presets.
export const TTS_PRESETS: Array<{
  label: string;
  value: string;
  provider: string;
}> = [
  // Browser built-in
  {
    label: 'Browser built-in (Web Speech API)',
    value: 'browser',
    provider: 'browser',
  },

  // Gemini
  {
    label: 'Gemini 2.5 Flash TTS / Kore',
    value: 'gemini/gemini-2.5-flash-preview-tts/Kore',
    provider: 'gemini',
  },
  {
    label: 'Gemini 2.5 Flash TTS / Aoede',
    value: 'gemini/gemini-2.5-flash-preview-tts/Aoede',
    provider: 'gemini',
  },
  {
    label: 'Gemini 2.5 Flash TTS / Charon',
    value: 'gemini/gemini-2.5-flash-preview-tts/Charon',
    provider: 'gemini',
  },
  {
    label: 'Gemini 2.5 Flash TTS / Fenrir',
    value: 'gemini/gemini-2.5-flash-preview-tts/Fenrir',
    provider: 'gemini',
  },
  {
    label: 'Gemini 2.5 Flash TTS / Puck',
    value: 'gemini/gemini-2.5-flash-preview-tts/Puck',
    provider: 'gemini',
  },

  // OpenAI
  {
    label: 'OpenAI gpt-4o-mini-tts / alloy',
    value: 'openai/gpt-4o-mini-tts/alloy',
    provider: 'openai',
  },
  {
    label: 'OpenAI gpt-4o-mini-tts / echo',
    value: 'openai/gpt-4o-mini-tts/echo',
    provider: 'openai',
  },
  {
    label: 'OpenAI gpt-4o-mini-tts / fable',
    value: 'openai/gpt-4o-mini-tts/fable',
    provider: 'openai',
  },
  {
    label: 'OpenAI gpt-4o-mini-tts / nova',
    value: 'openai/gpt-4o-mini-tts/nova',
    provider: 'openai',
  },
  {
    label: 'OpenAI gpt-4o-mini-tts / shimmer',
    value: 'openai/gpt-4o-mini-tts/shimmer',
    provider: 'openai',
  },
  {
    label: 'OpenAI tts-1 / alloy',
    value: 'openai/tts-1/alloy',
    provider: 'openai',
  },
  {
    label: 'OpenAI tts-1-hd / alloy',
    value: 'openai/tts-1-hd/alloy',
    provider: 'openai',
  },

  // ElevenLabs
  {
    label: 'ElevenLabs Multilingual v2 / Rachel',
    value: 'elevenlabs/eleven_multilingual_v2/Rachel',
    provider: 'elevenlabs',
  },
  {
    label: 'ElevenLabs Multilingual v2 / Domi',
    value: 'elevenlabs/eleven_multilingual_v2/Domi',
    provider: 'elevenlabs',
  },
  {
    label: 'ElevenLabs Turbo v2.5 / Rachel',
    value: 'elevenlabs/eleven_turbo_v2_5/Rachel',
    provider: 'elevenlabs',
  },
];

// Parse 'provider/model/voice' into components.
export function parseEngine(engine: string): {
  provider: string;
  model: string;
  voice: string;
} {
  if (engine === 'browser' || !engine.includes('/')) {
    return { provider: 'browser', model: '', voice: '' };
  }
  const parts = engine.split('/');
  return { provider: parts[0], model: parts[1] || '', voice: parts[2] || '' };
}

// ── Provider implementations ───────────────────────────────────────────────

async function geminiTts(
  text: string,
  model: string,
  voice: string,
  apiKey: string
): Promise<CloudTtsResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text }], role: 'user' }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
    },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`Gemini TTS ${resp.status}: ${await resp.text()}`);
  }
  const data = await resp.json();
  const part = data.candidates?.[0]?.content?.parts?.[0];
  if (!part?.inlineData?.data) {
    throw new Error('Gemini TTS returned no audio data');
  }
  // Gemini returns raw PCM (L16, 24kHz mono). We encode a WAV header so
  // the content script can decode it with AudioContext.decodeAudioData().
  const pcmBase64 = part.inlineData.data as string;
  const wavBase64 = pcmToWavBase64(pcmBase64, 24000);
  return { audio: wavBase64, mimeType: 'audio/wav' };
}

async function openaiTts(
  text: string,
  model: string,
  voice: string,
  apiKey: string
): Promise<CloudTtsResponse> {
  const resp = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: text, voice, response_format: 'mp3' }),
  });
  if (!resp.ok) {
    throw new Error(`OpenAI TTS ${resp.status}: ${await resp.text()}`);
  }
  const buf = await resp.arrayBuffer();
  const audio = arrayBufferToBase64(buf);
  return { audio, mimeType: 'audio/mp3' };
}

async function elevenlabsTts(
  text: string,
  model: string,
  voice: string,
  apiKey: string
): Promise<CloudTtsResponse> {
  // ElevenLabs uses voice_id in the URL path. For preset voices we use the
  // name as-is; the API resolves common names. For custom voice IDs users
  // can paste the full ID.
  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!resp.ok) {
    throw new Error(`ElevenLabs TTS ${resp.status}: ${await resp.text()}`);
  }
  const buf = await resp.arrayBuffer();
  const audio = arrayBufferToBase64(buf);
  return { audio, mimeType: 'audio/mpeg' };
}

// ── Dispatch ───────────────────────────────────────────────────────────────

export async function cloudTts(
  req: CloudTtsRequest
): Promise<CloudTtsResponse> {
  const { provider, model, voice } = parseEngine(req.engine);
  switch (provider) {
    case 'gemini':
      return geminiTts(req.text, model, voice, req.apiKey);
    case 'openai':
      return openaiTts(req.text, model, voice, req.apiKey);
    case 'elevenlabs':
      return elevenlabsTts(req.text, model, voice, req.apiKey);
    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Wrap raw PCM (L16 signed 16-bit LE mono) in a WAV container.
function pcmToWavBase64(pcmBase64: string, sampleRate: number): string {
  const pcmBinary = atob(pcmBase64);
  const pcmLength = pcmBinary.length;
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + pcmLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmLength, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmLength, true);

  // PCM data
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < pcmLength; i++) {
    bytes[headerSize + i] = pcmBinary.charCodeAt(i);
  }

  return arrayBufferToBase64(buffer);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

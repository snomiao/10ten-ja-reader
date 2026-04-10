import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { TTS_PRESETS, parseEngine } from '../background/cloud-tts';
import type { Config } from '../common/config';
import { useLocale } from '../common/i18n';

import { CheckboxRow } from './CheckboxRow';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

type ModKey = 'Alt' | 'Ctrl' | 'Shift';
const MOD_KEYS: ReadonlyArray<ModKey> = ['Alt', 'Ctrl', 'Shift'];

export function AudioSettings(props: Props) {
  const { t } = useLocale();

  const autoSpeak = useConfigValue(props.config, 'autoSpeak');
  const autoSpeakSource = useConfigValue(props.config, 'autoSpeakSource');
  const autoSpeakEngine = useConfigValue(props.config, 'autoSpeakEngine');
  const autoSpeakScope = useConfigValue(props.config, 'autoSpeakScope');
  const autoSpeakModKeys = useConfigValue(props.config, 'autoSpeakModKeys');

  // API key is stored in local storage (async), not sync.
  const [apiKey, setApiKey] = useState('');
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false);
  useEffect(() => {
    void props.config.getAutoSpeakApiKey().then((key) => {
      setApiKey(key);
      setApiKeyLoaded(true);
    });
  }, [props.config]);

  const onChangeAutoSpeak = useCallback(
    (value: boolean) => {
      props.config.autoSpeak = value;
    },
    [props.config]
  );

  const onChangeSource = useCallback(
    (value: 'matched' | 'reading') => {
      props.config.autoSpeakSource = value;
    },
    [props.config]
  );

  const onChangeEngine = useCallback(
    (value: string) => {
      props.config.autoSpeakEngine = value;
    },
    [props.config]
  );

  const onChangeApiKey = useCallback(
    (value: string) => {
      setApiKey(value);
      void props.config.setAutoSpeakApiKey(value);
    },
    [props.config]
  );

  const onChangeScope = useCallback(
    (value: 'word+sentence' | 'word' | 'sentence') => {
      props.config.autoSpeakScope = value;
    },
    [props.config]
  );

  const onToggleModKey = useCallback(
    (key: ModKey, checked: boolean) => {
      const current = new Set(props.config.autoSpeakModKeys);
      if (checked) {
        current.add(key);
      } else {
        current.delete(key);
      }
      props.config.autoSpeakModKeys = MOD_KEYS.filter((k) => current.has(k));
    },
    [props.config]
  );

  const [sampleText, setSampleText] = useState(
    '古池や蛙飛び込む水の音。\n春はあけぼの。やうやう白くなりゆく山際、少し明かりて、紫だちたる雲の細くたなびきたる。\n夏は夜。月のころはさらなり。闇もなほ、蛍の多く飛びちがひたる。また、ただ一つ二つなど、ほのかにうち光りて行くもをかし。雨など降るもをかし。'
  );
  const [testStatus, setTestStatus] = useState<'idle' | 'playing' | 'error'>(
    'idle'
  );
  const [testError, setTestError] = useState('');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const onTestSpeak = useCallback(async () => {
    const engine = props.config.autoSpeakEngine;
    const { provider: p } = parseEngine(engine);

    // Stop any currently playing test
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {
        /* ignore */
      }
      audioSourceRef.current = null;
    }
    if (
      typeof window !== 'undefined' &&
      typeof window.speechSynthesis !== 'undefined'
    ) {
      window.speechSynthesis.cancel();
    }

    if (!sampleText.trim()) {
      return;
    }

    setTestStatus('playing');
    setTestError('');

    if (p === 'browser') {
      // Browser TTS
      if (
        typeof window === 'undefined' ||
        typeof window.speechSynthesis === 'undefined'
      ) {
        setTestStatus('error');
        setTestError('speechSynthesis not available in this browser');
        return;
      }
      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.lang = 'ja-JP';
      const jaVoice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang === 'ja-JP' || v.lang.startsWith('ja'));
      if (jaVoice) {
        utterance.voice = jaVoice;
      }
      utterance.addEventListener('end', () => setTestStatus('idle'));
      utterance.addEventListener('error', (e) => {
        setTestStatus('error');
        setTestError(e.error || 'Browser speech synthesis failed');
      });
      window.speechSynthesis.speak(utterance);
    } else {
      // Cloud TTS — call directly from options page (it's a regular HTML
      // page that can fetch cross-origin).
      try {
        const key = await props.config.getAutoSpeakApiKey();
        if (!key) {
          setTestStatus('error');
          setTestError('No API key configured');
          return;
        }
        const { cloudTts } = await import('../background/cloud-tts');
        const response = await cloudTts({
          text: sampleText,
          engine,
          apiKey: key,
        });
        const audio = response.audio;
        const binary = atob(audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        const buf = await ctx.decodeAudioData(bytes.buffer.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = buf;
        source.connect(ctx.destination);
        source.onended = () => {
          audioSourceRef.current = null;
          setTestStatus('idle');
        };
        audioSourceRef.current = source;
        source.start();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[10ten] Test TTS error:', msg);
        setTestStatus('error');
        setTestError(msg);
      }
    }
  }, [props.config, sampleText]);

  const { provider } = parseEngine(autoSpeakEngine);
  const needsApiKey = provider !== 'browser';

  return (
    <>
      <SectionHeading>{t('options_audio_heading')}</SectionHeading>
      <div class="flex flex-col gap-3 py-4">
        <CheckboxRow>
          <input
            id="autoSpeak"
            name="autoSpeak"
            type="checkbox"
            checked={autoSpeak}
            onChange={(e) => onChangeAutoSpeak(e.currentTarget.checked)}
          />
          <label for="autoSpeak">{t('options_auto_speak')}</label>
        </CheckboxRow>

        <div class="grid w-fit grid-cols-[repeat(2,auto)] items-baseline gap-x-4 gap-y-3">
          <label for="autoSpeakSource">
            {t('options_auto_speak_source_label')}
          </label>
          <select
            id="autoSpeakSource"
            name="autoSpeakSource"
            disabled={!autoSpeak}
            onChange={(e) =>
              onChangeSource(e.currentTarget.value as 'matched' | 'reading')
            }
          >
            <option value="matched" selected={autoSpeakSource === 'matched'}>
              {t('options_auto_speak_source_matched')}
            </option>
            <option value="reading" selected={autoSpeakSource === 'reading'}>
              {t('options_auto_speak_source_reading')}
            </option>
          </select>

          <label for="autoSpeakScope">
            {t('options_auto_speak_scope_label')}
          </label>
          <select
            id="autoSpeakScope"
            name="autoSpeakScope"
            disabled={!autoSpeak}
            onChange={(e) =>
              onChangeScope(
                e.currentTarget.value as 'word+sentence' | 'word' | 'sentence'
              )
            }
          >
            <option
              value="word+sentence"
              selected={autoSpeakScope === 'word+sentence'}
            >
              {t('options_auto_speak_scope_word_sentence')}
            </option>
            <option value="word" selected={autoSpeakScope === 'word'}>
              {t('options_auto_speak_scope_word')}
            </option>
            <option value="sentence" selected={autoSpeakScope === 'sentence'}>
              {t('options_auto_speak_scope_sentence')}
            </option>
          </select>

          <label for="autoSpeakEngine">
            {t('options_auto_speak_engine_label')}
          </label>
          <div>
            <input
              id="autoSpeakEngine"
              name="autoSpeakEngine"
              type="text"
              list="autoSpeakEnginePresets"
              disabled={!autoSpeak}
              value={autoSpeakEngine}
              onInput={(e) => onChangeEngine(e.currentTarget.value)}
              class="w-full min-w-[320px] rounded border border-zinc-300 px-2 py-1 text-sm"
              placeholder="browser"
            />
            <datalist id="autoSpeakEnginePresets">
              {TTS_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </datalist>
          </div>

          {needsApiKey && (
            <>
              <label for="autoSpeakApiKey">
                {t('options_auto_speak_api_key_label')}
              </label>
              <div class="flex items-center gap-2">
                <input
                  id="autoSpeakApiKey"
                  name="autoSpeakApiKey"
                  type="password"
                  disabled={!autoSpeak || !apiKeyLoaded}
                  value={apiKey}
                  onInput={(e) => onChangeApiKey(e.currentTarget.value)}
                  class="min-w-[240px] flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
                  placeholder={`${provider} API key`}
                  autocomplete="off"
                />
                <button
                  type="button"
                  disabled={!autoSpeak || !apiKey}
                  onClick={onTestSpeak}
                  class="shrink-0 rounded border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm hover:bg-zinc-100 disabled:opacity-40"
                >
                  {testStatus === 'playing'
                    ? '...'
                    : testStatus === 'error'
                      ? '✗'
                      : '▶ Test'}
                </button>
              </div>
              {testStatus === 'error' && testError && (
                <>
                  <div />
                  <div class="text-sm text-red-600">{testError}</div>
                </>
              )}
            </>
          )}

          <label for="autoSpeakSample">
            {t('options_auto_speak_sample_label')}
          </label>
          <textarea
            id="autoSpeakSample"
            name="autoSpeakSample"
            disabled={!autoSpeak}
            value={sampleText}
            onInput={(e) => setSampleText(e.currentTarget.value)}
            rows={3}
            class="w-full min-w-[320px] rounded border border-zinc-300 px-2 py-1 text-sm"
            placeholder="Sample text for testing..."
          />
          {provider === 'browser' && (
            <>
              <div />
              <button
                type="button"
                disabled={!autoSpeak}
                onClick={onTestSpeak}
                class="w-fit rounded border border-zinc-300 bg-zinc-50 px-3 py-1 text-sm hover:bg-zinc-100 disabled:opacity-40"
              >
                {testStatus === 'playing'
                  ? '...'
                  : testStatus === 'error'
                    ? '✗'
                    : '▶ Test'}
              </button>
              {testStatus === 'error' && testError && (
                <>
                  <div />
                  <div class="text-sm text-red-600">{testError}</div>
                </>
              )}
            </>
          )}
        </div>

        <div>
          <div class="pb-1">{t('options_auto_speak_mod_keys_label')}</div>
          <div class="flex gap-5 px-2">
            {MOD_KEYS.map((key) => (
              <CheckboxRow key={key}>
                <input
                  id={`autoSpeakMod${key}`}
                  name={`autoSpeakMod${key}`}
                  type="checkbox"
                  disabled={!autoSpeak}
                  checked={autoSpeakModKeys.includes(key)}
                  onChange={(e) => onToggleModKey(key, e.currentTarget.checked)}
                />
                <label for={`autoSpeakMod${key}`}>{key}</label>
              </CheckboxRow>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

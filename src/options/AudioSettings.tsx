import { useCallback, useEffect, useState } from 'preact/hooks';

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
              <input
                id="autoSpeakApiKey"
                name="autoSpeakApiKey"
                type="password"
                disabled={!autoSpeak || !apiKeyLoaded}
                value={apiKey}
                onInput={(e) => onChangeApiKey(e.currentTarget.value)}
                class="w-full min-w-[320px] rounded border border-zinc-300 px-2 py-1 text-sm"
                placeholder={`${provider} API key`}
                autocomplete="off"
              />
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

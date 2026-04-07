import { useCallback } from 'preact/hooks';

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
    (value: 'browser') => {
      props.config.autoSpeakEngine = value;
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
          <select
            id="autoSpeakEngine"
            name="autoSpeakEngine"
            disabled={!autoSpeak}
            onChange={(e) => onChangeEngine(e.currentTarget.value as 'browser')}
          >
            <option value="browser" selected={autoSpeakEngine === 'browser'}>
              {t('options_auto_speak_engine_browser')}
            </option>
          </select>
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

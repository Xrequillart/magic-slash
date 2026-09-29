import { useEffect, useState } from 'react'
import { CodeXml, GitPullRequest } from '@ds/desktop/icons'
import { CodeThemeCard, SectionHeader, SettingsCard } from '@ds/desktop'
import { useCodeAppearance } from '../../hooks/useCodeAppearance'
import { useConfig } from '../../hooks/useConfig'
import { useStore } from '../../store'
import { useTheme } from '../../theme'
import { useT, type MessageKey } from '../../i18n'
import { SELECT_WIDTH } from '../../theme/controls'
import { showToast } from '../../components/Toast'
import {
  CODE_FONT_SIZES, CODE_SAMPLE_LANGUAGES, CODE_SYNTAX_FAMILIES, CODE_SYNTAX_FAMILY_IDS,
  DEFAULT_CODE_FONT_SIZE, DEFAULT_CODE_SYNTAX, THEME_CODE_SYNTAX,
  type CodeSample, type CodeSampleLanguage, type CodeSyntaxChoice,
} from '../../../types'

/**
 * HOW CODE READS, AND WHAT WATCHES THE PULL REQUESTS IT ENDS UP IN.
 *
 * Two sections that used to live apart: the palette sat on Appearance as a three-way
 * "follow / always light / always dark", and the PR watcher on Application between the
 * split view and plan sync. Both are about the code rather than about the window, and a
 * reader tuning how a diff looks is the reader who wants to know what the app does with
 * the review that diff is in.
 *
 * ── THE PALETTE IS A FAMILY ───────────────────────────────────────────────────────
 *
 * See `CODE_SYNTAX_FAMILIES`: the reader picks GitHub or Catppuccin, and the theme picks
 * the variant. That is what lets the list be the same fifteen names on every theme and
 * still never offer light code on a dark window — there is no such entry to offer.
 *
 * THE PREVIEW IS THE REAL ONE: a sample file with a small change over it, highlighted in
 * the main process by the functions the file preview goes through, and drawn by the
 * design system's `CodeThemeCard` with the stylesheet `CodeView` uses (`codeChrome.ts`),
 * so the rails, the gutter and the size are exactly what a diff will show. What is left
 * in this file is the wiring: which write each picker makes, and the sample request.
 */

/**
 * How often the pull-request watcher looks, in milliseconds, and what each interval is
 * called. Keys rather than labels: module scope is evaluated once at import, so a `t()`
 * here would pin the list to the boot language.
 */
export const PR_WATCHER_INTERVALS = [30_000, 60_000, 120_000, 300_000] as const

export const PR_WATCHER_INTERVAL_LABEL: Record<(typeof PR_WATCHER_INTERVALS)[number], MessageKey> = {
  30_000: 'settings.application.prWatcher.interval30s',
  60_000: 'settings.application.prWatcher.interval1m',
  120_000: 'settings.application.prWatcher.interval2m',
  300_000: 'settings.application.prWatcher.interval5m',
}

/** The sample's highlighting, asked again whenever the palette or the language moves. */
function useCodeSample(language: CodeSampleLanguage, shikiTheme: string): CodeSample | null | 'failed' {
  const [sample, setSample] = useState<CodeSample | null | 'failed'>(null)
  useEffect(() => {
    let live = true
    window.electronAPI.config.codeSample(language)
      .then((next) => { if (live) setSample(next) })
      .catch(() => { if (live) setSample('failed') })
    return () => { live = false }
  }, [language, shikiTheme])
  // An answer painted in another palette than the one in force is not shown: the main
  // process read the config a beat before the renderer's store caught up, or the other
  // way round, and the next request is already on its way.
  return sample !== 'failed' && sample !== null && sample.shikiTheme !== shikiTheme ? null : sample
}

function CodeSection() {
  const t = useT()
  const theme = useTheme()
  const { config, updateCodeSyntax, updateCodeFontSize } = useConfig()
  const { appearance, blend, shikiTheme } = useCodeAppearance()
  const [language, setLanguage] = useState<CodeSampleLanguage>('ts')
  const sample = useCodeSample(language, shikiTheme)

  const storedSyntax = config?.codeSyntax ?? DEFAULT_CODE_SYNTAX
  const storedSize = config?.codeFontSize ?? DEFAULT_CODE_FONT_SIZE
  const [syntax, setSyntax] = useState<CodeSyntaxChoice>(storedSyntax)
  const [size, setSize] = useState(storedSize)
  useEffect(() => setSyntax(storedSyntax), [storedSyntax])
  useEffect(() => setSize(storedSize), [storedSize])

  // Optimistic, then reverted on failure — the shape every write in Settings uses.
  const chooseSyntax = async (next: CodeSyntaxChoice) => {
    if (next === syntax) return
    const previous = syntax
    setSyntax(next)
    try {
      await updateCodeSyntax(next)
    } catch (error) {
      setSyntax(previous)
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const chooseSize = async (next: number) => {
    if (next === size) return
    const previous = size
    setSize(next)
    try {
      await updateCodeFontSize(next)
    } catch (error) {
      setSize(previous)
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  // Auto names the family it stands for on THIS theme, so the reader can see what they
  // would be overriding before they override it.
  const paired = CODE_SYNTAX_FAMILIES[THEME_CODE_SYNTAX[theme]].label
  const syntaxOptions = [
    { value: 'auto', label: t('settings.code.syntax.auto', { name: paired }) },
    ...CODE_SYNTAX_FAMILY_IDS.map((id) => ({ value: id, label: CODE_SYNTAX_FAMILIES[id].label })),
  ]

  return (
    <div>
      <SectionHeader icon={CodeXml} title={t('settings.code.section')} />
      <CodeThemeCard
        rows={[
          {
            id: 'codeSyntax',
            label: t('settings.code.syntax.label'),
            hint: t('settings.code.syntax.help'),
            control: {
              kind: 'select',
              value: syntax,
              options: syntaxOptions,
              onChange: (next) => chooseSyntax(next as CodeSyntaxChoice),
              ariaLabel: t('settings.code.syntax.label'),
              width: SELECT_WIDTH,
            },
          },
          {
            id: 'codeFontSize',
            label: t('settings.code.font.label'),
            hint: t('settings.code.font.help'),
            control: {
              kind: 'select',
              value: String(size),
              options: CODE_FONT_SIZES.map((px) => ({
                value: String(px),
                label: t('settings.code.font.option', { size: px }),
              })),
              onChange: (next) => chooseSize(parseInt(next, 10)),
              ariaLabel: t('settings.code.font.label'),
              width: SELECT_WIDTH,
            },
          },
        ]}
        preview={{
          state: sample === 'failed' ? 'failed' : sample === null ? 'loading' : 'ready',
          html: sample !== 'failed' && sample !== null ? sample.highlightedHtml : null,
          content: sample !== 'failed' && sample !== null ? sample.content : '',
          appearance,
          blend,
          // The size being chosen, not the stored one: the preview answers the picker at
          // once rather than after the round trip.
          fontSize: size,
          failedLabel: t('settings.code.preview.failed'),
          language: {
            value: language,
            options: CODE_SAMPLE_LANGUAGES.map(({ id, label }) => ({ value: id, label })),
            onChange: (next) => setLanguage(next as CodeSampleLanguage),
            ariaLabel: t('settings.code.preview.language'),
          },
        }}
      />
    </div>
  )
}

function PrWatcherSection() {
  const t = useT()
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)

  const [prWatcherEnabled, setPrWatcherEnabled] = useState(config?.prReviews?.enabled ?? true)
  const [prWatcherInterval, setPrWatcherInterval] = useState(config?.prReviews?.pollIntervalMs ?? 60_000)
  const [prWatcherAutoLaunch, setPrWatcherAutoLaunch] = useState(config?.prReviews?.autoLaunchSkills ?? false)

  const configPrWatcherEnabled = config?.prReviews?.enabled
  const configPrWatcherInterval = config?.prReviews?.pollIntervalMs
  const configPrWatcherAutoLaunch = config?.prReviews?.autoLaunchSkills
  useEffect(() => {
    if (configPrWatcherEnabled !== undefined) setPrWatcherEnabled(configPrWatcherEnabled)
    if (configPrWatcherInterval !== undefined) setPrWatcherInterval(configPrWatcherInterval)
    if (configPrWatcherAutoLaunch !== undefined) setPrWatcherAutoLaunch(configPrWatcherAutoLaunch)
  }, [configPrWatcherEnabled, configPrWatcherInterval, configPrWatcherAutoLaunch])

  return (
    <div>
      <SectionHeader icon={GitPullRequest} title={t('settings.application.prWatcher.section')} />
      <SettingsCard
        rows={[
          {
            id: 'prWatcher',
            label: t('settings.application.prWatcher.label'),
            hint: t('settings.application.prWatcher.help'),
            control: {
              kind: 'switch',
              checked: prWatcherEnabled,
              onChange: async () => {
                const newValue = !prWatcherEnabled
                setPrWatcherEnabled(newValue)
                // Pushed into the store, not just written to disk: the PR card in
                // the agent sidebar reads this setting to decide whether to say
                // "watching is off", and it would otherwise keep claiming the
                // opposite until the next config load.
                setConfig(await window.electronAPI.prWatcher.setEnabled(newValue))
              },
              label: t('settings.application.prWatcher.label'),
            },
          },
          // Both are questions about a watcher that is running: how often, and what it
          // may start on its own. Left out rather than dimmed while it is not.
          prWatcherEnabled && {
            id: 'prWatcherInterval',
            label: t('settings.application.prWatcher.intervalLabel'),
            hint: t('settings.application.prWatcher.intervalHelp'),
            control: {
              kind: 'select' as const,
              value: String(prWatcherInterval),
              // The interval is a NUMBER of milliseconds and the picker deals in
              // strings, so it is parsed on the way back.
              options: PR_WATCHER_INTERVALS.map((ms) => ({
                value: String(ms),
                label: t(PR_WATCHER_INTERVAL_LABEL[ms]),
              })),
              onChange: (next: string) => {
                const newInterval = parseInt(next, 10)
                setPrWatcherInterval(newInterval)
                window.electronAPI.prWatcher.setInterval(newInterval)
              },
              ariaLabel: t('settings.application.prWatcher.intervalLabel'),
              width: SELECT_WIDTH,
            },
          },
          prWatcherEnabled && {
            id: 'prWatcherAutoLaunch',
            label: t('settings.application.prWatcher.autoLaunchLabel'),
            hint: t('settings.application.prWatcher.autoLaunchHelp'),
            control: {
              kind: 'switch' as const,
              checked: prWatcherAutoLaunch,
              onChange: () => {
                const newValue = !prWatcherAutoLaunch
                setPrWatcherAutoLaunch(newValue)
                window.electronAPI.prWatcher.setAutoLaunchSkills(newValue)
              },
              label: t('settings.application.prWatcher.autoLaunchLabel'),
            },
          },
        ]}
      />
    </div>
  )
}

export function CodeReviewsPage() {
  return (
    <div className="flex flex-col gap-8">
      <CodeSection />
      <PrWatcherSection />
    </div>
  )
}

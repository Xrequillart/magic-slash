import { Modal } from './Modal'
import { TerminalView } from './TerminalView'
import { useStore } from '../store'
import { useScriptRunner } from '../hooks/useScriptRunner'
import { useT } from '../i18n'
import { BTN, BTN_DANGER } from '../theme/controls'
import { hasScriptExited } from '../utils/scriptTerminals'

/**
 * A running script's terminal, in a dialog you dismiss.
 *
 * A script is a background process you glance at, not a workspace you live in — so it
 * gets a dialog rather than the main content pane, which stays on the agent that was
 * already there. This is the ONLY surface a script terminal has.
 *
 * The PTY is the one `useScriptRunner` already started, addressed by its existing
 * `script-` id, so that hook's exit listener, toasts and state transitions remain the
 * single source of truth. Nothing here talks to the process except "stop". Reaching for
 * the hook also keeps its module-level exit listener registered for the whole life of the
 * app, which the repository card — mounted only for the inspected agent — cannot promise.
 *
 * Mounted unconditionally, opened and closed through the store, same shape as
 * `WhatsNewModal`: `Modal` outlives its own close by the length of the exit animation,
 * which a parent that mounted it conditionally would cut off.
 */
export function ScriptTerminalModal() {
  const t = useT()
  const script = useStore(s => s.scriptTerminalModal)
  const isOpen = useStore(s => s.scriptTerminalModalOpen)
  const closeScriptTerminalModal = useStore(s => s.closeScriptTerminalModal)
  const { scriptTerminals, stopScript } = useScriptRunner()

  // Only the payload is required to render: `isOpen` is the dialog's own business.
  if (!script) return null

  // One flag, so the footer and the terminal cannot disagree about the same script.
  const exited = hasScriptExited(scriptTerminals, script.id)

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeScriptTerminalModal}
      title={script.scriptName}
      maxWidth="max-w-4xl"
      footer={
        <>
          {exited && (
            <span className="mr-auto self-center text-xs text-text-secondary/60">
              {t('scriptModal.exited')}
            </span>
          )}
          <button onClick={closeScriptTerminalModal} className={BTN}>
            {t('common.close')}
          </button>
          {!exited && (
            <button
              // Closed first and the kill left to run, as the card's own X already does:
              // waiting on a process group teardown to dismiss a dialog reads as a hang.
              onClick={() => { closeScriptTerminalModal(); void stopScript(script.id) }}
              className={BTN_DANGER}
            >
              {t('common.stop')}
            </button>
          )}
        </>
      }
    >
      {/* `relative` and an explicit height, both required: `TerminalView` renders
          `absolute inset-0`, so a static or auto-height host gives it nothing to fill. */}
      <div className="relative h-[60vh] rounded-lg border border-line overflow-hidden">
        <TerminalView
          terminal={{
            id: script.id,
            name: `${script.scriptName} (${script.agentName})`,
            state: exited ? 'error' : 'working',
            repositories: [script.projectPath],
          }}
          isVisible
          // Not focused on purpose: this is output to read, not a prompt to type at, so
          // Escape dismisses the dialog rather than reaching the script. Only until the
          // first click inside — that hands xterm real DOM focus, after which keys go to
          // the PTY as well, which is what makes Ctrl+C work.
          isFocused={false}
        />
      </div>
    </Modal>
  )
}

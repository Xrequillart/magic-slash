/**
 * Strip ANSI escape codes from terminal output.
 *
 * Lives at the src root, next to the other pure cross-process helpers
 * (repoMatch, urls, claude-theme), because BOTH sides need it: the renderer parses
 * script output with it (renderer/hooks/useScriptRunner.ts, its original home) and
 * the main process builds the permission-prompt preview with it
 * (main/questions/pending-questions.ts). There must stay exactly one of these —
 * two regexes drifting apart is how a preview ends up full of escape sequences.
 */
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
}

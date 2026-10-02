export function formatDroppedPaths(files: FileList): string {
  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i] as File & { path: string }
    if (file.path) paths.push(file.path)
  }
  return formatPaths(paths)
}

/**
 * Paths as the TUI takes them when typed: space separated, a path with a space or a
 * quote in it wrapped in double quotes. Shared by the terminal's drop and the chat's
 * attachments, so a file reaches `claude` the same way through either.
 */
export function formatPaths(paths: string[]): string {
  return paths.map((p) => (/[ '()"]/.test(p) ? `"${p}"` : p)).join(' ')
}

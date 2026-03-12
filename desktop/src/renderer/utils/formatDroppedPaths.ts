export function formatDroppedPaths(files: FileList): string {
  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i] as File & { path: string }
    if (file.path) {
      const needsQuoting = /[ '()"]/.test(file.path)
      paths.push(needsQuoting ? `"${file.path}"` : file.path)
    }
  }
  return paths.join(' ')
}

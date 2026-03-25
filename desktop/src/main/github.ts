import { execFileSync } from 'child_process'

export function getGitHubToken(): string | null {
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf-8' }).trim() || null
  } catch {
    return null
  }
}

export function githubHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  const token = getGitHubToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

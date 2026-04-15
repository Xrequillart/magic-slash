const { notarize } = require('@electron/notarize')

const MAX_RETRIES = 3
const BASE_DELAY_MS = 15_000 // 15 seconds

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryable(message) {
  const retryablePatterns = [
    'timed out',
    'timeout',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'socket hang up',
    'network',
    '503',
    '502',
    '500',
  ]
  const lower = message.toLowerCase()
  return retryablePatterns.some((p) => lower.includes(p.toLowerCase()))
}

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') {
    return
  }

  // Skip notarization in local builds (no credentials)
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('Skipping notarization: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD or APPLE_TEAM_ID not set')
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Notarizing ${appPath} (attempt ${attempt}/${MAX_RETRIES})...`)

      await notarize({
        appPath,
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
      })

      console.log('Notarization complete')
      return
    } catch (error) {
      const message = error.message || String(error)
      console.error(`Notarization attempt ${attempt}/${MAX_RETRIES} failed:\n${message}`)

      if (attempt < MAX_RETRIES && isRetryable(message)) {
        const delay = BASE_DELAY_MS * attempt
        console.log(`Retrying in ${delay / 1000}s...`)
        await sleep(delay)
      } else if (attempt >= MAX_RETRIES) {
        throw new Error(`Notarization failed after ${MAX_RETRIES} attempts. Last error: ${message}`)
      } else {
        // Non-retryable error (e.g. auth failure, invalid credentials)
        throw new Error(`Notarization failed (non-retryable): ${message}`)
      }
    }
  }
}

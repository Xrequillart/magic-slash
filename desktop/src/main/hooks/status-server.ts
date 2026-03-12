import * as http from 'http'
import { URL } from 'url'

type StateCallback = (terminalId: string, state: string) => void
type MetadataCallback = (terminalId: string, metadata: Record<string, string | string[] | Record<string, { prUrl?: string }>>) => void
type CommandStartCallback = (terminalId: string, command: string) => void
type CommandEndCallback = (terminalId: string, exitCode: number) => void
type RepositoriesCallback = (terminalId: string, repositories: string[]) => void

let server: http.Server | null = null
let serverPort: number = 0
let stateCallback: StateCallback | null = null
let metadataCallback: MetadataCallback | null = null
let commandStartCallback: CommandStartCallback | null = null
let commandEndCallback: CommandEndCallback | null = null
let repositoriesCallback: RepositoriesCallback | null = null

export function getServerPort(): number {
  return serverPort
}

export function setStateCallback(callback: StateCallback) {
  stateCallback = callback
}

export function setMetadataCallback(callback: MetadataCallback) {
  metadataCallback = callback
}

export function setCommandStartCallback(callback: CommandStartCallback) {
  commandStartCallback = callback
}

export function setCommandEndCallback(callback: CommandEndCallback) {
  commandEndCallback = callback
}

export function setRepositoriesCallback(callback: RepositoriesCallback) {
  repositoriesCallback = callback
}

export function startStatusServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST')

      if (!req.url) {
        res.writeHead(400)
        res.end('Bad request')
        return
      }

      try {
        const url = new URL(req.url, `http://localhost:${serverPort}`)

        if (url.pathname === '/status') {
          const terminalId = url.searchParams.get('id')
          const state = url.searchParams.get('state')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          if (terminalId && state && stateCallback) {
            stateCallback(terminalId, state)
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/metadata') {
          const terminalId = url.searchParams.get('id')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          const title = url.searchParams.get('title')
          const branchName = url.searchParams.get('branchName')
          const ticketId = url.searchParams.get('ticketId')
          const description = url.searchParams.get('description')
          const status = url.searchParams.get('status')
          const prUrl = url.searchParams.get('prUrl')
          const prRepo = url.searchParams.get('prRepo')  // Repository path for the PR
          const fullStackTaskId = url.searchParams.get('fullStackTaskId')
          const relatedWorktreesRaw = url.searchParams.get('relatedWorktrees')

          if (terminalId && metadataCallback) {
            const metadata: Record<string, string | string[] | Record<string, { prUrl?: string }>> = {}
            if (title) metadata.title = title
            if (branchName) metadata.branchName = branchName
            if (ticketId) metadata.ticketId = ticketId
            if (description) metadata.description = description
            if (status) metadata.status = status
            if (prUrl && prRepo) {
              // Store PR URL per repository
              metadata.repositoryMetadata = { [prRepo]: { prUrl } }
            }
            if (fullStackTaskId) metadata.fullStackTaskId = fullStackTaskId
            if (relatedWorktreesRaw) {
              try {
                metadata.relatedWorktrees = JSON.parse(relatedWorktreesRaw)
              } catch (e) {
                console.error('[Hook Metadata] Failed to parse relatedWorktrees:', e)
              }
            }

            metadataCallback(terminalId, metadata)
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/command/start') {
          const terminalId = url.searchParams.get('id')
          const command = url.searchParams.get('cmd')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          const decodedCommand = command ? decodeURIComponent(command) : ''

          if (terminalId && decodedCommand && commandStartCallback) {
            commandStartCallback(terminalId, decodedCommand)
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/command/end') {
          const terminalId = url.searchParams.get('id')
          const exitCodeStr = url.searchParams.get('exit')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          const exitCode = parseInt(exitCodeStr || '0', 10)

          if (terminalId && commandEndCallback) {
            commandEndCallback(terminalId, exitCode)
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/repositories') {
          const terminalId = url.searchParams.get('id')

          // Ignore sidebar terminals (VS Code extension)
          if (terminalId?.startsWith('sidebar-')) {
            res.writeHead(200)
            res.end('OK')
            return
          }

          const reposRaw = url.searchParams.get('repos')

          if (terminalId && reposRaw && repositoriesCallback) {
            try {
              const repos = JSON.parse(reposRaw)
              if (Array.isArray(repos)) {
                repositoriesCallback(terminalId, repos)
              }
            } catch (e) {
              console.error('[Hook Repositories] Failed to parse repos:', e)
            }
          }

          res.writeHead(200)
          res.end('OK')
        } else if (url.pathname === '/ping') {
          res.writeHead(200)
          res.end('pong')
        } else {
          res.writeHead(404)
          res.end('Not found')
        }
      } catch {
        res.writeHead(500)
        res.end('Server error')
      }
    })

    // Listen on a random available port
    server.listen(0, '127.0.0.1', () => {
      const address = server?.address()
      if (address && typeof address === 'object') {
        serverPort = address.port
        console.log(`Magic Slash status server listening on port ${serverPort}`)
        resolve(serverPort)
      } else {
        reject(new Error('Failed to get server port'))
      }
    })

    server.on('error', (error) => {
      reject(error)
    })
  })
}

export function stopStatusServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        server = null
        serverPort = 0
        resolve()
      })
    } else {
      resolve()
    }
  })
}

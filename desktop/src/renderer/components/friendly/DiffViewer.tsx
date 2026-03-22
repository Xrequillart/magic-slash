import { memo, useMemo } from 'react'

interface DiffLine {
  type: 'added' | 'removed' | 'context'
  content: string
}

function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')

  // Simple LCS-based diff
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'context', content: oldLines[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', content: newLines[j - 1] })
      j--
    } else {
      result.push({ type: 'removed', content: oldLines[i - 1] })
      i--
    }
  }

  result.reverse()

  return result
}

interface DiffViewerProps {
  filePath: string
  oldString: string
  newString: string
}

export const DiffViewer = memo(function DiffViewer({ filePath, oldString, newString }: DiffViewerProps) {
  const diffLines = useMemo(() => computeDiff(oldString, newString), [oldString, newString])
  const fileName = filePath.split('/').pop() || filePath

  return (
    <div className="mt-2">
      <div className="text-[11px] font-mono text-text-secondary mb-1 truncate">{fileName}</div>
      <div className="bg-black/40 border border-white/10 rounded-md overflow-x-auto text-[12px] font-mono leading-relaxed">
        {diffLines.map((line, i) => {
          let bg = ''
          let prefix = ' '
          let textColor = 'text-white/70'

          if (line.type === 'added') {
            bg = 'bg-green/10'
            prefix = '+'
            textColor = 'text-green'
          } else if (line.type === 'removed') {
            bg = 'bg-red/10'
            prefix = '-'
            textColor = 'text-red'
          }

          return (
            <div key={i} className={`px-2 py-0 whitespace-pre ${bg}`}>
              <span className={`select-none ${textColor} opacity-60`}>{prefix} </span>
              <span className={textColor}>{line.content}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

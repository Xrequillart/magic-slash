import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

const COMMANDS = [
  { name: '/magic:start', description: 'Start a new task' },
  { name: '/magic:continue', description: 'Resume work on a task' },
  { name: '/magic:commit', description: 'Create a commit' },
  { name: '/magic:pr', description: 'Create a Pull Request' },
  { name: '/magic:review', description: 'Review a PR' },
  { name: '/magic:resolve', description: 'Address review feedback' },
  { name: '/magic:done', description: 'Finalize after merge' },
]

export function QuickLaunch() {
  const [input, setInput] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Find the slash portion to filter suggestions
  const slashMatch = input.match(/(\/[\w:]*)$/)
  const showSuggestions = slashMatch !== null
  const slashText = slashMatch ? slashMatch[1].toLowerCase() : ''
  const suggestions = showSuggestions
    ? COMMANDS.filter(c => c.name.startsWith(slashText))
    : []

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handleFocus = () => {
      setInput('')
      setSelectedIndex(0)
      inputRef.current?.focus()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [input])

  // Resize window to match content
  useEffect(() => {
    requestAnimationFrame(() => {
      const h = containerRef.current?.offsetHeight
      if (h) window.electronAPI.quickLaunch.resize(h)
    })
  }, [suggestions.length, showSuggestions])

  // Global escape listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI.quickLaunch.close()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function acceptSuggestion(command: string) {
    // Replace the /partial with the full command
    const newInput = input.replace(/\/[\w:]*$/, command + ' ')
    setInput(newInput)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        acceptSuggestion(suggestions[selectedIndex].name)
        return
      }
    }

    if (e.key === 'Enter' && input.trim()) {
      if (showSuggestions && suggestions.length > 0) {
        acceptSuggestion(suggestions[selectedIndex].name)
        return
      }
      // Send the input as-is — the main window will use it as the prompt
      window.electronAPI.quickLaunch.dispatch(input.trim(), '')
    }
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* Input — Spotlight style */}
      <div className="flex items-center gap-4 px-5 py-4">
        <Search className="w-6 h-6 text-zinc-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="PROJ-123 /start"
          className="flex-1 bg-transparent text-white text-2xl placeholder:text-zinc-600 caret-white"
          style={{ outline: 'none', boxShadow: 'none', border: 'none', fontFamily: '"Cera Pro", -apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 500 }}
          autoFocus
          spellCheck={false}
        />
      </div>

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="border-t border-white/10">
          {suggestions.map((cmd, i) => (
            <div
              key={cmd.name}
              onMouseDown={() => acceptSuggestion(cmd.name)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`flex items-center justify-between px-5 py-2.5 cursor-pointer transition-colors ${
                i === selectedIndex ? 'bg-white/10' : ''
              }`}
            >
              <span className="text-white text-sm font-medium">{cmd.name}</span>
              <span className="text-zinc-500 text-xs">{cmd.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

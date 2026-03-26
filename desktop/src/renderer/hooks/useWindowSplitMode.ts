import { useEffect, useRef } from 'react'
import { useStore } from '../store'

const SPLIT_THRESHOLD = 1500
const DEBOUNCE_MS = 150

export function useWindowSplitMode() {
  const setSplitMode = useStore((s) => s.setSplitMode)
  const setIsWideScreen = useStore((s) => s.setIsWideScreen)
  const splitEnabled = useStore((s) => s.splitEnabled)
  const splitActive = useStore((s) => s.splitActive)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const check = () => {
      const wide = window.innerWidth >= SPLIT_THRESHOLD
      setIsWideScreen(wide)
      setSplitMode(wide && splitEnabled && splitActive)
    }

    const debouncedCheck = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(check, DEBOUNCE_MS)
    }

    check() // immediate check on mount
    window.addEventListener('resize', debouncedCheck)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('resize', debouncedCheck)
    }
  }, [setSplitMode, setIsWideScreen, splitEnabled, splitActive])
}

import { FileX2 } from 'lucide-react'
import { formatSize } from '../../utils/formatSize'

interface Props {
  size: number
}

export default function BinaryPlaceholder({ size }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-32 gap-2 text-text-secondary">
      <FileX2 size={32} className="opacity-40" />
      <span className="text-sm">Binary file</span>
      <span className="text-xs opacity-60">{formatSize(size)}</span>
    </div>
  )
}

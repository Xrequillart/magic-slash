import { FileX2 } from 'lucide-react'
import { formatSize } from '../../utils/formatSize'
import { useT } from '../../i18n'

interface Props {
  size: number
}

export default function BinaryPlaceholder({ size }: Props) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center h-32 gap-2 text-text-secondary">
      <FileX2 size={32} className="text-icon-muted" />
      <span className="text-sm">{t('filePreview.binary')}</span>
      <span className="text-xs opacity-60">{formatSize(size)}</span>
    </div>
  )
}

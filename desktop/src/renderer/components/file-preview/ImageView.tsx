interface Props {
  dataUrl: string
  alt: string
}

export default function ImageView({ dataUrl, alt }: Props) {
  return (
    <div className="flex items-center justify-center p-4 min-h-32">
      <img
        src={dataUrl}
        alt={alt}
        className="max-w-full max-h-[70vh] object-contain rounded"
      />
    </div>
  )
}

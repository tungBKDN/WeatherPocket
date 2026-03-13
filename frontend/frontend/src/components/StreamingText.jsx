// Renders streaming content word-by-word with fade-in per new word span.
// Each word gets a stable key = its index; new words mount fresh → CSS animation fires.
export default function StreamingText({ content }) {
  const parts = content.split(/( +|\n)/)
  return (
    <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => (
        <span className="word-appear" key={i}>{part}</span>
      ))}
    </p>
  )
}

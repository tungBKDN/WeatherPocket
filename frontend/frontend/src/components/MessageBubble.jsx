import { useEffect, useRef, useState } from 'react'
import Markdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { IconUser, IconBot } from './Icons'
import StreamingText from './StreamingText'
import { getChunkCitation } from '../services/chat'

const CITATION_REGEX = /\$\[\s*([a-fA-F0-9]{24})\s*,\s*(\d+)\s*\]\$/g

function normalizeCitationMarkup(content) {
  if (!content) return content

  const citationByKey = new Map()
  let nextNumber = 0

  return content.replace(CITATION_REGEX, (_, fileId, chunkIndexRaw) => {
    const chunkIndex = Number(chunkIndexRaw)
    const key = `${fileId}:${chunkIndex}`

    if (!citationByKey.has(key)) {
      citationByKey.set(key, nextNumber)
      nextNumber += 1
    }

    const citationNumber = citationByKey.get(key)
    return `[${citationNumber}](citation:${encodeURIComponent(fileId)}:${chunkIndex})`
  })
}

function citationUrlTransform(url) {
  if (typeof url === 'string' && url.startsWith('citation:')) {
    return url
  }
  return defaultUrlTransform(url)
}

function CitationLink({ href, children }) {
  const isCitation = typeof href === 'string' && href.startsWith('citation:')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState(null)
  const [placement, setPlacement] = useState('above')
  const closeTimerRef = useRef(null)
  const anchorRef = useRef(null)

  if (!isCitation) {
    return <a className="underline underline-offset-2 opacity-80 hover:opacity-100" href={href} rel="noreferrer" target="_blank">{children}</a>
  }

  const [_, encodedFileId, chunkIndexRaw] = href.split(':')
  const fileId = decodeURIComponent(encodedFileId)
  const chunkIndex = Number(chunkIndexRaw)

  const loadCitation = async () => {
    if (loading || payload || error) return
    setLoading(true)
    try {
      const data = await getChunkCitation(fileId, chunkIndex)
      setPayload(data)
    } catch (err) {
      setError(err?.message || 'Failed to load citation')
    } finally {
      setLoading(false)
    }
  }

  const clearCloseTimer = () => {
    if (!closeTimerRef.current) return
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }

  const handleOpen = () => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (rect) {
      setPlacement(rect.top < window.innerHeight / 2 ? 'below' : 'above')
    }
    clearCloseTimer()
    setOpen(true)
    loadCitation()
  }

  const handleCloseSoon = () => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
    }, 130)
  }

  useEffect(() => {
    return () => clearCloseTimer()
  }, [])

  return (
    <span
      ref={anchorRef}
      className="citation-anchor"
      onBlur={handleCloseSoon}
      onFocus={handleOpen}
      onMouseEnter={handleOpen}
      onMouseLeave={handleCloseSoon}
      tabIndex={0}
    >
      <button className="citation-pill" onClick={() => (open ? setOpen(false) : handleOpen())} type="button">{children}</button>
      {open && (
        <div className={`citation-popover ${placement === 'below' ? 'citation-popover-below' : 'citation-popover-above'}`} onMouseEnter={handleOpen} onMouseLeave={handleCloseSoon} role="tooltip">
          <p className="citation-popover-title">Source chunk</p>
          {loading && <p className="citation-popover-meta">Loading...</p>}
          {!loading && error && <p className="citation-popover-error">{error}</p>}
          {!loading && !error && payload && (
            <>
              <p className="citation-popover-meta">{payload.file_name} • chunk #{payload.chunk_index}</p>
              <div className="citation-popover-content">[...] {payload.content} [...]</div>
            </>
          )}
        </div>
      )}
    </span>
  )
}

const markdownComponents = {
  p:          ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong:     ({ children }) => <strong className="font-semibold">{children}</strong>,
  em:         ({ children }) => <em className="italic">{children}</em>,
  h1:         ({ children }) => <h1 className="font-sans text-xl font-bold mt-4 mb-2">{children}</h1>,
  h2:         ({ children }) => <h2 className="font-sans text-lg font-bold mt-3 mb-2">{children}</h2>,
  h3:         ({ children }) => <h3 className="font-sans text-base font-bold mt-2 mb-1">{children}</h3>,
  ul:         ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
  li:         ({ children }) => <li>{children}</li>,
  code:       ({ inline, children }) =>
    inline
      ? <code className="rounded bg-zinc-200/60 dark:bg-zinc-700/60 px-1 py-0.5 font-mono text-[0.82em]">{children}</code>
      : <pre className="my-3 overflow-x-auto rounded-lg bg-zinc-900 dark:bg-zinc-950 p-4 font-mono text-sm text-zinc-100"><code>{children}</code></pre>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-yellow-400 pl-4 italic my-3 opacity-80">{children}</blockquote>,
  a:          ({ href, children }) => <CitationLink href={href}>{children}</CitationLink>,
  hr:         () => <hr className="my-4 border-t border-current opacity-20" />,
  table:      ({ children }) => <table className="border-collapse w-full text-sm my-3">{children}</table>,
  th:         ({ children }) => <th className="border border-current/20 px-3 py-2 font-semibold text-left opacity-80">{children}</th>,
  td:         ({ children }) => <td className="border border-current/20 px-3 py-2">{children}</td>,
}

export default function MessageBubble({ message, isStreaming }) {
  const isHuman = message.type === 'human'
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [bodyHeight, setBodyHeight] = useState('auto')
  const bodyRef = useRef(null)
  const COLLAPSE_THRESHOLD = 300
  const COLLAPSED_HEIGHT = 132
  const isLong = !isStreaming && message.content.length > COLLAPSE_THRESHOLD
  const displayContent = message.content
  const markdownWithCitations = normalizeCitationMarkup(displayContent)

  useEffect(() => {
    if (!isLong) {
      setIsCollapsed(false)
      setIsAnimating(false)
      setBodyHeight('auto')
    }
  }, [isLong])

  useEffect(() => {
    if (!isLong || isCollapsed) return
    setBodyHeight('auto')
  }, [message.content, isLong, isCollapsed])

  const handleToggleCollapse = () => {
    if (!isLong || !bodyRef.current || isAnimating) return

    const fullHeight = bodyRef.current.scrollHeight
    setIsAnimating(true)

    if (isCollapsed) {
      setBodyHeight(`${COLLAPSED_HEIGHT}px`)
      requestAnimationFrame(() => {
        setIsCollapsed(false)
        setBodyHeight(`${fullHeight}px`)
      })
      return
    }

    setBodyHeight(`${fullHeight}px`)
    requestAnimationFrame(() => {
      setIsCollapsed(true)
      setBodyHeight(`${COLLAPSED_HEIGHT}px`)
    })
  }

  const handleTransitionEnd = () => {
    if (!isAnimating) return
    setIsAnimating(false)
    if (!isCollapsed) setBodyHeight('auto')
  }

  const ShowMoreBtn = isLong ? (
    <button
      className="mt-2 flex items-center gap-1 text-sm font-semibold text-yellow-600 hover:underline dark:text-yellow-400"
      onClick={handleToggleCollapse}
      type="button"
    >
      {isCollapsed ? 'Expand \u2193' : 'Collapse \u2191'}
    </button>
  ) : null

  if (isHuman) {
    return (
      <div className="flex justify-end gap-3 mb-6">
        <div className="flex flex-col items-end max-w-[75%]">
          <div className="rounded-2xl rounded-br-none bg-yellow-400 px-4 py-3 text-zinc-900 shadow-sm dark:bg-yellow-500/90">
            <div
              className={`message-collapse-shell ${isLong ? 'is-collapsible' : ''} ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}
              onTransitionEnd={handleTransitionEnd}
              style={isLong ? { height: bodyHeight } : undefined}
            >
              <div className="message-collapse-content" ref={bodyRef}>
                <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
              </div>
              {isLong && isCollapsed && <div aria-hidden="true" className="message-collapse-fade message-collapse-fade-human" />}
            </div>
          </div>
          {ShowMoreBtn}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 mt-1">
          <IconUser />
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-3 mb-6">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 mt-1">
        <IconBot />
      </div>
      <div className="flex flex-col items-start max-w-[75%]">
        <div className="rounded-2xl rounded-bl-none border border-zinc-200 bg-white px-4 py-3 text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
          <div
            className={`message-collapse-shell font-sans text-sm leading-relaxed ${isLong ? 'is-collapsible' : ''} ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}
            onTransitionEnd={handleTransitionEnd}
            style={isLong ? { height: bodyHeight } : undefined}
          >
            <div className="message-collapse-content" ref={bodyRef}>
              {isStreaming ? (
                <StreamingText content={message.content} />
              ) : (
                <Markdown components={markdownComponents} remarkPlugins={[remarkGfm]} urlTransform={citationUrlTransform}>
                  {markdownWithCitations}
                </Markdown>
              )}
            </div>
            {isLong && isCollapsed && <div aria-hidden="true" className="message-collapse-fade message-collapse-fade-ai" />}
          </div>
        </div>
        {ShowMoreBtn}
      </div>
    </div>
  )
}

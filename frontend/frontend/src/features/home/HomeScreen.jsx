import React, { useCallback, useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  createConversation,
  deleteConversation,
  deleteFile,
  getMessages,
  listConversations,
  listFiles,
  streamMessage,
  uploadFileWithProgress,
} from '../../services/chat'
import { useSmoothProgress } from '../../hooks/useSmoothProgress'
import { CONFIG } from '../../config'

function IconPlus() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" width="18">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg fill="none" height="15" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="15">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="18">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" width="20">
      <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
    </svg>
  )
}

function IconFile() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPdf() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 14h8M8 18h6" strokeLinecap="round" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="16">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
      <line strokeLinecap="round" x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" width="14">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconWeather() {
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  )
}

function IconRobot() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <rect height="10" rx="2" width="14" x="5" y="9" />
      <path d="M9 13h.01M15 13h.01" strokeLinecap="round" strokeWidth="2.5" />
      <path d="M12 9V6M10 6h4" strokeLinecap="round" />
      <path d="M5 14H3M21 14h-2" strokeLinecap="round" />
    </svg>
  )
}

function UserAvatar({ initial }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-slate-900 bg-blue-400 text-sm font-black uppercase text-slate-900"
      style={{ boxShadow: '2px 2px 0 rgb(15 23 42)' }}
    >
      {initial}
    </div>
  )
}

function BotAvatar() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-slate-900 bg-yellow-300 text-slate-900"
      style={{ boxShadow: '2px 2px 0 rgb(15 23 42)' }}
    >
      <IconRobot />
    </div>
  )
}

function Sidebar({ conversations, activeId, onSelect, onCreate, onDelete, collapsed, onToggle, loading }) {
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      await onCreate(newTitle.trim())
      setNewTitle('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-4 border-slate-900 bg-amber-300 text-slate-900 shadow-[4px_4px_0_rgb(15_23_42)] transition-[width] duration-200 dark:border-slate-300 dark:bg-amber-500 dark:text-slate-950 dark:shadow-[4px_4px_0_rgb(15_23_42)]"
      style={{ width: collapsed ? '52px' : '300px' }}
    >
      {/* Header row — always visible */}
      <div className="flex h-14 shrink-0 items-center border-b-4 border-slate-900 px-2 dark:border-slate-300">
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center border-4 border-slate-900 bg-white hover:bg-amber-100 dark:border-slate-300 dark:bg-slate-100 dark:hover:bg-white"
          onClick={onToggle}
          style={{ boxShadow: '2px 2px 0 rgb(15 23 42)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          type="button"
        >
          <IconMenu />
        </button>
        {!collapsed && (
          <span className="ml-3 truncate text-xs font-black uppercase tracking-[0.2em]">
            Conversations
          </span>
        )}
      </div>

      {/* Expanded content */}
      {!collapsed && (
        <>
          <form className="border-b-4 border-slate-900 p-3 dark:border-slate-300" onSubmit={handleCreate}>
            <input
              className="brutal-input mb-2 w-full text-sm"
              disabled={creating}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New conversation title..."
              value={newTitle}
            />
            <button
              className="brutal-button flex w-full items-center justify-center gap-2 text-sm"
              disabled={creating || !newTitle.trim()}
              type="submit"
            >
              <IconPlus />
              {creating ? 'Creating...' : 'New Chat'}
            </button>
          </form>

          <nav className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-xs font-bold uppercase text-slate-600 dark:text-slate-800">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-xs font-bold uppercase text-slate-600 dark:text-slate-800">No conversations yet.</p>
            ) : (
              conversations.map((conv) => (
                <div
                  className={`group flex cursor-pointer items-center justify-between border-b-2 border-slate-900 px-3 py-3 dark:border-slate-300 ${
                    activeId === conv.id ? 'bg-blue-500 text-white' : 'hover:bg-amber-200 dark:hover:bg-amber-400/80'
                  }`}
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                >
                  <span className="truncate text-xs font-black uppercase">{conv.title}</span>
                  <button
                    className="ml-2 shrink-0 opacity-0 hover:text-red-600 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id) }}
                    title="Delete"
                    type="button"
                  >
                    <IconTrash />
                  </button>
                </div>
              ))
            )}
          </nav>
        </>
      )}
    </aside>
  )
}

function MessageBubble({ message, userInitial, isStreaming }) {
  const isHuman = message.type === 'human'
  return (
    <div className={`flex items-end gap-2 ${isHuman ? 'justify-end' : 'justify-start'}`}>
      {!isHuman && <BotAvatar />}
      <div
        className={`max-w-[78%] border-4 border-slate-900 p-3 text-sm leading-relaxed ${
          isHuman
            ? 'bg-blue-500 text-white dark:border-blue-200 dark:bg-blue-700 dark:text-blue-50'
            : 'bg-white text-slate-900 dark:border-slate-300 dark:bg-slate-800 dark:text-slate-100'
        }`}
        style={{ boxShadow: '4px 4px 0 rgb(15 23 42)' }}
      >
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
          {isHuman ? 'You' : 'WeatherPocket AI'}
        </p>
        {isHuman ? (
          <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="markdown-body leading-relaxed">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-black">{children}</strong>,
                em:     ({ children }) => <em className="italic">{children}</em>,
                h1:     ({ children }) => <h1 className="text-lg font-black uppercase mt-2 mb-1">{children}</h1>,
                h2:     ({ children }) => <h2 className="text-base font-black uppercase mt-2 mb-1">{children}</h2>,
                h3:     ({ children }) => <h3 className="font-black uppercase mt-1 mb-1">{children}</h3>,
                ul:     ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                ol:     ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                li:     ({ children }) => <li>{children}</li>,
                code:   ({ inline, children }) =>
                  inline
                    ? <code className="rounded border-2 border-slate-300 bg-slate-100 px-1 font-mono text-xs dark:border-slate-500 dark:bg-slate-700">{children}</code>
                    : <pre className="my-2 overflow-x-auto border-4 border-slate-900 bg-slate-900 p-3 font-mono text-xs text-yellow-300 dark:border-slate-500 dark:bg-slate-950" style={{boxShadow:'3px 3px 0 rgb(15 23 42)'}}><code>{children}</code></pre>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-400 pl-3 italic opacity-80 my-2">{children}</blockquote>,
                a:      ({ href, children }) => <a className="underline font-black hover:opacity-70" href={href} target="_blank" rel="noreferrer">{children}</a>,
                hr:     () => <hr className="my-3 border-2 border-slate-900 dark:border-slate-300" />,
                table:  ({ children }) => <table className="border-collapse w-full text-xs my-2">{children}</table>,
                th:     ({ children }) => <th className="border-2 border-slate-900 bg-slate-100 px-2 py-1 font-black uppercase dark:border-slate-300 dark:bg-slate-700">{children}</th>,
                td:     ({ children }) => <td className="border-2 border-slate-900 px-2 py-1 dark:border-slate-300">{children}</td>,
              }}
            >
              {message.content}
            </Markdown>
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-slate-900 align-middle dark:bg-slate-200" />
            )}
          </div>
        )}
      </div>
      {isHuman && <UserAvatar initial={userInitial} />}
    </div>
  )
}

function ChatArea({
  conversation,
  messages,
  onSend,
  loadingMessages,
  sending,
  user,
  activeFileIds,
  fileMap,
  onRemoveActiveFile,
}) {
  const bottomRef = useRef(null)
  const [input, setInput] = useState('')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    await onSend(text, activeFileIds)
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-emerald-200 dark:bg-emerald-800/80">
        <div className="brutal-card bg-white text-center dark:bg-slate-800 dark:text-slate-100">
          <div className="flex justify-center"><IconWeather /></div>
          <h2 className="mt-4 text-2xl font-black uppercase">WeatherPocket AI</h2>
          <p className="mt-2 text-sm font-bold uppercase text-slate-500 dark:text-slate-300">
            Select or create a conversation to start.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden border-4 border-slate-900 bg-white text-slate-900 shadow-[4px_4px_0_rgb(15_23_42)] dark:border-slate-300 dark:bg-slate-900 dark:text-slate-100">
      <div className="border-b-4 border-slate-900 bg-slate-100 px-6 py-4 dark:border-slate-300 dark:bg-slate-800">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Active Chat</p>
        <h2 className="text-lg font-black uppercase">{conversation.title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-5 dark:bg-slate-950">
        {loadingMessages ? (
          <p className="text-center text-xs font-black uppercase text-slate-500 dark:text-slate-300">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs font-black uppercase text-slate-500 dark:text-slate-300">
            No messages yet. Say something!
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                userInitial={user?.fullname?.[0] ?? '?'}
                isStreaming={msg.streaming === true}
              />
            ))}
            {sending && messages[messages.length - 1]?.content === '' && (
              <div className="flex items-end gap-2 justify-start">
                <BotAvatar />
                <div
                  className="border-4 border-slate-900 bg-white px-4 py-3 text-xs font-black uppercase text-slate-500 dark:border-slate-300 dark:bg-slate-800 dark:text-slate-200"
                  style={{ boxShadow: '4px 4px 0 rgb(15 23 42)' }}
                >
                  AI is thinking...
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="border-t-4 border-slate-900 bg-slate-100 p-4 dark:border-slate-300 dark:bg-slate-800" onSubmit={handleSubmit}>
        {activeFileIds?.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            <span className="mr-1 self-center text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">RAG:</span>
            {activeFileIds.map((id) => (
              <button
                className="flex items-center gap-1 border-2 border-blue-700 bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-900 hover:bg-blue-200 dark:border-blue-300 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700"
                key={id}
                onClick={() => onRemoveActiveFile?.(id)}
                title="Remove file from RAG"
                type="button"
              >
                <IconPdf />
                <span className="max-w-28 truncate">{fileMap?.[id]?.file_name ?? id.slice(-6)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="brutal-input flex-1"
            disabled={sending}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the weather..."
            value={input}
          />
          <button
            className="brutal-button flex items-center justify-center gap-2 bg-blue-400"
            disabled={sending || !input.trim()}
            type="submit"
          >
            <IconSend />
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

// Normalize a conversation object so it always has .id regardless of whether
// the backend returned {id:"..."} or {_id:"..."}
function normalizeConv(conv) {
  if (!conv) return conv
  const id = conv.id ?? conv._id
  return { ...conv, id: String(id) }
}

function DocumentsPanel({ conversationId, activeFileIds, onToggleFile, onFilesChange }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [uploadStatus, setUploadStatus] = useState(null)
  const [targetProgress, setTargetProgress] = useState(0)
  const displayProgress = useSmoothProgress(targetProgress)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!conversationId) {
      setFiles([])
      onFilesChange?.([])
      return
    }
    setLoading(true)
    listFiles(conversationId)
      .then((loadedFiles) => {
        setFiles(loadedFiles)
        onFilesChange?.(loadedFiles)
      })
      .catch(() => {
        setFiles([])
        onFilesChange?.([])
      })
      .finally(() => setLoading(false))
  }, [conversationId])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    setUploadStatus(null)
    setTargetProgress(0)
    try {
      const result = await uploadFileWithProgress(conversationId, file, (event) => {
        if (event.type === 'progress') {
          setTargetProgress(event.progress || 0)
          setUploadStatus(event)
        }
      })
      const newFiles = [result]
      setFiles((prev) => {
        const updated = [result, ...prev]
        onFilesChange?.(updated)
        return updated
      })
      setUploadStatus(null)
      setTargetProgress(0)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (fileId) => {
    try {
      await deleteFile(conversationId, fileId)
      setFiles((prev) => {
        const updated = prev.filter((f) => f.file_id !== fileId)
        onFilesChange?.(updated)
        return updated
      })
      // Also remove from active if it was selected
      if (activeFileIds.includes(fileId)) onToggleFile(fileId)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!conversationId) return null

  return (
    <aside
      className="hidden h-full w-72 shrink-0 flex-col border-4 border-slate-900 bg-emerald-300 text-slate-900 shadow-[4px_4px_0_rgb(15_23_42)] lg:flex dark:border-slate-300 dark:bg-emerald-700 dark:text-emerald-50"
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b-4 border-slate-900 px-3 dark:border-slate-300">
        <span className="text-xs font-black uppercase tracking-[0.2em]">Documents</span>
        <button
          className="flex h-8 w-8 items-center justify-center border-4 border-slate-900 bg-white hover:bg-emerald-100 disabled:opacity-50 dark:border-slate-300 dark:bg-slate-100 dark:hover:bg-white"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          style={{ boxShadow: '2px 2px 0 rgb(15 23 42)' }}
          title="Upload PDF"
          type="button"
        >
          {uploading ? (
            <span className="text-[10px] font-black">…</span>
          ) : (
            <IconUpload />
          )}
        </button>
        <input
          accept=".pdf"
          className="hidden"
          onChange={handleUpload}
          ref={fileInputRef}
          type="file"
        />
      </div>

      {/* Upload progress indicator */}
      {uploadStatus && (
        <div className="border-b-2 border-blue-700 bg-blue-100 px-3 py-2 dark:border-blue-300 dark:bg-blue-900/70">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[9px] font-black uppercase text-blue-900 dark:text-blue-100">
              {uploadStatus.message}
            </div>
            {CONFIG.DEBUG_UPLOAD_PROGRESS && (
              <div className="text-[8px] font-mono text-blue-700 dark:text-blue-200">
                Raw: {uploadStatus.progress}% | Stage: {uploadStatus.stage}
              </div>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden border-2 border-blue-700 bg-white dark:border-blue-300 dark:bg-slate-200">
            <div
              className="h-full bg-blue-700 transition-all duration-500 dark:bg-blue-300"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-[8px] font-bold text-blue-900 dark:text-blue-100">
              {uploadStatus.meta && uploadStatus.meta.completed && uploadStatus.meta.total
                ? `${uploadStatus.meta.completed}/${uploadStatus.meta.total}`
                : `${displayProgress}% complete`}
            </div>
            {CONFIG.DEBUG_UPLOAD_PROGRESS && (
              <div className="text-[7px] text-blue-700 dark:text-blue-200">
                Display: {displayProgress}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search box */}
      <div className="border-b-2 border-slate-900 bg-white/70 px-3 py-2 dark:border-slate-300 dark:bg-slate-900/40">
        <input
          className="w-full border-2 border-slate-900 bg-white px-2 py-1 text-[10px] font-bold placeholder-slate-500 focus:outline-none dark:border-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-400"
          onChange={(e) => setSearch(e.target.value.toLowerCase())}
          placeholder="Search PDFs..."
          style={{ boxShadow: '1px 1px 0 rgb(15 23 42)' }}
          type="text"
          value={search}
        />
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="border-b-2 border-red-500 bg-red-100 px-3 py-2 text-[10px] font-black uppercase text-red-700 dark:bg-red-900/70 dark:text-red-100">
            {error}
          </p>
        )}
        {loading ? (
          <p className="p-4 text-[10px] font-black uppercase text-slate-600 dark:text-emerald-100">Loading...</p>
        ) : files.length === 0 ? (
          <p className="p-4 text-[10px] font-black uppercase text-slate-600 dark:text-emerald-100">
            No PDFs yet. Upload one to enable RAG.
          </p>
        ) : (
          files.filter(f => f.file_name.toLowerCase().includes(search)).map((f) => {
            const active = activeFileIds.includes(f.file_id)
            return (
              <div
                className={`group flex items-center gap-2 border-b-2 border-slate-900 px-3 py-3 dark:border-slate-300 ${
                  active ? 'bg-blue-500 text-white dark:bg-blue-700' : 'hover:bg-emerald-200 dark:hover:bg-emerald-600/70'
                }`}
                key={f.file_id}
              >
                {/* PDF icon */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                  <IconPdf />
                </div>

                {/* Toggle button */}
                <button
                  className={`flex h-7 w-7 shrink-0 items-center justify-center border-4 border-slate-900 dark:border-slate-300 ${
                    active ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-white hover:bg-blue-200 dark:bg-slate-100 dark:hover:bg-blue-200'
                  }`}
                  onClick={() => onToggleFile(f.file_id)}
                  style={{ boxShadow: '2px 2px 0 rgb(15 23 42)' }}
                  title={active ? 'Remove from RAG' : 'Add to RAG'}
                  type="button"
                >
                  {active ? <IconCheck /> : <IconPlus />}
                </button>

                {/* File info */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[11px] font-black uppercase">{f.file_name}</span>
                  <span className="text-[9px] font-bold text-slate-600 dark:text-emerald-100">{f.chunks} chunks</span>
                </div>

                {/* Delete */}
                <button
                  className="shrink-0 opacity-0 hover:text-red-600 group-hover:opacity-100"
                  onClick={() => handleDelete(f.file_id)}
                  title="Delete file"
                  type="button"
                >
                  <IconTrash />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Active count badge at bottom */}
      {activeFileIds.length > 0 && (
        <div className="border-t-4 border-slate-900 bg-blue-500 px-3 py-2 text-white dark:border-slate-300 dark:bg-blue-700">
          <p className="text-[10px] font-black uppercase">
            {activeFileIds.length} file{activeFileIds.length > 1 ? 's' : ''} active for RAG
          </p>
        </div>
      )}
    </aside>
  )
}

export default function HomeScreen({ user, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [activeFileIds, setActiveFileIds] = useState([])
  const [filesMap, setFilesMap] = useState({})

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listConversations()
        setConversations((data.conversations ?? data).map(normalizeConv))
      } catch (err) {
        console.error('Failed to load conversations:', err)
      } finally {
        setLoadingConvs(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!activeConversation?.id) return
    const load = async () => {
      setLoadingMessages(true)
      setMessages([])
      try {
        const data = await getMessages(activeConversation.id)
        setMessages(data.messages ?? [])
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        setLoadingMessages(false)
      }
    }
    load()
  }, [activeConversation?.id])

  const handleCreateConversation = async (title) => {
    try {
      const conv = normalizeConv(await createConversation(title))
      setConversations((prev) => [conv, ...prev])
      setActiveConversation(conv)
    } catch (err) {
      console.error('Failed to create conversation:', err)
    }
  }

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConversation?.id === id) {
        setActiveConversation(null)
        setMessages([])
        setActiveFileIds([])
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  const handleSend = async (content, fileIds = []) => {
    const convId = activeConversation?.id
    if (!convId) return

    // 1. Append the human message
    setMessages((prev) => [...prev, { type: 'human', content }])
    setSending(true)

    // 2. Append an empty AI placeholder — it will fill up token by token
    setMessages((prev) => [...prev, { type: 'ai', content: '', streaming: true }])

    try {
      for await (const chunk of streamMessage(convId, content, fileIds)) {
        setSending(false)  // first token arrived — hide "thinking" indicator
        setMessages((prev) => {
          const msgs = [...prev]
          const last = msgs[msgs.length - 1]
          msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
          return msgs
        })
      }
    } catch (err) {
      setMessages((prev) => {
        const msgs = [...prev]
        msgs[msgs.length - 1] = { type: 'ai', content: `Error: ${err.message}`, streaming: false }
        return msgs
      })
    } finally {
      // Mark streaming done (removes blinking cursor)
      setMessages((prev) => {
        const msgs = [...prev]
        if (msgs.length > 0 && msgs[msgs.length - 1].type === 'ai') {
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], streaming: false }
        }
        return msgs
      })
      setSending(false)
      // Bump conversation to top of list
      setConversations((prev) => {
        const hit = prev.find((c) => c.id === convId)
        return hit ? [hit, ...prev.filter((c) => c.id !== convId)] : prev
      })
    }
  }

  const handleFilesChange = useCallback((files) => {
    const map = {}
    files.forEach((f) => {
      map[f.file_id] = f
    })
    setFilesMap(map)
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex shrink-0 items-center justify-between border-b-4 border-slate-900 bg-black px-4 py-3 text-white dark:border-slate-300">
        <div className="flex items-center gap-3">
          <IconWeather />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">WeatherPocket</p>
            <p className="text-sm font-black uppercase">{user?.fullname ?? 'Workspace'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-xs font-bold text-slate-300 md:block">{user?.email}</span>
          <button
            className="brutal-button bg-red-500 text-black hover:bg-red-400"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-2 overflow-hidden p-2">
        <Sidebar
          activeId={activeConversation?.id}
          collapsed={sidebarCollapsed}
          conversations={conversations}
          loading={loadingConvs}
          onCreate={handleCreateConversation}
          onDelete={handleDeleteConversation}
          onSelect={(conv) => { setActiveConversation(normalizeConv(conv)); setActiveFileIds([]) }}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
        <div className="min-w-0 flex-1">
          <ChatArea
            conversation={activeConversation}
            fileMap={filesMap}
            loadingMessages={loadingMessages}
            messages={messages}
            onRemoveActiveFile={(id) =>
              setActiveFileIds((prev) => prev.filter((x) => x !== id))
            }
            onSend={handleSend}
            sending={sending}
            user={user}
            activeFileIds={activeFileIds}
          />
        </div>
        <DocumentsPanel
          conversationId={activeConversation?.id}
          activeFileIds={activeFileIds}
          onToggleFile={(id) =>
            setActiveFileIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          onFilesChange={handleFilesChange}
        />
      </div>
    </div>
  )
}
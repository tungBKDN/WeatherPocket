import { useEffect, useRef, useState } from 'react'
import { IconBot, IconSend, IconSun, IconPdf, IconPlus, IconCheck, IconTrash } from './Icons'
import MessageBubble from './MessageBubble'
import { deleteFile, uploadFileWithProgress } from '../services/chat'
import { useSmoothProgress } from '../hooks/useSmoothProgress'

export default function ChatArea({
  conversation,
  messages,
  onSend,
  loadingMessages,
  sending,
  activeFileIds,
  fileMap,
  onToggleActiveFile,
  onRemoveActiveFile,
  onInlineFileUploaded,
  onInlineFileDeleted,
}) {
  const bottomRef = useRef(null)
  const popoverRef = useRef(null)
  const fileBadgeRef = useRef(null)
  const fileInputRef = useRef(null)
  const [input, setInput] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isFilePopoverOpen, setIsFilePopoverOpen] = useState(false)
  const [inlineUploading, setInlineUploading] = useState(false)
  const [inlineUploadLabel, setInlineUploadLabel] = useState('')
  const [inlineUploadTarget, setInlineUploadTarget] = useState(0)
  const [inlineUploadError, setInlineUploadError] = useState('')
  const inlineUploadProgress = useSmoothProgress(inlineUploadTarget)
  const availableFiles = Object.values(fileMap ?? {})

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target
      if (popoverRef.current?.contains(target) || fileBadgeRef.current?.contains(target)) return
      setIsFilePopoverOpen(false)
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsFilePopoverOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    await onSend(text, activeFileIds)
  }

  const handleInlineUpload = async (e) => {
    const files = Array.from(e.target.files ?? [])
    if (!conversation?.id || files.length === 0 || inlineUploading) return

    setInlineUploading(true)
    setInlineUploadError('')
    setInlineUploadLabel('Preparing upload...')
    setInlineUploadTarget(0)

    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]
        await uploadFileWithProgress(conversation.id, file, (event) => {
          if (event.type !== 'progress') return
          const part = (event.progress || 0) / 100
          const overall = Math.round(((i + part) / files.length) * 100)
          setInlineUploadTarget(overall)
          setInlineUploadLabel(event.message || `Uploading ${file.name}`)
        })
          .then((result) => {
            onInlineFileUploaded?.(result)
          })
      }

      setInlineUploadTarget(100)
      setInlineUploadLabel(files.length > 1 ? `${files.length} files uploaded` : 'File uploaded')

      window.setTimeout(() => {
        setInlineUploadLabel('')
        setInlineUploadTarget(0)
      }, 900)
    } catch (err) {
      setInlineUploadError(err.message || 'Failed to upload file')
      setInlineUploadLabel('')
      setInlineUploadTarget(0)
    } finally {
      setInlineUploading(false)
      e.target.value = ''
    }
  }

  const handleInlineDelete = async (fileId) => {
    if (!conversation?.id || inlineUploading) return
    try {
      await deleteFile(conversation.id, fileId)
      onInlineFileDeleted?.(fileId)
      setInlineUploadError('')
    } catch (err) {
      setInlineUploadError(err.message || 'Failed to delete file')
    }
  }

  if (!conversation) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center px-8">
          <div className="flex justify-center mb-4 text-yellow-400 dark:text-yellow-500">
            <IconSun />
          </div>
          <h2 className="font-sans text-3xl font-medium text-zinc-900 dark:text-zinc-100">WeatherPocket AI</h2>
          <p className="mt-3 font-sans text-sm text-zinc-500 dark:text-zinc-400">
            Select or create a conversation to start.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-r border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Chat header */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="font-sans text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Chat</span>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <h2 className="truncate font-sans text-sm font-medium">{conversation.title}</h2>
      </div>

      {/* Scrollable message area */}
      <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {loadingMessages ? (
          <p className="text-center py-12 font-sans text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center py-12 font-sans text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">
            No messages yet. Say something!
          </p>
        ) : (
          <div className="mx-auto w-full max-w-3xl">
            {messages.map((msg, i) => (
              (sending && i === messages.length - 1 && msg.type === 'ai' && msg.streaming === true && !msg.content)
                ? null
                : (
                  <MessageBubble
                    key={i}
                    isStreaming={msg.streaming === true}
                    message={msg}
                  />
                )
            ))}
            {sending && messages[messages.length - 1]?.content === '' && (
              <div className="mb-6 flex justify-start gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  <IconBot />
                </div>
                <div className="rounded-2xl rounded-bl-none border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
                    <span className="font-sans text-sm">Thinking</span>
                    <span aria-hidden="true" className="typing-dots"><span /><span /><span /></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area pinned by flex layout, not absolute positioning */}
      <form
        className={`relative shrink-0 bg-white/72 px-4 pb-5 pt-5 backdrop-blur-2xl transition-transform duration-200 shadow-[0_-22px_56px_16px_rgba(255,255,255,0.94)] dark:bg-zinc-950/76 dark:shadow-[0_-24px_62px_18px_rgba(9,9,11,0.96)] ${
          isInputFocused ? 'chat-input-dock-up' : 'chat-input-dock-down'
        }`}
        onSubmit={handleSubmit}
      >
        <div aria-hidden="true" className="chat-input-seam pointer-events-none absolute -top-14 inset-x-0 h-16" />
        <div className="mx-auto w-full max-w-3xl">
          <input
            accept=".pdf,application/pdf"
            className="hidden"
            multiple
            onChange={handleInlineUpload}
            ref={fileInputRef}
            type="file"
          />

          {activeFileIds?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {activeFileIds.map((id) => {
                const file = fileMap?.[id]
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 font-sans text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <span className="text-zinc-400 dark:text-zinc-500"><IconPdf /></span>
                    <span className="max-w-28 truncate">{file?.file_name ?? id.slice(-6)}</span>
                    <button
                      className="ml-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-600 dark:hover:text-zinc-200"
                      onClick={() => onRemoveActiveFile?.(id)}
                      title="Remove from context"
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          <div className="relative mt-1">
            <button
              aria-expanded={isFilePopoverOpen}
              aria-label="Open files menu"
              className={`absolute left-2 top-0 z-20 inline-flex items-center gap-1.5 -translate-y-1/2 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isFilePopoverOpen
                  ? 'bg-yellow-500 text-white border-yellow-500 shadow-[0_6px_18px_rgba(234,179,8,0.35)] dark:bg-yellow-500 dark:border-yellow-500'
                  : 'bg-yellow-100 text-zinc-900 border-yellow-300 hover:-translate-y-[55%] hover:bg-yellow-200 dark:bg-yellow-500 dark:border-yellow-500/60 dark:text-yellow-900 dark:hover:bg-yellow-500'
              }`}
              onClick={() => setIsFilePopoverOpen((v) => !v)}
              ref={fileBadgeRef}
              type="button"
            >
              <IconPlus />
              <span>FILE</span>
            </button>

            <div
              className={`absolute bottom-[calc(100%+0.65rem)] left-0 z-30 w-76 rounded-2xl border border-zinc-200 bg-white/96 p-3 shadow-2xl backdrop-blur-xl will-change-transform dark:border-zinc-700 dark:bg-zinc-900/96 ${
                isFilePopoverOpen ? 'chat-file-popover-open pointer-events-auto' : 'chat-file-popover-closed pointer-events-none'
              }`}
              ref={popoverRef}
            >
              <p className="mb-2 px-1 font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">Files In Conversation</p>

              <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                {availableFiles.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-2 font-sans text-[11px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    No files yet. Add a document below.
                  </p>
                ) : (
                  availableFiles.map((file) => {
                    const active = activeFileIds.includes(file.file_id)
                    return (
                      <div
                        className={`flex items-center gap-1 rounded-xl px-1 py-1 transition-all duration-200 ${
                          active
                            ? 'bg-yellow-50 dark:bg-amber-700/25'
                            : 'bg-zinc-50 dark:bg-zinc-800/70'
                        }`}
                        key={file.file_id}
                      >
                        <button
                          className={`flex min-w-0 flex-1 items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors ${
                            active
                              ? 'text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                          onClick={() => onToggleActiveFile?.(file.file_id)}
                          type="button"
                        >
                          <span className="flex min-w-0 items-center gap-1.5 pr-2 font-sans text-xs">
                            <span className="text-red-500 dark:text-red-400"><IconPdf /></span>
                            <span className="truncate">{file.file_name}</span>
                          </span>
                          <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${active ? 'bg-yellow-500 text-white dark:bg-amber-600' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'}`}>
                            {active ? <IconCheck /> : '+'}
                          </span>
                        </button>
                        <button
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          onClick={() => handleInlineDelete(file.file_id)}
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

              <div className="my-3 h-px bg-zinc-200 dark:bg-zinc-700" />

              <button
                className={`w-full rounded-xl border px-3 py-2 font-sans text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  inlineUploading
                    ? 'chat-file-chip-uploading'
                    : 'border-zinc-300 bg-zinc-100 text-zinc-800 hover:-translate-y-0.5 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700'
                }`}
                disabled={inlineUploading}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Add Documents
              </button>

              {(inlineUploading || inlineUploadLabel) && (
                <div className="mt-2">
                  <p className="mb-1 truncate font-sans text-[10px] text-zinc-500 dark:text-zinc-400">{inlineUploadLabel || 'Uploading...'}</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="chat-upload-progress h-full rounded-full bg-yellow-500 dark:bg-amber-600"
                      style={{ width: `${inlineUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {inlineUploadError && (
                <p className="mt-2 font-sans text-[11px] font-medium text-red-600 dark:text-red-400">{inlineUploadError}</p>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-zinc-200/90 bg-white/95 px-4 py-3 shadow-xl shadow-zinc-200/70 focus-within:ring-2 focus-within:ring-yellow-500/40 dark:border-yellow-500/45 dark:bg-zinc-900/94 dark:shadow-black/45 dark:focus-within:ring-yellow-500/35">
            <input
              className="flex-1 bg-transparent font-sans text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-zinc-100 dark:placeholder-zinc-500"
              disabled={sending}
              onBlur={() => setIsInputFocused(false)}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
              placeholder="Ask about the weather..."
              value={input}
            />
            <button
              className={`shrink-0 transition-colors ${
                sending || !input.trim()
                  ? 'cursor-not-allowed text-zinc-300 dark:text-zinc-700'
                  : 'text-yellow-600 hover:text-yellow-700 dark:text-amber-500 dark:hover:text-amber-400'
              }`}
              disabled={sending || !input.trim()}
              type="submit"
            >
              <IconSend />
            </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
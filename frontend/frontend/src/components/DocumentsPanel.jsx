import { useEffect, useRef, useState } from 'react'
import { IconUpload, IconPdfLarge, IconCheck, IconTrash } from './Icons'
import { listFiles, uploadFileWithProgress, deleteFile } from '../services/chat'
import { useSmoothProgress } from '../hooks/useSmoothProgress'
import { CONFIG } from '../config'

export default function DocumentsPanel({
  conversationId,
  activeFileIds,
  onToggleFile,
  onFilesChange,
  refreshKey = 0,
  collapsed = false,
  onToggleCollapse,
}) {
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
  }, [conversationId, refreshKey])

  const handleUpload = async (e) => {
    const filesToUpload = Array.from(e.target.files ?? [])
    if (filesToUpload.length === 0) return
    setError('')
    setUploading(true)
    setUploadStatus(null)
    setTargetProgress(0)
    try {
      const uploaded = []
      for (let i = 0; i < filesToUpload.length; i += 1) {
        const file = filesToUpload[i]
        const result = await uploadFileWithProgress(conversationId, file, (event) => {
          if (event.type === 'progress') {
            const part = (event.progress || 0) / 100
            const overall = Math.round(((i + part) / filesToUpload.length) * 100)
            setTargetProgress(overall)
            setUploadStatus({
              ...event,
              progress: overall,
              message: `Uploading ${file.name}`,
            })
          }
        })
        uploaded.push(result)
      }

      setFiles((prev) => {
        const updated = [...uploaded.reverse(), ...prev]
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
      if (activeFileIds.includes(fileId)) onToggleFile(fileId)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!conversationId) return null

  return (
    <aside className={`flex h-full shrink-0 flex-col overflow-hidden border-l border-zinc-200 bg-zinc-50 text-zinc-900 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 max-lg:hidden ${collapsed ? 'w-14' : 'w-80'}`}>
      {/* Header */}
      <div className={`flex h-14 shrink-0 items-center border-b border-zinc-200 px-3 dark:border-zinc-800 ${collapsed ? 'justify-center' : 'justify-between px-4'}`}>
        {!collapsed && <span className="font-sans text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Documents</span>}
        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              title="Upload PDF"
              type="button"
            >
              {uploading ? <span className="text-[10px] font-bold">…</span> : <IconUpload />}
            </button>
          )}
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand documents' : 'Collapse documents'}
            type="button"
          >
            <span className="font-sans text-sm leading-none">{collapsed ? '◀' : '▶'}</span>
          </button>
        </div>
        <input accept=".pdf,application/pdf" className="hidden" multiple onChange={handleUpload} ref={fileInputRef} type="file" />
      </div>

      {!collapsed && uploadStatus && (
        <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-sans text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {uploadStatus.message}
            </div>
            {CONFIG.DEBUG_UPLOAD_PROGRESS && (
              <div className="font-mono text-[8px] text-zinc-500 dark:text-zinc-400">
                Raw: {uploadStatus.progress}% | Stage: {uploadStatus.stage}
              </div>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-700">
            <div
              className="h-full bg-yellow-500 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-amber-600"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="font-sans text-[9px] text-zinc-600 dark:text-zinc-400">
              {uploadStatus.meta?.completed && uploadStatus.meta?.total
                ? `${uploadStatus.meta.completed}/${uploadStatus.meta.total}`
                : `${displayProgress}% complete`}
            </div>
            {CONFIG.DEBUG_UPLOAD_PROGRESS && (
              <div className="font-mono text-[7px] text-zinc-500 dark:text-zinc-400">
                Display: {displayProgress}%
              </div>
            )}
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="shrink-0 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
        <input
          className="w-full rounded-md bg-zinc-100 px-3 py-2 font-sans text-xs text-zinc-900 placeholder-zinc-400 outline-none dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          onChange={(e) => setSearch(e.target.value.toLowerCase())}
          placeholder="Search documents..."
          type="text"
          value={search}
        />
        </div>
      )}

      {!collapsed && (
        <div className="no-scrollbar flex-1 overflow-y-auto">
        {error && (
          <p className="border-b border-red-300 bg-red-50 px-4 py-2 font-sans text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}
        {loading ? (
          <p className="p-4 font-sans text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Loading...</p>
        ) : files.length === 0 ? (
          <p className="p-4 font-sans text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
            No PDFs yet. Upload one to enable RAG.
          </p>
        ) : (
          files.filter((f) => f.file_name.toLowerCase().includes(search)).map((f) => {
            const active = activeFileIds.includes(f.file_id)
            return (
              <div
                className={`group flex items-center gap-3 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 transition-colors ${
                  active ? 'bg-yellow-50 dark:bg-yellow-500/5' : 'bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                }`}
                key={f.file_id}
              >
                {/* Clickable PDF icon — red, large, with yellow checkmark badge when active */}
                <button
                  className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105"
                  onClick={() => onToggleFile(f.file_id)}
                  title={active ? 'Remove from context' : 'Add to context'}
                  type="button"
                >
                  <span className="text-red-500 dark:text-red-400">
                    <IconPdfLarge />
                  </span>
                  {active && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-white shadow-sm dark:bg-amber-600 dark:text-white">
                      <IconCheck />
                    </span>
                  )}
                </button>

                {/* File info */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-sans text-xs font-medium tracking-wide">{f.file_name}</span>
                  <span className="font-sans text-[10px] text-zinc-500 dark:text-zinc-400">{f.chunks} chunks</span>
                </div>

                {/* Delete */}
                <button
                  className="shrink-0 opacity-0 text-zinc-400 hover:text-red-500 group-hover:opacity-100 dark:text-zinc-500 dark:hover:text-red-400"
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
      )}

      {/* Active count badge at bottom */}
      {!collapsed && activeFileIds.length > 0 && (
        <div className="border-t border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-amber-700/30 dark:bg-amber-700/20">
          <p className="font-sans text-xs font-medium text-yellow-700 dark:text-white">
            {activeFileIds.length} file{activeFileIds.length > 1 ? 's' : ''} in context
          </p>
        </div>
      )}
    </aside>
  )
}

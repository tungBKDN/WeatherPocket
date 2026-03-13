import { useCallback, useEffect, useState } from 'react'
import {
  createConversation,
  deleteConversation,
  getMessages,
  listConversations,
  streamMessage,
} from '../../services/chat'
import AdBanner from '../../components/AdBanner'
import Sidebar from '../../components/Sidebar'
import ChatArea from '../../components/ChatArea'
import DocumentsPanel from '../../components/DocumentsPanel'
import { IconSun } from '../../components/Icons'

// Normalize a conversation object so it always has .id regardless of whether
// the backend returned {id:"..."} or {_id:"..."}
function normalizeConv(conv) {
  if (!conv) return conv
  const id = conv.id ?? conv._id
  return { ...conv, id: String(id) }
}

export default function HomeScreen({ user, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [documentsCollapsed, setDocumentsCollapsed] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [activeFileIds, setActiveFileIds] = useState([])
  const [filesMap, setFilesMap] = useState({})
  const [filesRefreshToken, setFilesRefreshToken] = useState(0)

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

    setMessages((prev) => [...prev, { type: 'human', content }])
    setSending(true)
    setMessages((prev) => [...prev, { type: 'ai', content: '', streaming: true }])

    try {
      for await (const chunk of streamMessage(convId, content, fileIds)) {
        setSending(false)
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
      setMessages((prev) => {
        const msgs = [...prev]
        if (msgs.length > 0 && msgs[msgs.length - 1].type === 'ai') {
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], streaming: false }
        }
        return msgs
      })
      setSending(false)
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

  const handleInlineFileUploaded = useCallback((file) => {
    if (!file?.file_id) return
    setFilesMap((prev) => ({ ...prev, [file.file_id]: file }))
    setActiveFileIds((prev) => (prev.includes(file.file_id) ? prev : [...prev, file.file_id]))
    setFilesRefreshToken((prev) => prev + 1)
  }, [])

  const handleInlineFileDeleted = useCallback((fileId) => {
    if (!fileId) return
    setFilesMap((prev) => {
      const next = { ...prev }
      delete next[fileId]
      return next
    })
    setActiveFileIds((prev) => prev.filter((x) => x !== fileId))
    setFilesRefreshToken((prev) => prev + 1)
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <span className="text-yellow-500 dark:text-amber-500"><IconSun /></span>
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-yellow-600 dark:text-amber-500">WeatherPocket</p>
            <p className="font-sans text-sm font-medium">{user?.fullname ?? 'Workspace'}</p>
          </div>
        </div>
        <div className="hidden flex-1 items-center justify-center px-4 md:flex">
          {/* <AdBanner /> */}
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden font-sans text-xs text-zinc-500 dark:text-zinc-400 md:block">{user?.email}</span>
          <button
            className="editorial-button"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
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
        <ChatArea
          conversation={activeConversation}
          fileMap={filesMap}
          loadingMessages={loadingMessages}
          messages={messages}
          onToggleActiveFile={(id) =>
            setActiveFileIds((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          onRemoveActiveFile={(id) =>
            setActiveFileIds((prev) => prev.filter((x) => x !== id))
          }
          onInlineFileDeleted={handleInlineFileDeleted}
          onInlineFileUploaded={handleInlineFileUploaded}
          onSend={handleSend}
          sending={sending}
          activeFileIds={activeFileIds}
        />
        <DocumentsPanel
          conversationId={activeConversation?.id}
          collapsed={documentsCollapsed}
          activeFileIds={activeFileIds}
          refreshKey={filesRefreshToken}
          onToggleCollapse={() => setDocumentsCollapsed((v) => !v)}
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
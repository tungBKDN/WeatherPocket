import { useEffect, useRef, useState } from 'react'
import {
  createConversation,
  deleteConversation,
  getMessages,
  listConversations,
  sendMessage,
} from '../../services/chat'

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

function IconWeather() {
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
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
      className="relative flex shrink-0 flex-col border-r-4 border-slate-900 bg-yellow-300 transition-[width] duration-200"
      style={{ width: collapsed ? '52px' : '300px' }}
    >
      {/* Header row — always visible */}
      <div className="flex h-14 shrink-0 items-center border-b-4 border-slate-900 px-2">
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center border-4 border-slate-900 bg-white hover:bg-yellow-200"
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
          <form className="border-b-4 border-slate-900 p-3" onSubmit={handleCreate}>
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
              <p className="p-4 text-xs font-bold uppercase text-slate-500">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-xs font-bold uppercase text-slate-500">No conversations yet.</p>
            ) : (
              conversations.map((conv) => (
                <div
                  className={`group flex cursor-pointer items-center justify-between border-b-2 border-slate-900 px-3 py-3 ${
                    activeId === conv.id ? 'bg-blue-400' : 'hover:bg-yellow-200'
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

function MessageBubble({ message }) {
  const isHuman = message.type === 'human'
  return (
    <div className={`flex ${isHuman ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] border-4 border-slate-900 p-3 text-sm font-bold ${
          isHuman ? 'bg-blue-400 text-slate-900' : 'bg-white text-slate-900'
        }`}
        style={{ boxShadow: '4px 4px 0 rgb(15 23 42)' }}
      >
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
          {isHuman ? 'You' : 'WeatherPocket AI'}
        </p>
        <p className="leading-relaxed">{message.content}</p>
      </div>
    </div>
  )
}

function ChatArea({ conversation, messages, onSend, loadingMessages, sending }) {
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
    await onSend(text)
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-lime-300">
        <div className="brutal-card bg-white text-center">
          <div className="flex justify-center"><IconWeather /></div>
          <h2 className="mt-4 text-2xl font-black uppercase">WeatherPocket AI</h2>
          <p className="mt-2 text-sm font-bold uppercase text-slate-500">
            Select or create a conversation to start.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b-4 border-slate-900 bg-white px-6 py-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Active Chat</p>
        <h2 className="text-lg font-black uppercase">{conversation.title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-50 p-6">
        {loadingMessages ? (
          <p className="text-center text-xs font-black uppercase text-slate-400">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs font-black uppercase text-slate-400">
            No messages yet. Say something!
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {sending && (
              <div className="flex justify-start">
                <div
                  className="border-4 border-slate-900 bg-white px-4 py-3 text-xs font-black uppercase text-slate-400"
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

      <form className="border-t-4 border-slate-900 bg-white p-4" onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <input
            className="brutal-input flex-1"
            disabled={sending}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the weather..."
            value={input}
          />
          <button
            className="brutal-button flex items-center gap-2 bg-blue-400"
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

export default function HomeScreen({ user, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listConversations()
        setConversations(data.conversations ?? data)
      } catch (err) {
        console.error('Failed to load conversations:', err)
      } finally {
        setLoadingConvs(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!activeConversation) return
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
  }, [activeConversation])

  const handleCreateConversation = async (title) => {
    try {
      const conv = await createConversation(title)
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
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  const handleSend = async (content) => {
    setMessages((prev) => [...prev, { type: 'human', content }])
    setSending(true)
    try {
      const data = await sendMessage(activeConversation.id, content)
      setMessages((prev) => [...prev, { type: 'ai', content: data.reply }])
      setConversations((prev) => {
        const hit = prev.find((c) => c.id === activeConversation.id)
        return hit ? [hit, ...prev.filter((c) => c.id !== activeConversation.id)] : prev
      })
    } catch (err) {
      setMessages((prev) => [...prev, { type: 'ai', content: `Error: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b-4 border-slate-900 bg-black px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <IconWeather />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">WeatherPocket</p>
            <p className="text-sm font-black uppercase">{user?.fullname ?? 'Workspace'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-xs font-bold text-slate-400 md:block">{user?.email}</span>
          <button
            className="brutal-button bg-red-500 text-black hover:bg-red-400"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeId={activeConversation?.id}
          collapsed={sidebarCollapsed}
          conversations={conversations}
          loading={loadingConvs}
          onCreate={handleCreateConversation}
          onDelete={handleDeleteConversation}
          onSelect={setActiveConversation}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
        <ChatArea
          conversation={activeConversation}
          loadingMessages={loadingMessages}
          messages={messages}
          onSend={handleSend}
          sending={sending}
        />
      </div>
    </div>
  )
}
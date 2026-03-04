import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  createConversation,
  deleteConversation,
  getMessages,
  listConversations,
  streamMessage,
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

function MessageBubble({ message, userInitial, isStreaming }) {
  const isHuman = message.type === 'human'
  return (
    <div className={`flex items-end gap-2 ${isHuman ? 'justify-end' : 'justify-start'}`}>
      {!isHuman && <BotAvatar />}
      <div
        className={`max-w-[70%] border-4 border-slate-900 p-3 text-sm font-bold ${
          isHuman ? 'bg-blue-400 text-slate-900' : 'bg-white text-slate-900'
        }`}
        style={{ boxShadow: '4px 4px 0 rgb(15 23 42)' }}
      >
        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
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
                    ? <code className="bg-slate-100 border-2 border-slate-300 px-1 font-mono text-xs rounded">{children}</code>
                    : <pre className="bg-slate-900 text-yellow-300 p-3 my-2 overflow-x-auto font-mono text-xs border-4 border-slate-900" style={{boxShadow:'3px 3px 0 rgb(15 23 42)'}}><code>{children}</code></pre>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-400 pl-3 italic opacity-80 my-2">{children}</blockquote>,
                a:      ({ href, children }) => <a className="underline font-black hover:opacity-70" href={href} target="_blank" rel="noreferrer">{children}</a>,
                hr:     () => <hr className="border-2 border-slate-900 my-3" />,
                table:  ({ children }) => <table className="border-collapse w-full text-xs my-2">{children}</table>,
                th:     ({ children }) => <th className="border-2 border-slate-900 px-2 py-1 bg-slate-100 font-black uppercase">{children}</th>,
                td:     ({ children }) => <td className="border-2 border-slate-900 px-2 py-1">{children}</td>,
              }}
            >
              {message.content}
            </Markdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-slate-900 ml-0.5 align-middle animate-pulse" />
            )}
          </div>
        )}
      </div>
      {isHuman && <UserAvatar initial={userInitial} />}
    </div>
  )
}

function ChatArea({ conversation, messages, onSend, loadingMessages, sending, user }) {
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

// Normalize a conversation object so it always has .id regardless of whether
// the backend returned {id:"..."} or {_id:"..."}
function normalizeConv(conv) {
  if (!conv) return conv
  const id = conv.id ?? conv._id
  return { ...conv, id: String(id) }
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
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  const handleSend = async (content) => {
    const convId = activeConversation?.id
    if (!convId) return

    // 1. Append the human message
    setMessages((prev) => [...prev, { type: 'human', content }])
    setSending(true)

    // 2. Append an empty AI placeholder — it will fill up token by token
    setMessages((prev) => [...prev, { type: 'ai', content: '', streaming: true }])

    try {
      for await (const chunk of streamMessage(convId, content)) {
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
          onSelect={(conv) => setActiveConversation(normalizeConv(conv))}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
        <ChatArea
          conversation={activeConversation}
          loadingMessages={loadingMessages}
          messages={messages}
          onSend={handleSend}
          sending={sending}
          user={user}
        />
      </div>
    </div>
  )
}
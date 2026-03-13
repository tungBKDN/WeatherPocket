import { useState } from 'react'
import { IconMenu, IconPlus, IconTrash } from './Icons'

export default function Sidebar({ conversations, activeId, onSelect, onCreate, onDelete, collapsed, onToggle, loading }) {
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
      className="flex h-full shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-zinc-50 text-zinc-900 transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      style={{ width: collapsed ? '52px' : '280px' }}
    >
      {/* Header row — always visible */}
      <div className="flex h-14 shrink-0 items-center border-b border-zinc-200 px-3 dark:border-zinc-800">
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-yellow-100 hover:text-yellow-700 dark:text-zinc-400 dark:hover:bg-yellow-500/10 dark:hover:text-yellow-400"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          type="button"
        >
          <IconMenu />
        </button>
        {!collapsed && (
          <span className="ml-3 truncate font-sans text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Conversations
          </span>
        )}
      </div>

      {/* Expanded content */}
      {!collapsed && (
        <>
          <form className="shrink-0 border-b border-zinc-200 p-3 dark:border-zinc-800" onSubmit={handleCreate}>
            <input
              className="mb-2 w-full rounded-md bg-zinc-100 px-3 py-2 font-sans text-sm text-zinc-900 placeholder-zinc-400 outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              disabled={creating}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New conversation title..."
              value={newTitle}
            />
            <button
              className="flex w-full items-center justify-center gap-2 rounded-md bg-yellow-400 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-zinc-900 transition-colors hover:bg-yellow-500 disabled:opacity-40 dark:bg-yellow-500 dark:hover:bg-yellow-400"
              disabled={creating || !newTitle.trim()}
              type="submit"
            >
              <IconPlus />
              {creating ? 'Creating...' : 'New Chat'}
            </button>
          </form>

          <nav className="no-scrollbar flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 font-sans text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 font-sans text-xs font-semibold uppercase text-zinc-400 dark:text-zinc-500">No conversations yet.</p>
            ) : (
              conversations.map((conv) => (
                <div
                  className={`group flex cursor-pointer items-center justify-between px-4 py-3 ${
                    activeId === conv.id
                      ? 'border-l-2 border-yellow-400 bg-yellow-50 font-semibold text-zinc-900 dark:border-yellow-500 dark:bg-yellow-500/10 dark:text-zinc-100'
                      : 'border-l-2 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                  }`}
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                >
                  <span className="truncate font-sans text-sm">{conv.title}</span>
                  <button
                    className="ml-2 shrink-0 opacity-0 text-zinc-400 hover:text-zinc-900 group-hover:opacity-100 dark:text-zinc-500 dark:hover:text-zinc-100"
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

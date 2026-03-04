import { getSavedToken } from './auth'

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getSavedToken()}`,
  }
}

async function parseError(response, fallback) {
  try {
    const data = await response.json()
    return data?.detail || fallback
  } catch {
    return fallback
  }
}

// ─── Conversations ───────────────────────────────────────────────────────────

export async function listConversations() {
  const res = await fetch('/conversations', {
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load conversations'))
  return res.json()
}

export async function createConversation(title) {
  const res = await fetch('/conversations', {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to create conversation'))
  return res.json()
}

export async function deleteConversation(conversationId) {
  const res = await fetch(`/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to delete conversation'))
  return res.json()
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function getMessages(conversationId) {
  const res = await fetch(`/chat/${conversationId}/messages`, {
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load messages'))
  return res.json()
}

export async function sendMessage(conversationId, content) {
  const res = await fetch(`/chat/${conversationId}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to send message'))
  return res.json()
}

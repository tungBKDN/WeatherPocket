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

/**
 * Async generator — yields string chunks one by one as they arrive from the SSE stream.
 *
 * How it works:
 *  1. We POST to the streaming endpoint. The server keeps the connection open and sends
 *     Server-Sent Events (SSE) — lines that look like:  data: "token"\n\n
 *  2. We read the raw response body as a byte stream using response.body.getReader().
 *  3. We decode bytes → text, buffer incomplete lines, and for every complete SSE line
 *     that starts with "data: " we JSON-parse the payload and yield it to the caller.
 *  4. When we see the sentinel  data: [DONE]  we stop.
 */
export async function* streamMessage(conversationId, content) {
  const res = await fetch(`/chat/${conversationId}/messages/stream`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to stream message'))

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // Decode the incoming bytes and add to our line buffer
    buffer += decoder.decode(value, { stream: true })

    // SSE events are separated by \n\n — split on single \n for line-by-line processing
    const lines = buffer.split('\n')
    // The last element may be an incomplete line — keep it in the buffer
    buffer = lines.pop()

    for (const line of lines) {
      if (line.startsWith('event: error')) continue   // error event header line
      if (!line.startsWith('data: ')) continue

      const payload = line.slice(6).trim()
      if (payload === '[DONE]') return               // sentinel → stop iteration

      try {
        yield JSON.parse(payload)                    // yield the decoded string chunk
      } catch {
        // malformed chunk — skip
      }
    }
  }
}

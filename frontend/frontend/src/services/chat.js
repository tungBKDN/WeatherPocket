import '../proto_polyfill.js'
import * as pb from '../generated/proto/weatherpocket_pb.cjs'
import * as grpcWebModule from '../generated/proto/weatherpocket_grpc_web_pb.cjs'
import { getSavedToken } from './auth'

const GRPC_HOST = (import.meta.env.VITE_GRPC_HOST || 'http://localhost:8080').replace(/\/+$/, '')
const grpcWeb = grpcWebModule.default ?? grpcWebModule
const conversationClient = new grpcWeb.ConversationServicePromiseClient(GRPC_HOST)
const chatClient = new grpcWeb.ChatServicePromiseClient(GRPC_HOST)
const chatStreamClient = new grpcWeb.ChatServiceClient(GRPC_HOST)
const documentClient = new grpcWeb.DocumentServicePromiseClient(GRPC_HOST)
const documentStreamClient = new grpcWeb.DocumentServiceClient(GRPC_HOST)

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getSavedToken()}`,
  }
}

function metadataWithToken(token) {
  return token ? { authorization: `Bearer ${token}` } : {}
}

function toPlainConversation(message) {
  if (!message) return null

  if (typeof message.toObject === 'function') {
    const obj = message.toObject(false)
    return {
      id: String(obj.id ?? message.getId?.() ?? ''),
      user_id: String(obj.user_id ?? message.getUserId?.() ?? ''),
      title: obj.title ?? message.getTitle?.() ?? '',
      created_at: obj.created_at ?? message.getCreatedAt?.() ?? '',
      updated_at: obj.updated_at ?? message.getUpdatedAt?.() ?? '',
    }
  }

  return {
    id: String(message.id ?? message._id ?? ''),
    user_id: String(message.user_id ?? ''),
    title: message.title ?? '',
    created_at: message.created_at ?? '',
    updated_at: message.updated_at ?? '',
  }
}

function toPlainMessage(message) {
  if (!message) return null

  if (typeof message.toObject === 'function') {
    const obj = message.toObject(false)
    return {
      type: obj.type ?? message.getType?.() ?? 'ai',
      content: obj.content ?? message.getContent?.() ?? '',
    }
  }

  return {
    type: message.type ?? 'ai',
    content: message.content ?? '',
  }
}

function toPlainFile(message) {
  if (!message) return null

  if (typeof message.toObject === 'function') {
    const obj = message.toObject(false)
    return {
      file_id: String(obj.file_id ?? message.getFileId?.() ?? ''),
      file_name: obj.file_name ?? message.getFileName?.() ?? '',
      chunks: obj.chunks ?? message.getChunks?.() ?? 0,
      upload_at: obj.upload_at ?? message.getUploadAt?.() ?? '',
    }
  }

  return {
    file_id: String(message.file_id ?? ''),
    file_name: message.file_name ?? '',
    chunks: message.chunks ?? 0,
    upload_at: message.upload_at ?? '',
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
  const request = new pb.ListConversationsRequest()

  try {
    const response = await conversationClient.listConversations(request, metadataWithToken(getSavedToken()))
    const items = response.getConversationsList ? response.getConversationsList() : []
    return { conversations: items.map(toPlainConversation) }
  } catch (grpcError) {
    const res = await fetch('/conversations', {
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(await parseError(res, grpcError?.message || 'Failed to load conversations'))
    return res.json()
  }
}

export async function createConversation(title) {
  const request = new pb.CreateConversationRequest()
  request.setTitle(title)

  try {
    const response = await conversationClient.createConversation(request, metadataWithToken(getSavedToken()))
    return toPlainConversation(response)
  } catch (grpcError) {
    const res = await fetch('/conversations', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ title }),
    })
    if (!res.ok) throw new Error(await parseError(res, grpcError?.message || 'Failed to create conversation'))
    return res.json()
  }
}

export async function deleteConversation(conversationId) {
  const request = new pb.DeleteConversationRequest()
  request.setConversationId(conversationId)

  try {
    await conversationClient.deleteConversation(request, metadataWithToken(getSavedToken()))
    return {}
  } catch (grpcError) {
    const res = await fetch(`/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(await parseError(res, grpcError?.message || 'Failed to delete conversation'))
    return res.json()
  }
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function getMessages(conversationId) {
  const request = new pb.GetMessagesRequest()
  request.setConversationId(conversationId)

  try {
    const response = await chatClient.getMessages(request, metadataWithToken(getSavedToken()))
    const items = response.getMessagesList ? response.getMessagesList() : []
    return { messages: items.map(toPlainMessage) }
  } catch (grpcError) {
    const res = await fetch(`/chat/${conversationId}/messages`, {
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(await parseError(res, grpcError?.message || 'Failed to load messages'))
    return res.json()
  }
}

export async function sendMessage(conversationId, content) {
  const request = new pb.SendMessageRequest()
  request.setConversationId(conversationId)
  request.setContent(content)

  try {
    const response = await chatClient.sendMessage(request, metadataWithToken(getSavedToken()))
    const reply = response.getReply ? response.getReply() : response.reply
    return { reply: reply ?? '' }
  } catch (grpcError) {
    const res = await fetch(`/chat/${conversationId}/messages`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ content }),
    })
    if (!res.ok) throw new Error(await parseError(res, grpcError?.message || 'Failed to send message'))
    return res.json()
  }
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
export async function* streamMessage(conversationId, content, fileIds = []) {
  const request = new pb.StreamMessageRequest()
  request.setConversationId(conversationId)
  request.setContent(content)
  if (Array.isArray(fileIds) && fileIds.length > 0) {
    request.setFileIdsList(fileIds)
  }

  try {
    const stream = chatStreamClient.streamMessage(request, metadataWithToken(getSavedToken()))
    const queue = []
    const waiters = []
    let done = false
    let streamError = null

    const pushChunk = (chunk) => {
      if (waiters.length > 0) {
        const resolve = waiters.shift()
        resolve({ value: chunk, done: false })
      } else {
        queue.push(chunk)
      }
    }

    const finish = () => {
      done = true
      while (waiters.length > 0) {
        const resolve = waiters.shift()
        resolve({ value: undefined, done: true })
      }
    }

    stream.on('data', (message) => {
      if (!message) return
      const isDone = message.getDone ? message.getDone() : message.done
      if (isDone) {
        finish()
        return
      }
      const text = message.getContent ? message.getContent() : message.content
      if (typeof text === 'string' && text.length > 0) {
        pushChunk(text)
      }
    })

    stream.on('error', (error) => {
      streamError = error || new Error('Failed to stream message')
      done = true
      while (waiters.length > 0) {
        const resolve = waiters.shift()
        resolve({ value: undefined, done: true })
      }
    })

    stream.on('end', () => {
      finish()
    })

    while (true) {
      if (queue.length > 0) {
        yield queue.shift()
        continue
      }

      if (done) {
        if (streamError) throw streamError
        return
      }

      const next = await new Promise((resolve) => {
        waiters.push(resolve)
      })

      if (next.done) {
        if (streamError) throw streamError
        return
      }

      yield next.value
    }
  } catch (grpcError) {
    const res = await fetch(`/chat/${conversationId}/messages/stream`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ content, file_ids: fileIds.length ? fileIds : undefined }),
    })
    if (!res.ok) throw new Error(await parseError(res, grpcError?.message || 'Failed to stream message'))

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
}

// ─── Documents (RAG files) ───────────────────────────────────────────────────

export async function listFiles(conversationId) {
  const request = new pb.ListFilesRequest()
  request.setConversationId(conversationId)

  try {
    const response = await documentClient.listFiles(request, metadataWithToken(getSavedToken()))
    const items = response.getFilesList ? response.getFilesList() : []
    return items.map(toPlainFile)
  } catch (grpcError) {
    const res = await fetch(`/chat/${conversationId}/files`, {
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(await parseError(res, grpcError?.message || 'Failed to load files'))
    return res.json()
  }
}

export async function uploadFile(conversationId, file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const request = new pb.UploadPdfRequest()
    request.setConversationId(conversationId)
    request.setFileName(file.name)
    request.setContent(bytes)

    const response = await documentClient.uploadPdf(request, metadataWithToken(getSavedToken()))
    return {
      file_id: response.getFileId ? response.getFileId() : response.file_id,
      file_name: response.getFileName ? response.getFileName() : response.file_name,
      chunks: response.getChunks ? response.getChunks() : response.chunks,
    }
  } catch (grpcError) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/chat/${conversationId}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getSavedToken()}` },
      credentials: 'include',
      body: form,
    })
    if (!res.ok) throw new Error(await parseError(res, grpcError?.message || 'Failed to upload file'))
    return res.json()
  }
}

function fallbackXhrUpload(conversationId, file, onEvent) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/chat/${conversationId}/files/stream`, true)
    xhr.setRequestHeader('Authorization', `Bearer ${getSavedToken()}`)

    let lastIndex = 0
    let streamBuffer = ''

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const progress = Math.round((event.loaded / event.total) * 100)
      onEvent?.({
        type: 'progress',
        stage: 'upload',
        progress,
        message: `Uploading file (${event.loaded}/${event.total} bytes)`,
      })
    }

    xhr.onprogress = () => {
      streamBuffer += xhr.responseText.slice(lastIndex)
      lastIndex = xhr.responseText.length

      const lines = streamBuffer.split('\n')
      streamBuffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) continue

        try {
          const payload = JSON.parse(line)
          onEvent?.(payload)
          if (payload.type === 'done') {
            resolve(payload.result)
          } else if (payload.type === 'error') {
            reject(new Error(payload.message || 'Failed to upload file'))
          }
        } catch {
          // ignore malformed partial chunk
        }
      }
    }

    xhr.onerror = () => reject(new Error('Network error while uploading file'))

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          reject(new Error(data?.detail || 'Failed to upload file'))
        } catch {
          reject(new Error('Failed to upload file'))
        }
      }
    }

    xhr.send(form)
  })
}

export function uploadFileWithProgress(conversationId, file, onEvent) {
  return new Promise((resolve, reject) => {
    file
      .arrayBuffer()
      .then((arrayBuffer) => {
        const bytes = new Uint8Array(arrayBuffer)
        const request = new pb.UploadPdfRequest()
        request.setConversationId(conversationId)
        request.setFileName(file.name)
        request.setContent(bytes)

        const stream = documentStreamClient.uploadPdfStream(request, metadataWithToken(getSavedToken()))

        stream.on('data', (message) => {
          if (!message) return
          const type = message.getType ? message.getType() : message.type
          const stage = message.getStage ? message.getStage() : message.stage
          const progress = message.getProgress ? message.getProgress() : message.progress
          const messageText = message.getMessage ? message.getMessage() : message.message
          const resultMsg = message.getResult ? message.getResult() : message.result

          const payload = {
            type,
            stage,
            progress,
            message: messageText,
          }

          if (resultMsg) {
            payload.result = {
              file_id: resultMsg.getFileId ? resultMsg.getFileId() : resultMsg.file_id,
              file_name: resultMsg.getFileName ? resultMsg.getFileName() : resultMsg.file_name,
              chunks: resultMsg.getChunks ? resultMsg.getChunks() : resultMsg.chunks,
            }
          }

          onEvent?.(payload)

          if (type === 'done') {
            resolve(payload.result)
          } else if (type === 'error') {
            reject(new Error(payload.message || 'Failed to upload file'))
          }
        })

        stream.on('error', () => {
          fallbackXhrUpload(conversationId, file, onEvent).then(resolve).catch(reject)
        })
      })
      .catch(() => {
        fallbackXhrUpload(conversationId, file, onEvent).then(resolve).catch(reject)
      })
  })
}

export async function deleteFile(conversationId, fileId) {
  const request = new pb.DeleteFileRequest()
  request.setConversationId(conversationId)
  request.setFileId(fileId)

  try {
    await documentClient.deleteFile(request, metadataWithToken(getSavedToken()))
    return { detail: 'File deleted successfully.' }
  } catch (grpcError) {
    const res = await fetch(`/chat/${conversationId}/files/${fileId}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(await parseError(res, grpcError?.message || 'Failed to delete file'))
    return res.json()
  }
}

export async function getChunkCitation(fileId, chunkIndex) {
  const request = new pb.GetChunkRequest()
  request.setFileId(fileId)
  request.setChunkIndex(chunkIndex)

  try {
    const response = await documentClient.getChunk(request, metadataWithToken(getSavedToken()))
    return {
      file_id: response.getFileId ? response.getFileId() : response.file_id,
      file_name: response.getFileName ? response.getFileName() : response.file_name,
      chunk_index: response.getChunkIndex ? response.getChunkIndex() : response.chunk_index,
      content: response.getContent ? response.getContent() : response.content,
    }
  } catch (grpcError) {
    const res = await fetch(`/chat/files/${fileId}/chunks/${chunkIndex}`, {
      headers: authHeaders(),
      credentials: 'include',
    })
    if (!res.ok) throw new Error(await parseError(res, grpcError?.message || 'Failed to load citation chunk'))
    return res.json()
  }
}

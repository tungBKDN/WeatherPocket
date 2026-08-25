import '../proto_polyfill.js'
import * as pb from '../generated/proto/weatherpocket_pb.cjs'
import * as grpcWebModule from '../generated/proto/weatherpocket_grpc_web_pb.cjs'

const TOKEN_KEY = 'weatherpocket_access_token'
const GRPC_HOST = (import.meta.env.VITE_GRPC_HOST || 'http://localhost:8080').replace(/\/+$/, '')
const grpcWeb = grpcWebModule.default ?? grpcWebModule
const authClient = new grpcWeb.AuthServicePromiseClient(GRPC_HOST)

async function parseAuthError(response, fallbackMessage) {
  try {
    const data = await response.json()
    return data?.detail || fallbackMessage
  } catch {
    return fallbackMessage
  }
}

function toPlainUser(user) {
  if (!user) return null

  if (typeof user.toObject === 'function') {
    const obj = user.toObject(false)
    return {
      id: String(obj.id ?? user.getId?.() ?? ''),
      email: obj.email ?? user.getEmail?.() ?? '',
      fullname: obj.fullname ?? user.getFullname?.() ?? '',
      is_active: obj.is_active ?? user.getIsActive?.() ?? true,
    }
  }

  return {
    id: String(user.id ?? user._id ?? ''),
    email: user.email ?? '',
    fullname: user.fullname ?? '',
    is_active: user.is_active ?? true,
  }
}

function toPlainAuthResponse(response) {
  if (!response) return null

  const accessToken = response.getAccessToken ? response.getAccessToken() : response.access_token
  const tokenType = response.getTokenType ? response.getTokenType() : response.token_type
  const userMessage = response.getUser ? response.getUser() : response.user

  return {
    access_token: accessToken,
    token_type: tokenType,
    user: toPlainUser(userMessage),
  }
}

function metadataWithToken(token) {
  return token ? { authorization: `Bearer ${token}` } : {}
}

export function getSavedToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function login(email, password) {
  const request = new pb.LoginRequest()
  request.setEmail(email)
  request.setPassword(password)

  try {
    const response = await authClient.login(request, metadataWithToken(getSavedToken()))
    return toPlainAuthResponse(response)
  } catch (grpcError) {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error(await parseAuthError(response, grpcError?.message || 'Invalid email or password'))
    }

    return response.json()
  }
}

export async function signup(email, fullname, password) {
  const request = new pb.SignUpRequest()
  request.setEmail(email)
  request.setFullname(fullname)
  request.setPassword(password)

  try {
    const response = await authClient.signUp(request, metadataWithToken(getSavedToken()))
    return toPlainAuthResponse(response)
  } catch (grpcError) {
    const response = await fetch('/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, fullname, password }),
    })

    if (!response.ok) {
      throw new Error(await parseAuthError(response, grpcError?.message || 'Signup failed'))
    }

    return response.json()
  }
}

export async function getMe(token) {
  const request = new pb.GetMeRequest()

  try {
    const response = await authClient.getMe(request, metadataWithToken(token))
    const user = response && typeof response.toObject === 'function' ? response.toObject(false) : response

    return {
      id: user?.id ?? response?.getId?.() ?? '',
      email: user?.email ?? response?.getEmail?.() ?? '',
      fullname: user?.fullname ?? response?.getFullname?.() ?? '',
      is_active: user?.is_active ?? response?.getIsActive?.() ?? true,
    }
  } catch (grpcError) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch('/auth/me', {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(grpcError?.message || 'Session expired')
    }

    return response.json()
  }
}

export async function logout() {
  const request = new pb.LogoutRequest()

  try {
    await authClient.logout(request, metadataWithToken(getSavedToken()))
    return
  } catch {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  }
}

export async function refreshToken() {
  const request = new pb.RefreshTokenRequest()
  const token = getSavedToken()

  try {
    const response = await authClient.refreshToken(request, metadataWithToken(token))
    const plain = toPlainAuthResponse(response)
    if (plain?.access_token) {
      saveToken(plain.access_token)
    }
    return plain
  } catch (grpcError) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(await parseAuthError(response, grpcError?.message || 'Token refresh failed'))
    }

    const data = await response.json()
    if (data?.access_token) {
      saveToken(data.access_token)
    }
    return data
  }
}
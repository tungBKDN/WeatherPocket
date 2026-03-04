const TOKEN_KEY = 'weatherpocket_access_token'

async function parseAuthError(response, fallbackMessage) {
  try {
    const data = await response.json()
    return data?.detail || fallbackMessage
  } catch {
    return fallbackMessage
  }
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
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(await parseAuthError(response, 'Invalid email or password'))
  }

  return response.json()
}

export async function signup(email, fullname, password) {
  const response = await fetch('/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, fullname, password }),
  })

  if (!response.ok) {
    throw new Error(await parseAuthError(response, 'Signup failed'))
  }

  return response.json()
}

export async function getMe(token) {
  const response = await fetch('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Session expired')
  }

  return response.json()
}

export async function logout() {
  await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
}
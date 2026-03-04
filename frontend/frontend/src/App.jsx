import { useEffect, useState } from 'react'
import {
  clearToken,
  getMe,
  getSavedToken,
  login,
  logout,
  saveToken,
  signup,
} from './services/auth'
import LoginScreen from './features/auth/LoginScreen'
import HomeScreen from './features/home/HomeScreen'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullname, setFullname] = useState('')
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState('signin')

  useEffect(() => {
    const bootstrap = async () => {
      const token = getSavedToken()
      try {
        // Try with localStorage token first, then fall back to httpOnly cookie
        const userData = await getMe(token)
        if (token === null) saveToken(userData.access_token ?? '')
        setUser(userData)
        setStatus('authenticated')
      } catch {
        clearToken()
        setStatus('unauthenticated')
      }
    }

    bootstrap()
  }, [])

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      const data = authMode === 'signup'
        ? await signup(email, fullname, password)
        : await login(email, password)
      saveToken(data.access_token)
      setUser(data.user)
      setStatus('authenticated')
      setPassword('')
      setFullname('')
    } catch (authError) {
      setError(authError.message)
      setStatus('unauthenticated')
    }
  }

  const handleLogout = async () => {
    await logout()
    clearToken()
    setUser(null)
    setStatus('unauthenticated')
  }

  if (status === 'checking') {
    return <div className="min-h-screen bg-zinc-100" />
  }

  if (status === 'authenticated') {
    return <HomeScreen user={user} onLogout={handleLogout} />
  }

  return (
    <LoginScreen
      authMode={authMode}
      email={email}
      error={error}
      fullname={fullname}
      onAuthModeChange={(mode) => {
        setAuthMode(mode)
        setError('')
      }}
      onEmailChange={setEmail}
      onFullnameChange={setFullname}
      onPasswordChange={setPassword}
      onSubmit={handleAuthSubmit}
      password={password}
    />
  )
}

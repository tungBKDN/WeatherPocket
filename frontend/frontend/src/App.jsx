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
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState('signin')

  useEffect(() => {
    const bootstrap = async () => {
      const token = getSavedToken()
      if (!token) {
        setStatus('unauthenticated')
        return
      }

      try {
        await getMe(token)
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
      const action = authMode === 'signup' ? signup : login
      const data = await action(email, password)
      saveToken(data.access_token)
      setStatus('authenticated')
      setPassword('')
    } catch (authError) {
      setError(authError.message)
      setStatus('unauthenticated')
    }
  }

  const handleLogout = async () => {
    await logout()
    clearToken()
    setStatus('unauthenticated')
  }

  if (status === 'checking') {
    return <div className="min-h-screen bg-zinc-100" />
  }

  if (status === 'authenticated') {
    return <HomeScreen onLogout={handleLogout} />
  }

  return (
    <LoginScreen
      authMode={authMode}
      email={email}
      error={error}
      onAuthModeChange={(mode) => {
        setAuthMode(mode)
        setError('')
      }}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleAuthSubmit}
      password={password}
    />
  )
}

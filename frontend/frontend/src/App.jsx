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
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState('signin')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const bootstrap = async () => {
      const token = getSavedToken()
      if (!token) {
        setStatus('unauthenticated')
        return
      }

      try {
        const userData = await getMe(token)
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
      let data
      if (authMode === 'signup') {
        data = await signup(email, fullname, password)
      } else {
        data = await login(email, password)
      }
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
      onPasswordChange={setPassword}
      onFullnameChange={setFullname}
      onSubmit={handleAuthSubmit}
      password={password}
    />
  )
}

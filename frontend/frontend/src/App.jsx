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

  let content = null

  if (status === 'checking') {
    content = <div className="h-full w-full bg-white dark:bg-zinc-950" />
  } else if (status === 'authenticated') {
    content = <HomeScreen user={user} onLogout={handleLogout} />
  } else {
    content = (
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

  return <div className="h-screen overflow-hidden">{content}</div>
}

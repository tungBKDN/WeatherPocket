import { useEffect, useMemo, useState } from 'react'

function IconSunSmall() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41" strokeLinecap="round" />
    </svg>
  )
}

function IconSunBrand() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41" strokeLinecap="round" />
    </svg>
  )
}

function IconCloudSmall() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <path d="M19 18H7a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17 8.5a4.5 4.5 0 0 1 2 9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconRainSmall() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <path d="M19 14H7a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17 4.5a4.5 4.5 0 0 1 2 9.5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" strokeLinecap="round" />
    </svg>
  )
}

function IconWindSmall() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <path d="M3 8h11a2 2 0 1 0-2-2" strokeLinecap="round" />
      <path d="M3 12h15a2 2 0 1 1-2 2" strokeLinecap="round" />
      <path d="M3 16h8a2 2 0 1 0-2 2" strokeLinecap="round" />
    </svg>
  )
}

export default function LoginScreen({
  authMode,
  email,
  password,
  fullname,
  error,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onFullnameChange,
  onSubmit,
}) {
  const [scrollY, setScrollY] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loaderIndex, setLoaderIndex] = useState(0)

  const loaderStates = useMemo(
    () => [
      { label: 'Tracking sunlight', icon: <IconSunSmall /> },
      { label: 'Modeling clouds', icon: <IconCloudSmall /> },
      { label: 'Simulating rain', icon: <IconRainSmall /> },
      { label: 'Resolving wind', icon: <IconWindSmall /> },
    ],
    [],
  )

  useEffect(() => {
    if (!isSubmitting) {
      setLoaderIndex(0)
      return
    }

    const timer = setInterval(() => {
      setLoaderIndex((prev) => (prev + 1) % loaderStates.length)
    }, 520)

    return () => clearInterval(timer)
  }, [isSubmitting, loaderStates.length])

  const heroProgress = Math.min(scrollY / 420, 1)
  const heroScale = 1 - heroProgress * 0.18
  const heroBlur = heroProgress * 3
  const heroOpacity = 1 - heroProgress * 0.45

  const handleSubmit = async (event) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(event)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      className="h-full overflow-y-auto bg-zinc-100 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
      onScroll={(event) => setScrollY(event.currentTarget.scrollTop)}
    >
      <div className="relative min-h-[200vh]">
        <div className="sticky top-0 z-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18)_0%,transparent_52%)] dark:bg-[radial-gradient(circle_at_center,rgba(39,39,42,0.4)_0%,transparent_50%)]" />
          <div
            className="relative z-10 mx-auto max-w-5xl text-center transition-[transform,opacity,filter] duration-300 ease-out"
            style={{
              transform: `scale(${heroScale}) translateY(${-heroProgress * 36}px)`,
              filter: `blur(${heroBlur}px)`,
              opacity: heroOpacity,
            }}
          >
            <div className="mb-5 flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
              <IconSunBrand />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]">WeatherPocket</span>
            </div>
            <h1 className="bg-linear-to-b from-zinc-900 via-zinc-700 to-yellow-600 bg-clip-text text-6xl font-bold tracking-tighter text-transparent dark:from-white dark:via-zinc-300 dark:to-yellow-400 md:text-8xl">
              Atmospheric Intelligence.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl font-medium text-zinc-600 dark:text-zinc-400">
              Beyond forecasts. The AI-native meteorological engine for rapid contextual decisions.
            </p>
          </div>
        </div>

        <div className="relative z-10 border-t border-zinc-200 bg-zinc-100/85 pb-32 backdrop-blur-2xl dark:border-zinc-800 dark:bg-zinc-950/80">
          <section className="mx-auto max-w-6xl px-6">
            <div className="relative z-20 mx-auto -mt-32 max-w-md rounded-2xl border border-zinc-200 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="relative mb-6 grid grid-cols-2 gap-3 rounded-xl border border-zinc-300 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900">
                <div
                  className={`absolute bottom-1 top-1 w-[calc(50%-0.375rem)] rounded-lg bg-yellow-400 shadow-lg transition-transform duration-300 ease-out dark:bg-yellow-300 ${
                    authMode === 'signup' ? 'translate-x-[calc(100%+0.25rem)]' : 'translate-x-0'
                  }`}
                />
                <button
                  className={`relative z-10 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
                    authMode === 'signin'
                      ? 'text-zinc-900'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100'
                  }`}
                  onClick={() => onAuthModeChange('signin')}
                  type="button"
                >
                  Sign In
                </button>
                <button
                  className={`relative z-10 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
                    authMode === 'signup'
                      ? 'text-zinc-900'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100'
                  }`}
                  onClick={() => onAuthModeChange('signup')}
                  type="button"
                >
                  Sign Up
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Access</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 transition-all duration-300 dark:text-zinc-100">
                    {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
                  </h2>
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    authMode === 'signup' ? 'max-h-28 translate-y-0 opacity-100' : 'pointer-events-none max-h-0 -translate-y-2 opacity-0'
                  }`}
                >
                  <label className="block pb-1">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Full Name</span>
                    <input
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-yellow-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
                      onChange={(event) => onFullnameChange(event.target.value)}
                      required={authMode === 'signup'}
                      type="text"
                      value={fullname}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Email</span>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-yellow-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
                    onChange={(event) => onEmailChange(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Password</span>
                  <input
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-yellow-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
                    minLength={8}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    required
                    type="password"
                    value={password}
                  />
                </label>

                {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}

                <button
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 transition-all duration-300 hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-300"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-900/30 bg-yellow-200 text-zinc-900 animate-spin dark:bg-zinc-100">
                        {loaderStates[loaderIndex].icon}
                      </span>
                      <span className="min-w-0">{loaderStates[loaderIndex].label}</span>
                      <span className="h-4 w-4 rounded-full border-2 border-zinc-900/30 border-t-zinc-900 animate-spin" />
                    </span>
                  ) : (
                    authMode === 'signup' ? 'Create Account' : 'Login'
                  )}
                </button>
              </form>
            </div>

            <div className="mt-32 grid grid-cols-1 gap-6 md:grid-cols-3">
              <article className="rounded-2xl border border-zinc-200 bg-white/60 p-8 transition-colors hover:bg-white/90 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/50 md:col-span-2">
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Context-Aware RAG.</h3>
                <p className="mt-3 text-base font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Powered by vector-embedded meteorological research. Ask complex questions, get documented, scientifically grounded answers instantly.
                </p>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white/60 p-8 transition-colors hover:bg-white/90 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/50 md:col-span-1">
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Minimalist UI.</h3>
                <p className="mt-3 text-base font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
                  No clutter. Just a command-line-like chat interface wrapped in a consumer-grade aesthetic.
                </p>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white/60 p-8 transition-colors hover:bg-white/90 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/50 md:col-span-1">
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Monochromatic Focus.</h3>
                <p className="mt-3 text-base font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Designed to reduce cognitive load. A Zinc-based palette that treats your eyes with respect.
                </p>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white/60 p-8 transition-colors hover:bg-white/90 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/50 md:col-span-2">
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Seamless Workflow.</h3>
                <p className="mt-3 text-base font-medium leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Upload your own atmospheric documents on the fly. The AI reads, analyzes, and synthesizes your exact context.
                </p>
              </article>
            </div>

            <footer className="mt-20 border-t border-zinc-200 py-8 text-center text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              <div className="mb-2 inline-flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <IconSunBrand />
                <span className="font-semibold tracking-wide">WeatherPocket</span>
              </div>
              <p>2025 (C) Tran Thanh Tung</p>
              <a
                className="mt-1 inline-block text-zinc-700 underline decoration-zinc-400 underline-offset-4 hover:text-yellow-600 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-yellow-400"
                href="https://github.com/tungBKDN"
                rel="noreferrer"
                target="_blank"
              >
                github.com/tungBKDN
              </a>
            </footer>
          </section>
        </div>
      </div>
    </main>
  )
}

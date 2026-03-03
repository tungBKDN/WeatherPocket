import { useEffect, useMemo, useRef, useState } from 'react'

export default function LoginScreen({
  authMode,
  email,
  password,
  error,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}) {
  const [scrollY, setScrollY] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight)
  const [heroHeight, setHeroHeight] = useState(460)
  const heroRef = useRef(null)

  const featureMocks = useMemo(
    () => [
      {
        title: 'Smart Alerts',
        copy: 'Get severe-weather triggers with confidence score and ETA.',
      },
      {
        title: 'Trip Planner',
        copy: 'Drag destinations and preview weather windows before booking.',
      },
      {
        title: 'Conversation Notes',
        copy: 'Save forecasts as notes and pin them to your daily timeline.',
      },
      {
        title: 'Team Brief',
        copy: 'Morning summary cards for operations, logistics and field teams.',
      },
      {
        title: 'Map Layers',
        copy: 'Stack rainfall, cloud, temperature and wind for quick context.',
      },
      {
        title: 'Live Digests',
        copy: 'Every 30 minutes, digest changes and surface meaningful shifts.',
      },
    ],
    [],
  )

  useEffect(() => {
    const onResize = () => {
      setViewportHeight(window.innerHeight)
      if (heroRef.current) {
        setHeroHeight(heroRef.current.offsetHeight)
      }
    }

    if (heroRef.current) {
      setHeroHeight(heroRef.current.offsetHeight)
    }

    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const shrinkProgress = Math.min(scrollY / 320, 1)
  const heroScale = 1 - shrinkProgress * 0.08
  const heroOpacity = 1 - shrinkProgress * 0.06
  const centeredTop = Math.max((viewportHeight - heroHeight) / 2, 18)
  const pinnedTop = 12
  const heroTop = centeredTop - (centeredTop - pinnedTop) * shrinkProgress
  const heroVisualHeight = heroHeight * heroScale
  const yellowCoverHeight = Math.max(heroTop + heroVisualHeight + 26, 0)
  const scrollStartPadding = Math.max(viewportHeight + 24, heroHeight + 120)
  const revealProgress = Math.min(scrollY / 110, 1)
  const mocksTranslateY = (1 - revealProgress) * 120
  const mocksOpacity = revealProgress

  return (
    <main className="h-screen overflow-hidden bg-yellow-300">
      <div
        className="fixed inset-x-0 top-0 z-40 bg-yellow-300"
        style={{
          height: `${yellowCoverHeight}px`,
          transition: 'height 180ms cubic-bezier(0.22,1,0.36,1)',
        }}
      />

      <div
        className="fixed inset-x-0 z-50 flex justify-center px-2"
        style={{
          top: `${heroTop}px`,
          opacity: heroOpacity,
          transition: 'top 180ms cubic-bezier(0.22,1,0.36,1), opacity 180ms ease',
        }}
      >
        <section
          className="w-[min(96vw,72rem)] origin-top bg-yellow-300 px-1 pb-2 pt-1"
          ref={heroRef}
          style={{
            transform: `scale(${heroScale})`,
            transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <div className="grid gap-6 md:grid-cols-12">
          <aside className="brutal-card bg-blue-500 text-white md:col-span-5">
            <p className="text-xs font-black tracking-[0.2em]">WEATHERPOCKET</p>
            <h1 className="mt-6 text-4xl font-black uppercase leading-[0.9] md:text-6xl">
              Brutal
              <br />
              Weather
              <br />
              Hub
            </h1>
            <p className="mt-6 max-w-sm text-sm font-bold uppercase tracking-wide">
              Sign in or create account. Scroll for complete product narrative and polished mockups.
            </p>
          </aside>

          <section className="brutal-card bg-white md:col-span-7">
            <div className="mb-5 flex gap-3">
              <button
                className={`brutal-button flex-1 ${authMode === 'signin' ? '' : 'bg-white'}`}
                onClick={() => onAuthModeChange('signin')}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`brutal-button flex-1 ${authMode === 'signup' ? '' : 'bg-white'}`}
                onClick={() => onAuthModeChange('signup')}
                type="button"
              >
                Sign Up
              </button>
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-700">Access</p>
                <h2 className="mt-2 text-3xl font-black uppercase">
                  {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
                </h2>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-700">
                  Email
                </span>
                <input
                  className="brutal-input"
                  onChange={(event) => onEmailChange(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-700">
                  Password
                </span>
                <input
                  className="brutal-input"
                  minLength={8}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>

              {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

              <button className="brutal-button w-full" type="submit">
                {authMode === 'signup' ? 'Create Account' : 'Login'}
              </button>
            </form>
          </section>
          </div>
        </section>
      </div>

      <section
        className="no-scrollbar h-screen overflow-y-auto px-4 pb-16 md:px-8"
        onScroll={(event) => setScrollY(event.currentTarget.scrollTop)}
      >
        <section
          className="mx-auto max-w-6xl space-y-8"
          style={{
            paddingTop: `${scrollStartPadding}px`,
            transform: `translateY(${mocksTranslateY}px)`,
            opacity: mocksOpacity,
            transition: 'transform 160ms cubic-bezier(0.22,1,0.36,1), opacity 160ms ease',
          }}
        >
          <article className="brutal-card bg-pink-300">
            <p className="text-xs font-black uppercase tracking-[0.2em]">Storyline</p>
            <h3 className="mt-2 text-3xl font-black uppercase md:text-4xl">From Forecast To Decisions</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="border-4 border-slate-900 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">Step 01</p>
                <p className="mt-2 text-sm font-bold uppercase">Collect city + context from user query.</p>
              </div>
              <div className="border-4 border-slate-900 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">Step 02</p>
                <p className="mt-2 text-sm font-bold uppercase">Generate daily insight card with confidence and trend.</p>
              </div>
              <div className="border-4 border-slate-900 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">Step 03</p>
                <p className="mt-2 text-sm font-bold uppercase">Push timely alert when the weather pattern shifts.</p>
              </div>
            </div>
          </article>

          <article className="brutal-card bg-orange-300">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em]">Feature Mockups</p>
                <h3 className="mt-2 text-3xl font-black uppercase md:text-4xl">Interface Building Blocks</h3>
              </div>
              <p className="max-w-md text-sm font-bold uppercase">Cards below show how upcoming conversation workflows can be arranged.</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featureMocks.map((item) => (
                <article className="border-4 border-slate-900 bg-white p-4" key={item.title}>
                  <h4 className="text-lg font-black uppercase">{item.title}</h4>
                  <p className="mt-2 text-sm font-bold uppercase text-slate-700">{item.copy}</p>
                  <div className="mt-4 h-20 border-4 border-dashed border-slate-900 bg-zinc-50" />
                </article>
              ))}
            </div>
          </article>

          <article className="brutal-card bg-lime-300">
            <p className="text-xs font-black uppercase tracking-[0.2em]">Contacts</p>
            <h3 className="mt-2 text-3xl font-black uppercase md:text-4xl">Support and Product Team</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { role: 'Product', label: 'roadmap@weatherpocket.dev' },
                { role: 'Engineering', label: 'eng@weatherpocket.dev' },
                { role: 'Ops', label: 'ops@weatherpocket.dev' },
                { role: 'Support', label: 'help@weatherpocket.dev' },
              ].map((contact) => (
                <div className="border-4 border-slate-900 bg-white p-4" key={contact.role}>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-700">{contact.role}</p>
                  <p className="mt-2 break-all text-sm font-bold uppercase">{contact.label}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="brutal-card bg-cyan-300">
            <p className="text-xs font-black uppercase tracking-[0.2em]">Conversation Preview</p>
            <h3 className="mt-2 text-3xl font-black uppercase md:text-4xl">Upcoming Main Screen Mock</h3>
            <div className="mt-6 grid gap-4 lg:grid-cols-12">
              <div className="border-4 border-slate-900 bg-white p-4 lg:col-span-4">
                <p className="text-xs font-black uppercase tracking-[0.16em]">Context Rail</p>
                <ul className="mt-3 space-y-2">
                  <li className="border-4 border-slate-900 bg-zinc-50 p-2 text-xs font-black uppercase">Today Brief</li>
                  <li className="border-4 border-slate-900 bg-zinc-50 p-2 text-xs font-black uppercase">Risk Alerts</li>
                  <li className="border-4 border-slate-900 bg-zinc-50 p-2 text-xs font-black uppercase">Saved Cities</li>
                  <li className="border-4 border-slate-900 bg-zinc-50 p-2 text-xs font-black uppercase">Task Queue</li>
                </ul>
              </div>
              <div className="border-4 border-slate-900 bg-white p-4 lg:col-span-8">
                <p className="text-xs font-black uppercase tracking-[0.16em]">Conversation Panel</p>
                <div className="mt-3 space-y-3">
                  <div className="border-4 border-slate-900 bg-zinc-50 p-3 text-xs font-black uppercase">
                    User: Need rain forecast for Hanoi this weekend.
                  </div>
                  <div className="border-4 border-slate-900 bg-yellow-200 p-3 text-xs font-black uppercase">
                    Assistant: Light rain likely Saturday 14:00-18:00, confidence high.
                  </div>
                  <div className="border-4 border-dashed border-slate-900 bg-white p-3 text-xs font-black uppercase">
                    Input composer placeholder...
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}
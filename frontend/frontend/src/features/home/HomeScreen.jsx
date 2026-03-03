export default function HomeScreen({ onLogout }) {
  return (
    <main className="min-h-screen bg-lime-300 p-4 md:p-8">
      <section className="mx-auto grid max-w-6xl gap-4 md:grid-cols-12">
        <header className="brutal-card bg-black text-white md:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em]">WeatherPocket</p>
              <h1 className="mt-2 text-2xl font-black uppercase md:text-4xl">Workspace</h1>
            </div>
            <button className="brutal-button bg-red-500 text-black hover:bg-red-400" onClick={onLogout} type="button">
              Logout
            </button>
          </div>
        </header>

        <section className="brutal-card min-h-[65vh] bg-white md:col-span-12" />
      </section>
    </main>
  )
}
export default function Home({
  displayName,
  setDisplayName,
  joinCode,
  setJoinCode,
  onCreate,
  onJoin,
  busy,
}) {
  return (
    <div className="mx-auto w-full max-w-md space-y-8 px-5 py-10 sm:py-16">
      <section className="space-y-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
          Phase 1 · Room &amp; lobby
        </p>
        <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
          SHADOW
          <span className="block text-emerald-400">HUNT</span>
        </h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-slate-400">
          A campus game of hide and seek. Gather your players, draw lots for roles,
          and head outside.
        </p>
      </section>

      <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 sm:p-6">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Your display name
          </span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={24}
            placeholder="e.g. Nightfox"
            autoComplete="nickname"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
          />
        </label>

        <button
          type="button"
          onClick={onCreate}
          disabled={busy || !displayName.trim()}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create a room
        </button>

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-slate-600">
          <span className="h-px flex-1 bg-slate-800" />
          or join one
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <form
          onSubmit={onJoin}
          className="space-y-3"
        >
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Room code
            </span>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC234"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-center text-xl font-bold tracking-[0.3em] text-white uppercase outline-none transition placeholder:text-slate-700 focus:border-emerald-500"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !displayName.trim() || joinCode.trim().length !== 6}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3.5 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Join room
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-600">
        Mobile web first · no app install needed
      </p>
    </div>
  )
}

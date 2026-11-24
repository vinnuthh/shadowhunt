import PlayerList from '../components/PlayerList.jsx'

const ROLE_COPY = {
  HUNTER: {
    title: 'You are a Hunter',
    text: 'Find the Shadows. Their positions will appear on your map in the next phase.',
    accent: 'amber',
  },
  SHADOW: {
    title: 'You are a Shadow',
    text: 'Stay hidden. You will see only approximate Hunter positions on your map.',
    accent: 'violet',
  },
}

export default function Match({ room, connected, busy, onEnd, onLeave }) {
  const ended = room.status === 'ENDED'
  const role = ROLE_COPY[room.me.role] || {
    title: 'Role assigned',
    text: 'Your role was assigned by the server.',
    accent: 'slate',
  }
  const accent = {
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    violet: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
    slate: 'border-slate-700 bg-slate-800/40 text-slate-300',
  }[role.accent]

  const hunters = ended
    ? room.players.filter((player) => player.role === 'HUNTER').length
    : null

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-5 py-8 sm:py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Room {room.code}
          </p>
          <h1 className="mt-1 text-2xl font-black text-white">
            {ended ? 'Match ended' : 'Match in progress'}
          </h1>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            ended
              ? 'border-slate-700 bg-slate-800/50 text-slate-400'
              : connected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-800/50 text-slate-400'
          }`}
        >
          {ended ? 'Finished' : connected ? 'Live' : 'Reconnecting'}
        </span>
      </div>

      <section className={`rounded-3xl border p-6 text-center ${accent}`}>
        <p className="text-xs font-bold uppercase tracking-[0.25em] opacity-70">
          {ended ? 'Your role was' : 'Your secret role'}
        </p>
        <h2 className="mt-2 text-3xl font-black">{role.title}</h2>
        <p className="mt-3 text-sm leading-relaxed opacity-80">{role.text}</p>
      </section>

      {ended && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Final roster
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {hunters} {hunters === 1 ? 'Hunter' : 'Hunters'} ·{' '}
            {room.players.length - hunters} Shadows
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-bold text-slate-300">
          Players <span className="text-slate-500">({room.players.length})</span>
        </h2>
        <PlayerList players={room.players} meId={room.me.id} />
        {!ended && (
          <p className="px-1 text-xs text-slate-600">
            Other players' roles stay hidden until the match ends.
          </p>
        )}
      </section>

      {!ended && (
        <section className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/30 p-5 text-center">
          <p className="text-sm font-bold text-slate-300">Map &amp; GPS coming next</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Phase 2 adds the campus map, 25-second location updates and role-filtered
            live markers.
          </p>
        </section>
      )}

      <div className="space-y-3">
        {!ended && room.me.is_host && (
          <button
            type="button"
            onClick={onEnd}
            disabled={busy}
            className="w-full rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3.5 text-sm font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
          >
            {busy ? 'Ending…' : 'End match (emergency stop)'}
          </button>
        )}
        <button
          type="button"
          onClick={onLeave}
          className="w-full rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
        >
          Leave room
        </button>
      </div>
    </div>
  )
}

function initials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

export default function PlayerList({ players, meId }) {
  return (
    <ul className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
      {players.map((player) => (
        <li key={player.id} className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
            {initials(player.display_name)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
            {player.display_name}
            {player.id === meId && (
              <span className="ml-2 text-xs font-normal text-emerald-400">you</span>
            )}
          </span>
          {player.is_host && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-300">
              HOST
            </span>
          )}
          {player.role && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                player.role === 'HUNTER'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-violet-500/15 text-violet-300'
              }`}
            >
              {player.role}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

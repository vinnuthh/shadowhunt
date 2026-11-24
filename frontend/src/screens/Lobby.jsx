import { useEffect, useState } from 'react'
import PlayerList from '../components/PlayerList.jsx'

export default function Lobby({ room, connected, busy, onStart, onLeave }) {
  const playerCount = room.players.length
  const isHost = room.me.is_host
  const suggestion = Math.max(
    1,
    Math.min(playerCount - 1, Math.round(playerCount / 5)),
  )

  const [hunterCount, setHunterCount] = useState(suggestion)
  const [customized, setCustomized] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!customized) setHunterCount(suggestion)
  }, [suggestion, customized])

  const shareLink = `${window.location.origin}${window.location.pathname}?room=${room.code}`

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setCopied('')
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-5 py-8 sm:py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Waiting room
          </p>
          <h1 className="mt-1 text-2xl font-black text-white">Room {room.code}</h1>
        </div>
        <span
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
            connected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-700 bg-slate-800/50 text-slate-400'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-emerald-400' : 'bg-slate-500'}`}
          />
          {connected ? 'Live' : 'Reconnecting'}
        </span>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Room code
        </p>
        <button
          type="button"
          onClick={() => copy(room.code, 'code')}
          className="mt-2 w-full py-2 text-4xl font-black tracking-[0.25em] text-white transition hover:text-emerald-400"
          title="Copy room code"
        >
          {room.code}
        </button>
        <p className="text-xs text-slate-500">
          {copied === 'code' ? 'Copied!' : 'Tap the code to copy it'}
        </p>
        <button
          type="button"
          onClick={() => copy(shareLink, 'link')}
          className="mt-4 w-full truncate rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-left text-xs text-slate-400 transition hover:border-slate-500"
        >
          <span className="text-emerald-400">Share link</span> · {shareLink}
          <span className="block text-slate-600">
            {copied === 'link' ? 'Link copied!' : 'Tap to copy the invite link'}
          </span>
        </button>
      </section>

      <section className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-300">
        <span className="text-xl">📍</span>
        <div>
          <p className="font-bold uppercase tracking-wider text-[11px] text-emerald-400">
            Active Game Arena
          </p>
          <p className="font-semibold text-slate-200">
            BMS Institute of Technology &amp; Management (BMSIT)
          </p>
          <p className="text-[10px] text-slate-400">
            Doddaballapur Rd, Avalahalli, Yelahanka, Bangalore
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-300">
            Players <span className="text-slate-500">({playerCount})</span>
          </h2>
          <button
            type="button"
            onClick={onLeave}
            className="text-xs font-semibold text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
          >
            Leave room
          </button>
        </div>
        <PlayerList players={room.players} meId={room.me.id} />
        {playerCount < 2 && (
          <p className="text-center text-xs text-amber-400/80">
            At least 2 players are needed to start.
          </p>
        )}
      </section>

      {isHost ? (
        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Hunters</h2>
              <p className="text-xs text-slate-500">Suggested 1 : 4 ratio</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCustomized(true)
                  setHunterCount((value) => Math.max(1, value - 1))
                }}
                disabled={hunterCount <= 1}
                className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-950 text-lg font-bold text-slate-300 disabled:opacity-30"
              >
                −
              </button>
              <span className="w-6 text-center text-xl font-black text-white">
                {hunterCount}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomized(true)
                  setHunterCount((value) =>
                    Math.min(Math.max(1, playerCount - 1), value + 1),
                  )
                }}
                disabled={hunterCount >= Math.max(1, playerCount - 1)}
                className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-950 text-lg font-bold text-slate-300 disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onStart(hunterCount)}
            disabled={busy || playerCount < 2}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Starting…' : 'Start match'}
          </button>
          <p className="text-center text-xs text-slate-600">
            Roles are assigned randomly by the server and kept secret.
          </p>
        </section>
      ) : (
        <section className="flex items-center justify-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Waiting for the host to start the match…
        </section>
      )}
    </div>
  )
}

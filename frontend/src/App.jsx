import { useEffect, useState } from 'react'
import { useRoomSocket } from './hooks/useRoomSocket.js'
import { api } from './lib/api.js'
import { clearSession, loadSession, saveSession } from './lib/session.js'
import Home from './screens/Home.jsx'
import Lobby from './screens/Lobby.jsx'
import Match from './screens/Match.jsx'

export default function App() {
  const [session, setSession] = useState(loadSession)
  const [room, setRoom] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [joinCode, setJoinCode] = useState(
    () =>
      new URLSearchParams(window.location.search)
        .get('room')
        ?.toUpperCase()
        .slice(0, 6) || '',
  )

  useEffect(() => {
    if (!session) {
      setRoom(null)
      return undefined
    }
    let active = true
    setRoom(null)
    api
      .getRoom(session.code, session.token)
      .then((data) => {
        if (active) setRoom(data)
      })
      .catch((err) => {
        if (!active) return
        clearSession()
        setSession(null)
        setError(err.message)
      })
    return () => {
      active = false
    }
  }, [session])

  const connected = useRoomSocket(session?.code, session?.token, setRoom)

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      return await action()
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate() {
    const created = await run(() => api.createRoom(displayName.trim()))
    if (!created) return
    saveSession(created)
    setSession(created)
  }

  async function handleJoin(event) {
    event.preventDefault()
    const joined = await run(() =>
      api.joinRoom(joinCode.trim().toUpperCase(), displayName.trim()),
    )
    if (!joined) return
    saveSession(joined)
    setSession(joined)
  }

  async function handleStart(hunterCount) {
    const result = await run(() =>
      api.startMatch(session.code, session.token, hunterCount),
    )
    if (result) setRoom(result.room)
  }

  async function handleEnd() {
    const result = await run(() => api.endMatch(session.code, session.token))
    if (result) setRoom(result)
  }

  async function handleLeave() {
    if (session) {
      await run(() => api.leaveRoom(session.code, session.token))
    }
    clearSession()
    setSession(null)
    setRoom(null)
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }

  async function handleLocationUpdate(lat, lng) {
    if (!session?.code || !session?.token) return
    try {
      const updated = await api.updateLocation(session.code, session.token, lat, lng)
      if (updated) setRoom(updated)
    } catch {
      // Background location update failures are non-blocking
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_-20%,#064e3b_0%,#020617_55%)]">
      {error && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-rose-500/30 bg-rose-950/80 px-5 py-3 text-sm text-rose-200 backdrop-blur">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="shrink-0 text-lg leading-none text-rose-300"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {!session ? (
        <Home
          displayName={displayName}
          setDisplayName={setDisplayName}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          onCreate={handleCreate}
          onJoin={handleJoin}
          busy={busy}
        />
      ) : !room ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-slate-400">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
            <p className="text-sm">Joining room…</p>
          </div>
        </div>
      ) : room.status === 'WAITING' ? (
        <Lobby
          room={room}
          connected={connected}
          busy={busy}
          onStart={handleStart}
          onLeave={handleLeave}
        />
      ) : (
        <Match
          room={room}
          connected={connected}
          busy={busy}
          onLocationUpdate={handleLocationUpdate}
          onEnd={handleEnd}
          onLeave={handleLeave}
        />
      )}
    </div>
  )
}

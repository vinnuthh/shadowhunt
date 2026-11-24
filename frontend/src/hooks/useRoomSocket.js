import { useEffect, useRef, useState } from 'react'
import { WS_URL } from '../lib/api.js'

/** Push-only lobby socket with reconnect backoff. */
export function useRoomSocket(code, token, onState) {
  const [connected, setConnected] = useState(false)
  const onStateRef = useRef(onState)
  onStateRef.current = onState

  useEffect(() => {
    if (!code || !token) return undefined

    let socket = null
    let retryTimer = null
    let attempts = 0
    let stopped = false

    const connect = () => {
      if (stopped) return
      const url = `${WS_URL}/ws/rooms/${encodeURIComponent(code)}?token=${encodeURIComponent(token)}`
      socket = new WebSocket(url)

      socket.onopen = () => {
        attempts = 0
        setConnected(true)
      }

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'state') onStateRef.current?.(message.payload)
        } catch (error) {
          console.warn('Ignoring malformed room update', error)
        }
      }

      socket.onerror = () => socket?.close()

      socket.onclose = () => {
        setConnected(false)
        if (stopped) return
        attempts += 1
        const delay = Math.min(8000, 500 * 2 ** Math.min(attempts, 4))
        retryTimer = setTimeout(connect, delay)
      }
    }

    connect()
    return () => {
      stopped = true
      if (retryTimer) clearTimeout(retryTimer)
      socket?.close()
    }
  }, [code, token])

  return connected
}

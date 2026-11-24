import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import {
  BMSIT_BOUNDS,
  BMSIT_CENTER,
  BMSIT_LANDMARKS,
  BMSIT_POLYGON,
  getDistanceMeters,
  getNearestLandmark,
  isPointInBmsit,
} from '../lib/bmsitCampus.js'

// Fix default leaflet marker icon issue in bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const RADAR_CYCLE_SECONDS = 25

export default function CampusMap({ room, onLocationUpdate }) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const playerMarkerRef = useRef(null)
  const otherMarkersRef = useRef({})
  const radarCircleRef = useRef(null)
  const watchIdRef = useRef(null)
  const walkIntervalRef = useRef(null)

  // Start player at BMSIT center / BSN Block by default
  const [currentPos, setCurrentPos] = useState({
    lat: BMSIT_CENTER[0],
    lng: BMSIT_CENTER[1],
  })
  const [isGpsActive, setIsGpsActive] = useState(false)
  const [isSimulatedWalk, setIsSimulatedWalk] = useState(false)
  const [radarCountdown, setRadarCountdown] = useState(RADAR_CYCLE_SECONDS)
  const [mapStyle, setMapStyle] = useState('dark') // 'dark' | 'osm'
  const [radarPulseActive, setRadarPulseActive] = useState(false)

  const myRole = room?.me?.role || 'SPECTATOR'
  const isHunter = myRole === 'HUNTER'
  const isShadow = myRole === 'SHADOW'
  const ended = room?.status === 'ENDED'

  const insideCampus = isPointInBmsit(currentPos.lat, currentPos.lng)
  const nearest = getNearestLandmark(currentPos.lat, currentPos.lng)
  const distanceToGate = getDistanceMeters(
    currentPos.lat,
    currentPos.lng,
    13.1325,
    77.5688,
  )

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: BMSIT_CENTER,
      zoom: 17,
      minZoom: 15,
      maxZoom: 19,
      maxBounds: [
        [13.125, 77.558],
        [13.142, 77.578],
      ],
      attributionControl: false,
    })

    // Stealth Dark tactical map tiles by default (watermark-free)
    const darkTileLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        className: 'dark-map-tiles',
      },
    ).addTo(map)

    map._darkLayer = darkTileLayer

    // Draw glowing BMSIT Campus Geofence Boundary Polygon
    const campusBoundary = L.polygon(BMSIT_POLYGON, {
      color: '#10b981',
      weight: 3,
      opacity: 0.9,
      fillColor: '#10b981',
      fillOpacity: 0.08,
      dashArray: '8, 6',
      lineCap: 'round',
    }).addTo(map)

    campusBoundary.bindTooltip('BMSIT Campus Boundary', {
      permanent: false,
      direction: 'center',
      className: 'bg-slate-900 text-emerald-400 font-bold px-2 py-1 rounded text-xs border border-emerald-500/30',
    })

    // Add Landmark Pins
    BMSIT_LANDMARKS.forEach((landmark) => {
      const dangerBadgeColor = {
        Low: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        Medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        High: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
        Extreme: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
      }[landmark.dangerLevel] || 'text-slate-400'

      const customIcon = L.divIcon({
        className: 'custom-landmark-pin',
        html: `
          <div class="group relative flex flex-col items-center cursor-pointer transition transform hover:scale-110">
            <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/90 border border-slate-700 shadow-lg backdrop-blur-sm text-sm">
              ${landmark.icon}
            </div>
            <div class="mt-1 whitespace-nowrap rounded bg-slate-950/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-800 shadow">
              ${landmark.shortName}
            </div>
          </div>
        `,
        iconSize: [32, 48],
        iconAnchor: [16, 24],
      })

      const marker = L.marker(landmark.position, { icon: customIcon }).addTo(map)

      const popupContent = `
        <div class="p-1 space-y-2 text-slate-100 max-w-xs font-sans">
          <div class="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5">
            <span class="font-bold text-sm text-white flex items-center gap-1.5">
              <span>${landmark.icon}</span> ${landmark.name}
            </span>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">${landmark.description}</p>
          <div class="rounded-lg bg-slate-800/60 p-2 text-[11px] space-y-1 border border-slate-700/50">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Risk Factor:</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold border ${dangerBadgeColor}">${landmark.dangerLevel}</span>
            </div>
            <div class="text-slate-300"><span class="text-amber-400 font-semibold">Intel:</span> ${landmark.tacticalTip}</div>
          </div>
        </div>
      `

      marker.bindPopup(popupContent, {
        className: 'dark-leaflet-popup',
        closeButton: true,
      })
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Handle Map Style Switch
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (map._osmLayer) {
      map.removeLayer(map._osmLayer)
      map._osmLayer = null
    }
    if (map._darkLayer) {
      map.removeLayer(map._darkLayer)
      map._darkLayer = null
    }

    if (mapStyle === 'dark') {
      map._darkLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          className: 'dark-map-tiles',
        },
      ).addTo(map)
    } else {
      map._osmLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
        },
      ).addTo(map)
    }
  }, [mapStyle])

  // Update Player Marker and Radar Sweep
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const roleColor = isHunter ? '#f59e0b' : isShadow ? '#a855f7' : '#38bdf8'
    const roleBorder = isHunter
      ? 'border-amber-400'
      : isShadow
        ? 'border-violet-400'
        : 'border-sky-400'
    const roleBg = isHunter ? 'bg-amber-500' : isShadow ? 'bg-violet-500' : 'bg-sky-500'

    const playerHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute h-8 w-8 rounded-full ${roleBg} opacity-40 animate-ping"></span>
        <div class="relative flex h-6 w-6 items-center justify-center rounded-full ${roleBg} border-2 ${roleBorder} text-white shadow-lg text-[10px] font-black">
          ●
        </div>
        <div class="absolute -bottom-5 whitespace-nowrap rounded-md bg-slate-950/95 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-white border border-slate-700 shadow-md">
          YOU (${isHunter ? 'HUNTER' : isShadow ? 'SHADOW' : 'ME'})
        </div>
      </div>
    `

    const playerIcon = L.divIcon({
      className: 'player-position-pin',
      html: playerHtml,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    if (!playerMarkerRef.current) {
      playerMarkerRef.current = L.marker([currentPos.lat, currentPos.lng], {
        icon: playerIcon,
        zIndexOffset: 1000,
      }).addTo(map)

      radarCircleRef.current = L.circle([currentPos.lat, currentPos.lng], {
        radius: 35,
        color: roleColor,
        weight: 1.5,
        fillColor: roleColor,
        fillOpacity: 0.12,
        dashArray: '4, 4',
      }).addTo(map)
    } else {
      playerMarkerRef.current.setLatLng([currentPos.lat, currentPos.lng])
      playerMarkerRef.current.setIcon(playerIcon)
      if (radarCircleRef.current) {
        radarCircleRef.current.setLatLng([currentPos.lat, currentPos.lng])
        radarCircleRef.current.setStyle({ color: roleColor, fillColor: roleColor })
      }
    }
  }, [currentPos, isHunter, isShadow])

  // Update Other Players Markers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !room?.players) return

    const myId = room.me?.id
    const currentMarkers = otherMarkersRef.current

    // Set of active player IDs with positions
    const activePlayerIds = new Set()

    room.players.forEach((p) => {
      if (p.id === myId || p.lat == null || p.lng == null) return

      activePlayerIds.add(p.id)
      const isOtherHunter = p.role === 'HUNTER'
      const isOtherShadow = p.role === 'SHADOW'
      const otherColor = isOtherHunter
        ? '#f59e0b'
        : isOtherShadow
          ? '#a855f7'
          : '#94a3b8'
      const otherBg = isOtherHunter
        ? 'bg-amber-500'
        : isOtherShadow
          ? 'bg-violet-500'
          : 'bg-slate-500'

      const otherHtml = `
        <div class="relative flex items-center justify-center">
          <div class="relative flex h-5 w-5 items-center justify-center rounded-full ${otherBg} border-2 border-white shadow-md text-white text-[9px] font-black">
            ${isOtherHunter ? 'H' : isOtherShadow ? 'S' : '?'}
          </div>
          <div class="absolute -bottom-4 whitespace-nowrap rounded bg-slate-900/90 px-1 py-0.2 text-[9px] font-bold text-slate-300 border border-slate-700 shadow">
            ${p.display_name}
          </div>
        </div>
      `

      const otherIcon = L.divIcon({
        className: 'teammate-pin',
        html: otherHtml,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      if (currentMarkers[p.id]) {
        currentMarkers[p.id].setLatLng([p.lat, p.lng])
        currentMarkers[p.id].setIcon(otherIcon)
      } else {
        const marker = L.marker([p.lat, p.lng], { icon: otherIcon }).addTo(map)
        marker.bindTooltip(
          `${p.display_name} (${p.role || 'Player'})`,
          { direction: 'top', offset: [0, -10] },
        )
        currentMarkers[p.id] = marker
      }
    })

    // Clean up markers for removed players
    Object.keys(currentMarkers).forEach((id) => {
      if (!activePlayerIds.has(id)) {
        map.removeLayer(currentMarkers[id])
        delete currentMarkers[id]
      }
    })
  }, [room?.players, room?.me?.id])

  // 25-Second Radar Ping Loop (Phase 2 Master Blueprint)
  useEffect(() => {
    const timer = setInterval(() => {
      setRadarCountdown((prev) => {
        if (prev <= 1) {
          // Trigger radar ping sweep
          setRadarPulseActive(true)
          setTimeout(() => setRadarPulseActive(false), 2000)

          // Sync location to backend
          if (onLocationUpdate) {
            onLocationUpdate(currentPos.lat, currentPos.lng)
          }
          return RADAR_CYCLE_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentPos, onLocationUpdate])

  // Live GPS Tracking Handler
  const toggleGps = () => {
    if (isGpsActive) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setIsGpsActive(false)
    } else {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.')
        return
      }

      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }
          setCurrentPos(newPos)
          if (onLocationUpdate) {
            onLocationUpdate(newPos.lat, newPos.lng)
          }
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([newPos.lat, newPos.lng])
          }
        },
        (err) => {
          console.warn('Geolocation watch error:', err)
          setIsGpsActive(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      )
      watchIdRef.current = id
      setIsGpsActive(true)
      setIsSimulatedWalk(false)
    }
  }

  // Simulated Walk around BMSIT Campus for Demo / Testing
  const toggleSimulatedWalk = () => {
    if (isSimulatedWalk) {
      clearInterval(walkIntervalRef.current)
      walkIntervalRef.current = null
      setIsSimulatedWalk(false)
    } else {
      if (isGpsActive && watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
        setIsGpsActive(false)
      }

      let step = 0
      const waypoints = BMSIT_LANDMARKS.map((lm) => lm.position)

      walkIntervalRef.current = setInterval(() => {
        step = (step + 1) % waypoints.length
        const [targetLat, targetLng] = waypoints[step]
        const jitterLat = targetLat + (Math.random() - 0.5) * 0.0001
        const jitterLng = targetLng + (Math.random() - 0.5) * 0.0001
        const newPos = { lat: jitterLat, lng: jitterLng }
        setCurrentPos(newPos)

        if (onLocationUpdate) {
          onLocationUpdate(newPos.lat, newPos.lng)
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([newPos.lat, newPos.lng])
        }
      }, 3500)

      setIsSimulatedWalk(true)
    }
  }

  // Teleport to a specific BMSIT Landmark
  const jumpToLandmark = (landmark) => {
    if (isGpsActive && watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      setIsGpsActive(false)
    }
    const [lat, lng] = landmark.position
    const newPos = { lat, lng }
    setCurrentPos(newPos)
    if (onLocationUpdate) {
      onLocationUpdate(lat, lng)
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 18)
    }
  }

  // Recenter on BMSIT
  const recenterBmsit = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(BMSIT_BOUNDS, { padding: [25, 25] })
    }
  }

  return (
    <div className="space-y-4">
      {/* Map Header & Geofence Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                insideCampus ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                insideCampus ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
              BMSIT &amp; M, Bangalore
            </h3>
            <p className="text-[11px] text-slate-400">
              Yelahanka Campus Geofence Radar
            </p>
          </div>
        </div>

        {/* 25-Second Radar Countdown Badge */}
        <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono text-slate-300">
          <span
            className={`h-2 w-2 rounded-full ${
              radarPulseActive
                ? 'animate-ping bg-cyan-400'
                : 'bg-cyan-500/80'
            }`}
          />
          <span>Scan in:</span>
          <span className="font-bold text-cyan-400">{radarCountdown}s</span>
        </div>
      </div>

      {/* Geofence Status Alert Banner */}
      <div
        className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs transition ${
          insideCampus
            ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
            : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>{insideCampus ? '📍' : '⚠️'}</span>
          <div>
            <span className="font-black tracking-wide">
              {insideCampus
                ? 'INSIDE BMSIT CAMPUS PERIMETER'
                : 'OUTSIDE BMSIT CAMPUS BOUNDARY'}
            </span>
            <span className="block text-[10px] opacity-80">
              {insideCampus
                ? nearest
                  ? `Closest: ${nearest.name} (~${nearest.distanceMeters}m away)`
                  : 'All GPS points secured inside college limits.'
                : `You are ~${distanceToGate}m from BMSIT Main Gate. Use quick-jump to test.`}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={recenterBmsit}
          className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-700"
          title="Recenter view on BMSIT campus"
        >
          Recenter
        </button>
      </div>

      {/* Tactical Leaflet Map Canvas */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div
          ref={mapContainerRef}
          className="h-[360px] sm:h-[420px] w-full"
          style={{ background: '#020617' }}
        />

        {/* Radar Sweep Effect Overlay */}
        {radarPulseActive && (
          <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
            <div className="h-full w-full animate-ping rounded-full border border-cyan-400/30 bg-cyan-500/5 opacity-80" />
          </div>
        )}

        {/* Map Overlays: Layer Switcher & Role HUD */}
        <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 rounded-xl border border-slate-800/80 bg-slate-950/80 p-1 backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={() => setMapStyle('dark')}
            className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
              mapStyle === 'dark'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tactical Dark
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('osm')}
            className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
              mapStyle === 'osm'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Street View
          </button>
        </div>

        {/* Role Watermark */}
        <div className="absolute top-3 right-3 z-[400] rounded-xl border border-slate-800/80 bg-slate-950/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
          {isHunter ? (
            <span className="text-amber-400">Hunter Radar</span>
          ) : isShadow ? (
            <span className="text-violet-400">Shadow Stealth</span>
          ) : (
            <span className="text-slate-400">Spectator</span>
          )}
        </div>
      </div>

      {/* GPS & Walk Simulation Controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={toggleGps}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition shadow ${
            isGpsActive
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500'
          }`}
        >
          <span>{isGpsActive ? '🟢' : '📡'}</span>
          <span>{isGpsActive ? 'GPS Active' : 'Enable Device GPS'}</span>
        </button>

        <button
          type="button"
          onClick={toggleSimulatedWalk}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition shadow ${
            isSimulatedWalk
              ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
              : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500'
          }`}
        >
          <span>{isSimulatedWalk ? '🏃' : '🚶'}</span>
          <span>{isSimulatedWalk ? 'Simulating Walk…' : 'Simulate Walk'}</span>
        </button>
      </div>

      {/* BMSIT Campus Landmark Quick-Jump (Testing / Navigation) */}
      <div className="rounded-2xl border border-slate-800/90 bg-slate-900/40 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Quick Jump to BMSIT Landmarks
          </p>
          <span className="text-[10px] text-slate-500">Tap to teleport marker</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BMSIT_LANDMARKS.slice(0, 8).map((lm) => (
            <button
              key={lm.id}
              type="button"
              onClick={() => jumpToLandmark(lm)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500/50 hover:bg-slate-800"
            >
              <span>{lm.icon}</span>
              <span>{lm.shortName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * BMS Institute of Technology and Management (BMSIT), Bangalore Campus Configuration
 * Location: Avalahalli, Doddaballapur Main Road, Yelahanka, Bengaluru, Karnataka 560064
 */

export const BMSIT_CENTER = [13.133743, 77.568174]

export const BMSIT_BOUNDS = [
  [13.1321414, 77.5659762], // Southwest corner
  [13.1356572, 77.5700692], // Northeast corner
]

// Exact 20-point OpenStreetMap campus boundary polygon for BMSIT (way 133125316)
export const BMSIT_POLYGON = [
  [13.1345915, 77.5659762],
  [13.1347274, 77.5669149],
  [13.1340404, 77.566746],
  [13.1329721, 77.5667647],
  [13.1328149, 77.5671211],
  [13.1321414, 77.5686476],
  [13.1328676, 77.5687978],
  [13.1325907, 77.5700692],
  [13.1334464, 77.569721],
  [13.1347326, 77.5691841],
  [13.1346803, 77.5689749],
  [13.1346542, 77.5688408],
  [13.1346333, 77.5687549],
  [13.1351087, 77.5669203],
  [13.1354235, 77.5669566],
  [13.1355737, 77.5669739],
  [13.1356572, 77.566577],
  [13.1352759, 77.5665341],
  [13.1353438, 77.5662176],
  [13.1345915, 77.5659762],
]

export const BMSIT_LANDMARKS = [
  {
    id: 'bsn_block',
    name: 'BSN Block (Library & ECE)',
    shortName: 'BSN Block',
    category: 'Academic',
    position: [13.1342, 77.568],
    icon: '🏛️',
    description: 'Central library, ECE/CSE departments, seminar halls & campus server.',
    tacticalTip: 'Multi-story complex with wide stairs — high cover for Shadows.',
    dangerLevel: 'Medium',
  },
  {
    id: 'academic_block_1',
    name: 'Academic Block I',
    shortName: 'Block 1',
    category: 'Academic',
    position: [13.1336, 77.5675],
    icon: '🎓',
    description: 'Main lecture halls, dean office and departmental classrooms.',
    tacticalTip: 'Long continuous corridors with multiple stairway exits.',
    dangerLevel: 'High',
  },
  {
    id: 'lab_block',
    name: 'Mechanical & Lab Block',
    shortName: 'Lab Block',
    category: 'Labs',
    position: [13.1348, 77.5673],
    icon: '⚙️',
    description: 'Workshops, machinery floors and specialized engineering labs.',
    tacticalTip: 'Industrial equipment partitions offer excellent stealth spots.',
    dangerLevel: 'Low',
  },
  {
    id: 'amphitheatre',
    name: 'Open-Air Amphitheatre',
    shortName: 'Amphitheatre',
    category: 'Cultural',
    position: [13.1338, 77.5683],
    icon: '🎭',
    description: 'Circular central amphitheatre for campus cultural fests and events.',
    tacticalTip: 'Open bowl with tiered concrete seats — hunters have clear visual sightlines.',
    dangerLevel: 'Extreme',
  },
  {
    id: 'canteen',
    name: 'Campus Food Court & Canteen',
    shortName: 'Food Court',
    category: 'Dining',
    position: [13.1334, 77.5687],
    icon: '🍔',
    description: 'Student cafeteria, snack stalls and open dining benches.',
    tacticalTip: 'Heavy crowd movements provide great distraction opportunities.',
    dangerLevel: 'Medium',
  },
  {
    id: 'sports_ground',
    name: 'College Sports Ground',
    shortName: 'Sports Ground',
    category: 'Sports',
    position: [13.133, 77.5694],
    icon: '⚽',
    description: 'Multipurpose ground for cricket, football and athletic track.',
    tacticalTip: 'Completely open terrain — sprint across quickly or avoid.',
    dangerLevel: 'Extreme',
  },
  {
    id: 'basketball_court',
    name: 'Basketball & Volleyball Courts',
    shortName: 'Basketball Arena',
    category: 'Sports',
    position: [13.1337, 77.5695],
    icon: '🏀',
    description: 'Fenced floodlit court along the eastern border.',
    tacticalTip: 'Fenced perimeter limits escape angles.',
    dangerLevel: 'High',
  },
  {
    id: 'boys_hostel',
    name: 'Boys Hostel Complex',
    shortName: 'Boys Hostel',
    category: 'Residential',
    position: [13.135, 77.5665],
    icon: '🏢',
    description: 'On-campus residential wings on northwest campus edge.',
    tacticalTip: 'Good defensive hold point with courtyard.',
    dangerLevel: 'Low',
  },
  {
    id: 'main_gate',
    name: 'Main Entrance Gate',
    shortName: 'Main Gate',
    category: 'Access',
    position: [13.1325, 77.5688],
    icon: '🚪',
    description: 'Doddaballapur Main Road entrance, security gates and campus arch.',
    tacticalTip: 'Perimeter check point. Easy extraction or ambush spot.',
    dangerLevel: 'Medium',
  },
  {
    id: 'parking_admin',
    name: 'Admin & Parking Area',
    shortName: 'Admin & Parking',
    category: 'Access',
    position: [13.1327, 77.5682],
    icon: '🚗',
    description: 'Two-wheeler and four-wheeler campus parking rows.',
    tacticalTip: 'Low vehicle rows provide crouch cover.',
    dangerLevel: 'Medium',
  },
]

/**
 * Ray-casting algorithm to test if a coordinate is inside the BMSIT campus polygon.
 */
export function isPointInBmsit(lat, lng) {
  if (!lat || !lng) return false
  const polygon = BMSIT_POLYGON
  let inside = false
  const n = polygon.length

  let j = n - 1
  for (let i = 0; i < n; i++) {
    const [latI, lngI] = polygon[i]
    const [latJ, lngJ] = polygon[j]

    if (
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI + 1e-12) + latI
    ) {
      inside = !inside
    }
    j = i
  }

  return inside
}

/**
 * Calculates distance between two coordinates in meters (Haversine formula).
 */
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * Finds the nearest BMSIT landmark to the given point.
 */
export function getNearestLandmark(lat, lng) {
  if (!lat || !lng) return null
  let nearest = null
  let minDistance = Infinity

  for (const landmark of BMSIT_LANDMARKS) {
    const dist = getDistanceMeters(lat, lng, landmark.position[0], landmark.position[1])
    if (dist < minDistance) {
      minDistance = dist
      nearest = { ...landmark, distanceMeters: dist }
    }
  }

  return nearest
}

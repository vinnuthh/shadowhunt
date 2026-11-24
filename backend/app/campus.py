"""BMSIT (BMS Institute of Technology and Management), Bangalore Campus Configuration.

Defines the campus boundary polygon, key academic blocks, student facilities,
and geofencing utilities for Shadow Hunt.
"""

from typing import Any

# Exact OpenStreetMap way:133125316 polygon vertices for BMSIT Bangalore campus (Avalahalli, Yelahanka)
# Each point is (latitude, longitude)
BMSIT_BOUNDARY_COORDINATES: list[tuple[float, float]] = [
    (13.1345915, 77.5659762),
    (13.1347274, 77.5669149),
    (13.1340404, 77.5667460),
    (13.1329721, 77.5667647),
    (13.1328149, 77.5671211),
    (13.1321414, 77.5686476),
    (13.1328676, 77.5687978),
    (13.1325907, 77.5700692),
    (13.1334464, 77.5697210),
    (13.1347326, 77.5691841),
    (13.1346803, 77.5689749),
    (13.1346542, 77.5688408),
    (13.1346333, 77.5687549),
    (13.1351087, 77.5669203),
    (13.1354235, 77.5669566),
    (13.1355737, 77.5669739),
    (13.1356572, 77.5665770),
    (13.1352759, 77.5665341),
    (13.1353438, 77.5662176),
    (13.1345915, 77.5659762),
]

BMSIT_LANDMARKS: list[dict[str, Any]] = [
    {
        "id": "bsn_block",
        "name": "BSN Block (Central Library & ECE)",
        "short_name": "BSN Block",
        "category": "Academic",
        "lat": 13.1342,
        "lng": 77.5680,
        "description": "Multi-story B.S. Narayan block housing the central library, ECE departments, seminar halls & data centre.",
        "tactical_note": "High cover multi-floor building with several stairwells.",
    },
    {
        "id": "academic_block_1",
        "name": "Academic Block I",
        "short_name": "Academic Block 1",
        "category": "Academic",
        "lat": 13.1336,
        "lng": 77.5675,
        "description": "Core engineering lecture halls, administration and faculty offices.",
        "tactical_note": "Long corridors with multiple entry and exit points.",
    },
    {
        "id": "lab_block",
        "name": "Mechanical & Lab Block",
        "short_name": "Lab Block",
        "category": "Labs",
        "lat": 13.1348,
        "lng": 77.5673,
        "description": "Specialized engineering workshops, robotics and mechanical labs.",
        "tactical_note": "Spacious workshop alleys and machinery partitions.",
    },
    {
        "id": "amphitheatre",
        "name": "Open-Air Amphitheatre",
        "short_name": "Amphitheatre",
        "category": "Cultural",
        "lat": 13.1338,
        "lng": 77.5683,
        "description": "Central circular amphitheatre for cultural fests and student gatherings.",
        "tactical_note": "Central open zone with tiered seating; high visibility for hunters.",
    },
    {
        "id": "canteen",
        "name": "Campus Food Court & Canteen",
        "short_name": "Food Court",
        "category": "Dining",
        "lat": 13.1334,
        "lng": 77.5687,
        "description": "Main student cafeteria and snack counters.",
        "tactical_note": "Frequent student activity hub with multiple exits.",
    },
    {
        "id": "sports_ground",
        "name": "College Sports Ground",
        "short_name": "Sports Ground",
        "category": "Sports",
        "lat": 13.1330,
        "lng": 77.5694,
        "description": "Large multipurpose open field for football, cricket and track events.",
        "tactical_note": "Wide-open sprint area with minimal cover.",
    },
    {
        "id": "basketball_court",
        "name": "Basketball Courts",
        "short_name": "Basketball Arena",
        "category": "Sports",
        "lat": 13.1337,
        "lng": 77.5695,
        "description": "Outdoor floodlit basketball and volleyball courts.",
        "tactical_note": "Fenced sports zone along east campus edge.",
    },
    {
        "id": "boys_hostel",
        "name": "Boys Hostel Complex",
        "short_name": "Boys Hostel",
        "category": "Residential",
        "lat": 13.1350,
        "lng": 77.5665,
        "description": "On-campus residential hostel blocks for male students.",
        "tactical_note": "Northwest perimeter residential wing.",
    },
    {
        "id": "main_gate",
        "name": "Main Entrance Gate",
        "short_name": "Main Gate",
        "category": "Access",
        "lat": 13.1325,
        "lng": 77.5688,
        "description": "Primary college entrance on Doddaballapur Main Road, Yelahanka.",
        "tactical_note": "Main access checkpoint with guard posts.",
    },
    {
        "id": "parking_admin",
        "name": "Admin Block & Parking",
        "short_name": "Admin & Parking",
        "category": "Access",
        "lat": 13.1327,
        "lng": 77.5682,
        "description": "Visitor and faculty parking zone adjacent to administrative wing.",
        "tactical_note": "Vehicle rows provide low ground cover.",
    },
]

BMSIT_CAMPUS = {
    "id": "bmsit-bangalore",
    "name": "BMS Institute of Technology and Management",
    "short_name": "BMSIT Bangalore",
    "location": "Doddaballapur Main Road, Avalahalli, Yelahanka, Bengaluru, Karnataka 560064",
    "center": {"lat": 13.133743, "lng": 77.568174},
    "default_zoom": 17,
    "bounds": {
        "north": 13.135657,
        "south": 13.132141,
        "west": 77.565976,
        "east": 77.570069,
    },
    "boundary": [
        {"lat": lat, "lng": lng} for lat, lng in BMSIT_BOUNDARY_COORDINATES
    ],
    "landmarks": BMSIT_LANDMARKS,
}


def is_point_in_bmsit(lat: float, lng: float) -> bool:
    """Ray-casting point-in-polygon algorithm to check if GPS coordinate is inside BMSIT campus."""
    inside = False
    polygon = BMSIT_BOUNDARY_COORDINATES
    n = len(polygon)
    if n < 3:
        return False

    j = n - 1
    for i in range(n):
        lat_i, lng_i = polygon[i]
        lat_j, lng_j = polygon[j]

        # Check if ray intersects edge
        if ((lng_i > lng) != (lng_j > lng)) and (
            lat < (lat_j - lat_i) * (lng - lng_i) / (lng_j - lng_i + 1e-12) + lat_i
        ):
            inside = not inside
        j = i

    return inside

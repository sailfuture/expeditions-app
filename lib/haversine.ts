/**
 * Calculate the distance between two points using the Haversine formula
 * Returns distance in nautical miles
 */
export function calculateNauticalMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3440.065 // Earth's radius in nautical miles
  
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate nautical miles between two location objects
 * Each location should have lat and long properties
 */
export function calculateDistanceBetweenLocations(
  currentLocation: { lat?: number; long?: number } | null,
  destination: { lat?: number; long?: number } | null
): number | null {
  if (
    !currentLocation?.lat ||
    !currentLocation?.long ||
    !destination?.lat ||
    !destination?.long
  ) {
    return null
  }
  
  return calculateNauticalMiles(
    currentLocation.lat,
    currentLocation.long,
    destination.lat,
    destination.long
  )
}

/**
 * Validate latitude and longitude values
 */
function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

/**
 * Waypoint interface
 */
export interface Waypoint {
  name?: string
  port?: string
  lat: number
  lon?: number
  long?: number
}

/**
 * Leg interface - represents one segment of the route
 */
export interface RouteLeg {
  from: string
  to: string
  nm: number
}

/**
 * Route calculation result
 */
export interface RouteDistance {
  legs: RouteLeg[]
  total_nm: number
}

/**
 * Calculate total route distance from an ordered list of waypoints
 * Uses great-circle distance (Haversine formula)
 * 
 * @param waypoints - Array of waypoints with lat/lon coordinates (minimum 2 points)
 * @returns Object containing per-leg distances and total distance in nautical miles
 * @throws Error if waypoints array has fewer than 2 points or invalid coordinates
 */
export function calculateRouteDistance(waypoints: Waypoint[]): RouteDistance {
  if (waypoints.length < 2) {
    throw new Error('Route requires at least 2 waypoints')
  }

  const legs: RouteLeg[] = []
  let totalDistance = 0

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i]
    const to = waypoints[i + 1]

    // Get longitude (support both 'lon' and 'long' properties)
    const fromLon = from.lon ?? from.long
    const toLon = to.lon ?? to.long

    // Validate coordinates
    if (
      from.lat === undefined ||
      fromLon === undefined ||
      to.lat === undefined ||
      toLon === undefined
    ) {
      throw new Error(
        `Missing coordinates for waypoint at index ${i} or ${i + 1}`
      )
    }

    if (!validateCoordinates(from.lat, fromLon)) {
      throw new Error(
        `Invalid coordinates for waypoint "${from.name || from.port || i}": lat=${from.lat}, lon=${fromLon}`
      )
    }

    if (!validateCoordinates(to.lat, toLon)) {
      throw new Error(
        `Invalid coordinates for waypoint "${to.name || to.port || i + 1}": lat=${to.lat}, lon=${toLon}`
      )
    }

    // Calculate distance for this leg
    const distance = calculateNauticalMiles(from.lat, fromLon, to.lat, toLon)

    legs.push({
      from: from.name || from.port || `Waypoint ${i + 1}`,
      to: to.name || to.port || `Waypoint ${i + 2}`,
      nm: Math.round(distance * 10) / 10, // Round to 1 decimal place
    })

    totalDistance += distance
  }

  return {
    legs,
    total_nm: Math.round(totalDistance * 10) / 10, // Round to 1 decimal place
  }
}

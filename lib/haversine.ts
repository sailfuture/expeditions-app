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


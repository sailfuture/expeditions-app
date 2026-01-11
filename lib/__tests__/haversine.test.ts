import { calculateRouteDistance, Waypoint } from '../haversine'

describe('calculateRouteDistance', () => {
  // Sample waypoints from the requirements
  const sampleWaypoints: Waypoint[] = [
    { port: 'Shelter Bay', lat: 9.3547, long: -79.9539 },
    { port: 'Bocas del Toro', lat: 9.3400, long: -82.2400 },
    { port: 'Providencia', lat: 13.3567, long: -81.3739 },
    { port: 'Montego Bay', lat: 18.4762, long: -77.8939 },
    { port: 'Bayahibe', lat: 18.3173, long: -68.7805 },
  ]

  test('should calculate route distance for sample waypoints', () => {
    const result = calculateRouteDistance(sampleWaypoints)
    
    // Verify structure
    expect(result).toHaveProperty('legs')
    expect(result).toHaveProperty('total_nm')
    expect(Array.isArray(result.legs)).toBe(true)
    expect(result.legs.length).toBe(4) // 5 waypoints = 4 legs
    
    // Verify each leg has required properties
    result.legs.forEach(leg => {
      expect(leg).toHaveProperty('from')
      expect(leg).toHaveProperty('to')
      expect(leg).toHaveProperty('nm')
      expect(typeof leg.nm).toBe('number')
      expect(leg.nm).toBeGreaterThan(0)
    })
    
    // Verify total is sum of legs
    const sumOfLegs = result.legs.reduce((sum, leg) => sum + leg.nm, 0)
    expect(Math.abs(result.total_nm - sumOfLegs)).toBeLessThan(0.1) // Allow small rounding difference
    
    // Total distance should be reasonable (between 1000-2000 nm for this route)
    expect(result.total_nm).toBeGreaterThan(1000)
    expect(result.total_nm).toBeLessThan(2000)
    
    console.log('Route calculation result:', result)
  })

  test('should support both lon and long properties', () => {
    const waypointsWithLon: Waypoint[] = [
      { port: 'Start', lat: 10.0, lon: -80.0 },
      { port: 'End', lat: 11.0, lon: -81.0 },
    ]
    
    const result = calculateRouteDistance(waypointsWithLon)
    expect(result.legs.length).toBe(1)
    expect(result.total_nm).toBeGreaterThan(0)
  })

  test('should throw error for less than 2 waypoints', () => {
    const singleWaypoint: Waypoint[] = [
      { port: 'Shelter Bay', lat: 9.3547, long: -79.9539 },
    ]
    
    expect(() => calculateRouteDistance(singleWaypoint)).toThrow('Route requires at least 2 waypoints')
  })

  test('should throw error for invalid latitude', () => {
    const invalidWaypoints: Waypoint[] = [
      { port: 'Invalid', lat: 91.0, long: -79.0 }, // lat > 90
      { port: 'Valid', lat: 10.0, long: -80.0 },
    ]
    
    expect(() => calculateRouteDistance(invalidWaypoints)).toThrow(/Invalid coordinates/)
  })

  test('should throw error for invalid longitude', () => {
    const invalidWaypoints: Waypoint[] = [
      { port: 'Valid', lat: 10.0, long: -80.0 },
      { port: 'Invalid', lat: 10.0, long: 181.0 }, // long > 180
    ]
    
    expect(() => calculateRouteDistance(invalidWaypoints)).toThrow(/Invalid coordinates/)
  })

  test('should throw error for missing coordinates', () => {
    const incompleteWaypoints: any[] = [
      { port: 'Start', lat: 10.0 }, // missing long
      { port: 'End', lat: 11.0, long: -81.0 },
    ]
    
    expect(() => calculateRouteDistance(incompleteWaypoints)).toThrow(/Missing coordinates/)
  })

  test('should calculate known distances accurately', () => {
    // Test a known distance: Shelter Bay to Bocas del Toro
    const twoPoints: Waypoint[] = [
      { port: 'Shelter Bay', lat: 9.3547, long: -79.9539 },
      { port: 'Bocas del Toro', lat: 9.3400, long: -82.2400 },
    ]
    
    const result = calculateRouteDistance(twoPoints)
    
    // Expected distance is approximately 137 nautical miles
    expect(result.total_nm).toBeGreaterThan(130)
    expect(result.total_nm).toBeLessThan(145)
    expect(result.legs[0].from).toBe('Shelter Bay')
    expect(result.legs[0].to).toBe('Bocas del Toro')
  })

  test('should handle waypoints with name property', () => {
    const namedWaypoints: Waypoint[] = [
      { name: 'Point A', lat: 10.0, long: -80.0 },
      { name: 'Point B', lat: 11.0, long: -81.0 },
    ]
    
    const result = calculateRouteDistance(namedWaypoints)
    expect(result.legs[0].from).toBe('Point A')
    expect(result.legs[0].to).toBe('Point B')
  })

  test('should round distances to 1 decimal place', () => {
    const result = calculateRouteDistance(sampleWaypoints)
    
    result.legs.forEach(leg => {
      const decimalPlaces = leg.nm.toString().split('.')[1]?.length || 0
      expect(decimalPlaces).toBeLessThanOrEqual(1)
    })
    
    const totalDecimalPlaces = result.total_nm.toString().split('.')[1]?.length || 0
    expect(totalDecimalPlaces).toBeLessThanOrEqual(1)
  })
})

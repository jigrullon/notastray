import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get the client's IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || 'unknown'

    // For development/localhost, use a default location
    if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return NextResponse.json({
        city: 'Portland',
        region: 'Oregon',
        country: 'United States',
        latitude: 45.5152,
        longitude: -122.6784,
        accuracy: 50000, // 50km accuracy for IP-based location
        method: 'ip',
        note: 'Approximate location based on internet connection'
      })
    }

    // Use a free IP geolocation service
    // For production, consider using services like MaxMind, IPinfo, or similar
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,timezone`)
    
    if (!response.ok) {
      throw new Error('IP location service unavailable')
    }

    const data = await response.json()

    if (data.status === 'fail') {
      throw new Error(data.message || 'Failed to get location')
    }

    return NextResponse.json({
      city: data.city,
      region: data.regionName,
      country: data.country,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      accuracy: 50000, // IP-based location is typically accurate to city level (~50km)
      method: 'ip',
      note: 'Approximate location based on internet connection'
    })

  } catch (error) {
    console.error('IP location error:', error)
    
    // Return a fallback location if everything fails
    return NextResponse.json({
      city: 'Unknown',
      region: 'Unknown',
      country: 'Unknown',
      latitude: null,
      longitude: null,
      accuracy: null,
      method: 'ip',
      error: 'Could not determine location',
      note: 'Location services unavailable'
    })
  }
}
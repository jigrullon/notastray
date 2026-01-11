import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude required' }, { status: 400 })
  }

  try {
    // Using a free geocoding service (you might want to use Google Maps API, MapBox, etc.)
    // For production, you'd use a proper geocoding service with your API key
    
    // Example with OpenStreetMap Nominatim (free but has rate limits)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'NotAStray Pet Tag Service'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Geocoding service unavailable')
    }

    const data = await response.json()
    
    // Format the address nicely
    let address = 'Unknown location'
    if (data.display_name) {
      // Parse the address components for a cleaner display
      const parts = data.display_name.split(', ')
      if (parts.length >= 3) {
        // Take the first few parts for a concise address
        address = parts.slice(0, 3).join(', ')
      } else {
        address = data.display_name
      }
    }

    return NextResponse.json({ 
      address,
      fullAddress: data.display_name,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }
    })

  } catch (error) {
    console.error('Geocoding error:', error)
    
    // Fallback to coordinates if geocoding fails
    return NextResponse.json({ 
      address: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      error: 'Could not resolve address'
    })
  }
}
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    if (!lat || !lng) {
        return NextResponse.json({ error: 'Latitude and longitude required' }, { status: 400 })
    }

    try {
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

        let address = 'Unknown location'
        if (data.display_name) {
            const parts = data.display_name.split(', ')
            if (parts.length >= 3) {
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

        return NextResponse.json({
            address: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
            coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
            error: 'Could not resolve address'
        })
    }
}

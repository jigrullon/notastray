import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const forwarded = request.headers.get('x-forwarded-for')
        const realIp = request.headers.get('x-real-ip')
        const ip = forwarded?.split(',')[0] || realIp || 'unknown'

        if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return NextResponse.json({
                city: 'Portland',
                region: 'Oregon',
                country: 'United States',
                latitude: 45.5152,
                longitude: -122.6784,
                accuracy: 50000,
                method: 'ip',
                note: 'Approximate location based on internet connection'
            })
        }

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
            accuracy: 50000,
            method: 'ip',
            note: 'Approximate location based on internet connection'
        })

    } catch (error) {
        console.error('IP location error:', error)

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

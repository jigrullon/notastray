import { NextResponse } from 'next/server';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

// Nominal radius for a city-level IP lookup. ip-api's free tier returns a city
// centroid with no accuracy radius of its own, so this is our own honest
// characterization of how coarse that is — not a value from the provider.
const IP_CITY_ACCURACY_METERS = 25000

// Loopback, RFC1918 private ranges, and link-local. None of these can be
// geolocated: they identify a machine on a local network, not a place.
function isUnresolvableIp(ip: string): boolean {
    if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') return true
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('169.254.')) return true
    // 172.16.0.0 – 172.31.255.255
    const match = ip.match(/^172\.(\d{1,2})\./)
    if (match) {
        const second = Number(match[1])
        return second >= 16 && second <= 31
    }
    return false
}

export const GET = withObservability('ip-location', async (request: Request) => {
    try {
        // cf-connecting-ip first — on Cloudflare Pages it is the only header that
        // reliably holds the visitor's IP. Reading x-forwarded-for first would
        // geolocate a Cloudflare edge node instead, pinning the alert on whatever
        // city hosts that PoP rather than on the scanner.
        const cfIp = request.headers.get('cf-connecting-ip')
        const forwarded = request.headers.get('x-forwarded-for')
        const realIp = request.headers.get('x-real-ip')
        const ip = cfIp || forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

        // Local/private/unresolvable IPs cannot be geolocated. Return no location
        // rather than a stand-in coordinate — a wrong pin in a lost-pet alert is
        // worse than no pin, because the owner acts on it.
        if (isUnresolvableIp(ip)) {
            return NextResponse.json({
                city: null,
                region: null,
                country: null,
                latitude: null,
                longitude: null,
                accuracy: null,
                method: 'ip',
                error: 'Could not determine location',
                note: 'Location unavailable for this connection'
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

        // A successful response can still omit coordinates. Treat a missing
        // lat/lon as no location rather than emitting a half-formed result that
        // downstream code might turn into a map link.
        if (typeof data.lat !== 'number' || typeof data.lon !== 'number') {
            throw new Error('IP location response had no coordinates')
        }

        return NextResponse.json({
            city: data.city ?? null,
            region: data.regionName ?? null,
            country: data.country ?? null,
            latitude: data.lat,
            longitude: data.lon,
            timezone: data.timezone ?? null,
            accuracy: IP_CITY_ACCURACY_METERS,
            method: 'ip',
            note: 'Approximate location based on internet connection'
        })

    } catch (error) {
        log.warn('ip_location_lookup_failed', {
            error: error instanceof Error ? error.message : String(error),
        })

        return NextResponse.json({
            city: null,
            region: null,
            country: null,
            latitude: null,
            longitude: null,
            accuracy: null,
            method: 'ip',
            error: 'Could not determine location',
            note: 'Location services unavailable'
        })
    }
})

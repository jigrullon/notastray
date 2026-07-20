import { NextRequest, NextResponse } from 'next/server'

// Only Firebase Storage hosts are allowed — this route is a fetch proxy, so an
// unrestricted URL would let a caller make our server request any host (SSRF).
const ALLOWED_HOSTS = ['firebasestorage.googleapis.com', 'storage.googleapis.com']

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid imageUrl' },
        { status: 400 }
      )
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(imageUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid imageUrl' }, { status: 400 })
    }

    if (parsedUrl.protocol !== 'https:' || !ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'imageUrl host not allowed' }, { status: 400 })
    }

    // Fetch the image from Firebase Storage
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const blob = await response.blob()
    const buffer = await blob.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Determine media type from response headers or default to image/jpeg
    const contentType = blob.type || response.headers.get('content-type') || 'image/jpeg'
    const dataUrl = `data:${contentType};base64,${base64}`

    return NextResponse.json({ dataUrl })
  } catch (error) {
    console.error('Error proxying image:', error)
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    )
  }
}

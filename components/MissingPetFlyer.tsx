'use client'

import { useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Download, Share2 } from 'lucide-react'
import { useState } from 'react'
// Firebase is no longer needed for upload (using backend API instead)
import { useAuth } from '@/lib/AuthContext'

interface MissingPetFlyerProps {
  petName: string
  species: string
  gender: string
  breed?: string
  breedMix?: string
  weight?: string
  weightUnit?: string
  photo?: string
  lastSeenDate: string
  lastSeenLocation: string
  physicalDescription: string
  medicalBehavioral: string
  ownerName?: string
  ownerPhone?: string
  vetName?: string
  vetAddress?: string
  contactInfo: string
  rewardOffered: boolean
  tagCode: string
  isOwner?: boolean
}

export default function MissingPetFlyer({
  petName,
  species,
  gender,
  breed,
  breedMix,
  weight,
  weightUnit,
  photo,
  lastSeenDate,
  lastSeenLocation,
  physicalDescription,
  medicalBehavioral,
  ownerName,
  ownerPhone,
  vetName,
  vetAddress,
  contactInfo,
  rewardOffered,
  tagCode,
  isOwner = false,
}: MissingPetFlyerProps) {
  const { user } = useAuth()
  const flyerRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const primaryContact = ownerName && ownerPhone ? `${ownerName} - ${ownerPhone}` : ownerName || ownerPhone || contactInfo || (vetName ? `${vetName}${vetAddress ? ` - ${vetAddress}` : ''}` : '')

  const handleDownloadPDF = async () => {
    if (!flyerRef.current || !user) {
      alert('Please log in to download the PDF')
      return
    }
    setDownloading(true)
    try {
      // Convert Firebase image URL to a data URL via the server-side proxy.
      // The server fetch is not subject to browser CORS, so this path works
      // regardless of the storage bucket's CORS configuration. A proxy failure
      // is fatal-and-visible: proceeding would silently produce a PDF with a
      // broken image placeholder.
      const img = flyerRef.current.querySelector('img')
      let originalSrc = ''
      if (img && img.src && img.src.includes('firebasestorage')) {
        originalSrc = img.src
        const response = await fetch('/api/proxy-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: img.src }),
        })
        if (!response.ok) {
          throw new Error('Could not load the pet photo for the PDF. Please try again.')
        }
        const data = await response.json()
        img.src = data.dataUrl
      }

      const canvas = await html2canvas(flyerRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        // Hard cap on image loading so PDF generation can never hang indefinitely.
        imageTimeout: 15000,
      })

      // Restore original image src
      if (img && originalSrc) {
        img.src = originalSrc
      }

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: canvas.width > canvas.height ? [297, 210] : [210, 297],
      })

      const imgData = canvas.toDataURL('image/png')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

      const pdfBlob = pdf.output('blob') as Blob

      const fileName = `missing-pet-${petName.replace(/\s+/g, '-')}-${Date.now()}.pdf`
      const idToken = await user.getIdToken()

      const formData = new FormData()
      formData.append('tagCode', tagCode)
      formData.append('fileName', fileName)
      formData.append('pdf', pdfBlob, fileName)

      const uploadResponse = await fetch('/api/upload-missing-flyer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Failed to upload PDF')
      }

      const uploadData = await uploadResponse.json()
      const downloadUrl = uploadData.downloadUrl
      setPdfUrl(downloadUrl)

      // Trigger browser download using the signed URL
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert(`Failed to generate PDF: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setDownloading(false)
    }
  }


  return (
    <div className="space-y-6">
      {/* Flyer Preview */}
      <div
        ref={flyerRef}
        className="mx-auto w-full max-w-2xl bg-white"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Header Banner */}
        <div className="bg-orange-600 text-white py-4 px-6 text-center">
          <h1 className="text-5xl font-black tracking-tight m-0">
            MISSING {species.toUpperCase()}
          </h1>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Photo */}
          {photo && (
            <div className="mb-6 rounded-lg overflow-hidden bg-gray-200 aspect-square">
              {/* No crossOrigin attribute: a CORS-mode request would make the browser
                  refuse to render the image unless the storage bucket's CORS config
                  matches the current origin — the root cause of the recurring broken
                  image. Plain <img> renders cross-origin without any CORS headers.
                  PDF capture doesn't need it either: the photo is swapped to a
                  server-proxied data URL before html2canvas runs. */}
              <img
                src={photo}
                alt={petName}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Pet Name Banner */}
          <div className="bg-orange-600 text-white text-center py-3 px-4 rounded-lg mb-6">
            <p className="text-3xl font-black m-0">🐾 {petName.toUpperCase()} 🐾</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            {breed && (
              <div>
                <p className="font-bold text-gray-900 mb-1">Breed</p>
                <p className="text-gray-700">{breed}</p>
              </div>
            )}
            {gender && (
              <div>
                <p className="font-bold text-gray-900 mb-1">Gender</p>
                <p className="text-gray-700">{gender}</p>
              </div>
            )}
            {weight && (
              <div>
                <p className="font-bold text-gray-900 mb-1">Weight</p>
                <p className="text-gray-700">{weight} {weightUnit || 'lb'}</p>
              </div>
            )}
            {breedMix && (
              <div>
                <p className="font-bold text-gray-900 mb-1">Breed Mix</p>
                <p className="text-gray-700">{breedMix}</p>
              </div>
            )}
          </div>

          {/* Last Seen */}
          {(lastSeenDate || lastSeenLocation) && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
              <p className="font-bold text-red-900 text-sm mb-2">LAST SEEN</p>
              {lastSeenDate && <p className="text-red-800 font-semibold">{lastSeenDate}</p>}
              {lastSeenLocation && <p className="text-red-800 font-semibold">{lastSeenLocation}</p>}
            </div>
          )}

          {/* Physical & Behavioral */}
          {(physicalDescription || medicalBehavioral) && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
              {physicalDescription && (
                <div className="mb-3">
                  <p className="font-bold text-yellow-900 text-sm mb-1">DISTINCTIVE FEATURES</p>
                  <p className="text-yellow-800 text-sm">{physicalDescription}</p>
                </div>
              )}
              {medicalBehavioral && (
                <div>
                  <p className="font-bold text-yellow-900 text-sm mb-1">ALLERGIES / HEALTH INFO</p>
                  <p className="text-yellow-800 text-sm">{medicalBehavioral}</p>
                </div>
              )}
            </div>
          )}

          {/* Contact Banner */}
          <div className="bg-blue-600 text-white text-center py-4 px-4 rounded-lg mb-6">
            <p className="text-xl font-bold mb-3 m-0">IF YOU SEE THIS PET, CONTACT</p>
            <p className="text-3xl font-black m-0">{primaryContact}</p>
            {rewardOffered && (
              <p className="text-sm font-bold mt-3 m-0">💰 REWARD OFFERED</p>
            )}
          </div>

          {/* Pet Profile URL */}
          <div className="text-center border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
            <p className="text-xs text-gray-600 mb-2">Scan QR code or visit:</p>
            <p className="font-mono text-sm font-bold text-gray-900 mb-1">
              notastray.com/pet/{tagCode}
            </p>
            <p className="text-xs text-gray-500 m-0">Powered by NotAStray</p>
          </div>
        </div>
      </div>

      {/* Action Buttons - Owner Only */}
      {isOwner && (
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            {downloading ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      )}
    </div>
  )
}

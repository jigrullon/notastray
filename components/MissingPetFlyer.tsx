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
}: MissingPetFlyerProps) {
  const { user } = useAuth()
  const flyerRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const primaryContact = ownerName && ownerPhone ? `${ownerName} - ${ownerPhone}` : ownerName || ownerPhone || contactInfo || (vetName ? `${vetName}${vetAddress ? ` - ${vetAddress}` : ''}` : '')

  const handleDownloadPDF = async () => {
    console.log('Download button clicked, user:', user)
    if (!flyerRef.current || !user) {
      alert('Please log in to download the PDF')
      return
    }
    setDownloading(true)
    try {
      console.log('Starting PDF generation...')
      console.log('Flyer ref:', flyerRef.current)

      console.log('Calling html2canvas...')
      const canvas = await html2canvas(flyerRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: true, // Enable logging to see what html2canvas is doing
        useCORS: true,
        allowTaint: true,
      })

      console.log('Canvas generated, creating PDF...')

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: canvas.width > canvas.height ? [297, 210] : [210, 297],
      })

      const imgData = canvas.toDataURL('image/png')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

      // Get PDF as blob
      const pdfBlob = pdf.output('blob') as Blob

      // Upload via backend API with admin privileges
      console.log('Uploading PDF via backend API...')
      const fileName = `missing-pet-${petName.replace(/\s+/g, '-')}-${Date.now()}.pdf`
      console.log('Getting ID token...')
      const idToken = await user.getIdToken()
      console.log('ID token obtained, creating FormData...')

      // Use FormData to send binary data
      const formData = new FormData()
      formData.append('tagCode', tagCode)
      formData.append('fileName', fileName)
      formData.append('pdf', pdfBlob, fileName)
      console.log('FormData created, calling upload API...')

      const uploadResponse = await fetch('/api/upload-missing-flyer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      })
      console.log('Upload response received:', uploadResponse.status)

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Failed to upload PDF')
      }

      const uploadData = await uploadResponse.json()
      const downloadUrl = uploadData.downloadUrl

      console.log('PDF uploaded, triggering download...')
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
              <img
                src={photo}
                alt={petName}
                crossOrigin="anonymous"
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
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <p className="font-bold text-red-900 text-sm mb-2">LAST SEEN</p>
            <p className="text-red-800 font-semibold">{lastSeenDate}</p>
            <p className="text-red-800 font-semibold">{lastSeenLocation}</p>
          </div>

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
                  <p className="font-bold text-yellow-900 text-sm mb-1">IMPORTANT NOTES</p>
                  <p className="text-yellow-800 text-sm">{medicalBehavioral}</p>
                </div>
              )}
            </div>
          )}

          {/* Contact Banner */}
          <div className="bg-blue-600 text-white text-center py-4 px-4 rounded-lg mb-6">
            <p className="text-sm font-bold mb-2 m-0">IF YOU SEE THIS PET</p>
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

      {/* Action Buttons */}
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
    </div>
  )
}

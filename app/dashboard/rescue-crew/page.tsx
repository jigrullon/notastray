'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore'
import {
  Loader2, ArrowLeft, Users, Shield, Plus, Pencil, Trash2,
  Phone, MapPin, AlertCircle, X,
} from 'lucide-react'
import {
  listContacts, addContact, updateContact, deleteContact,
  RELATIONSHIP_OPTIONS,
  type RescueCrewContact,
  type RescueCrewPhone,
  type RescueCrewAddress,
  type RescueCrewRelationship,
} from '@/lib/rescueCrew'

interface ActivatedTag {
  code: string
  petName: string
}

interface FormState {
  title: string
  tagCodes: string[]
  firstName: string
  lastName: string
  relationship: RescueCrewRelationship | ''
  email: string
  phone1: RescueCrewPhone
  phone2: RescueCrewPhone
  address: RescueCrewAddress
  showWhenLost: boolean
  permissionAttested: boolean
}

const COUNTRY_CODES = [
  { value: '+1', label: 'United States (+1)' },
  { value: '+44', label: 'United Kingdom (+44)' },
  { value: '+52', label: 'Mexico (+52)' },
]

const PHONE_TYPES: { value: RescueCrewPhone['type']; label: string }[] = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
]

const emptyPhone = (): RescueCrewPhone => ({ countryCode: '+1', number: '', type: 'mobile', ext: '' })
const emptyAddress = (): RescueCrewAddress => ({
  street: '', unit: '', city: '', state: '', postal: '', country: 'United States',
})

const emptyForm = (): FormState => ({
  title: '',
  tagCodes: [],
  firstName: '',
  lastName: '',
  relationship: '',
  email: '',
  phone1: emptyPhone(),
  phone2: emptyPhone(),
  address: emptyAddress(),
  showWhenLost: true,
  permissionAttested: false,
})

const inputClass = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'

function relationshipLabel(value: RescueCrewRelationship): string {
  return RELATIONSHIP_OPTIONS.find(o => o.value === value)?.label || value
}

function addressHasData(a: RescueCrewAddress): boolean {
  return Boolean(a.street || a.unit || a.city || a.state || a.postal)
}

export default function RescueCrewPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [tags, setTags] = useState<ActivatedTag[]>([])
  const [contacts, setContacts] = useState<RescueCrewContact[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Auth gate
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      // Load activated tags for the pet-assignment checkboxes
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const tagCodes: string[] = userDoc.exists() ? (userDoc.data().tagCodes || []) : []
      const activatedTags: ActivatedTag[] = []
      for (let i = 0; i < tagCodes.length; i += 10) {
        const batch = tagCodes.slice(i, i + 10)
        const tagsQuery = query(collection(db, 'tags'), where(documentId(), 'in', batch))
        const snapshot = await getDocs(tagsQuery)
        snapshot.forEach(tagDoc => {
          const data = tagDoc.data()
          if (data.isActive) {
            activatedTags.push({
              code: tagDoc.id,
              petName: data.pet?.name || 'Unnamed',
            })
          }
        })
      }
      setTags(activatedTags)

      // Load contacts
      const loadedContacts = await listContacts(user.uid)
      setContacts(loadedContacts)
    } catch (err) {
      console.error('Error loading Rescue Crew data:', err)
    } finally {
      setDataLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) loadData()
  }, [user, loadData])

  const petNameForCode = (code: string) => tags.find(t => t.code === code)?.petName || code

  const openAddForm = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setShowForm(true)
  }

  const openEditForm = (contact: RescueCrewContact) => {
    setEditingId(contact.id || null)
    setForm({
      title: contact.title,
      tagCodes: [...contact.tagCodes],
      firstName: contact.firstName,
      lastName: contact.lastName,
      relationship: contact.relationship,
      email: contact.email,
      phone1: { ...emptyPhone(), ...contact.phone1 },
      phone2: contact.phone2 ? { ...emptyPhone(), ...contact.phone2 } : emptyPhone(),
      address: contact.address ? { ...emptyAddress(), ...contact.address } : emptyAddress(),
      showWhenLost: contact.showWhenLost,
      // Pre-check the attestation when the owner has already confirmed permission.
      permissionAttested: Boolean(contact.permissionAttestedAt),
    })
    setFormError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormError(null)
  }

  const toggleTag = (code: string) => {
    setForm(prev => ({
      ...prev,
      tagCodes: prev.tagCodes.includes(code)
        ? prev.tagCodes.filter(c => c !== code)
        : [...prev.tagCodes, code],
    }))
  }

  const handleSubmit = async () => {
    if (!user) return
    setFormError(null)

    // Client-side validation
    if (!form.title.trim()) {
      setFormError('Please give this contact a title.')
      return
    }
    if (form.tagCodes.length === 0) {
      setFormError('Please select at least one pet for this contact.')
      return
    }
    if (!form.firstName.trim()) {
      setFormError('Please enter a first name.')
      return
    }
    if (!form.relationship) {
      setFormError('Please select a relationship.')
      return
    }
    if (!form.phone1.number.trim()) {
      setFormError('Please enter a primary telephone number.')
      return
    }
    if (!form.permissionAttested) {
      setFormError('Please confirm you have this person’s permission to share their contact information.')
      return
    }

    const phone2HasData = form.phone2.number.trim().length > 0
    const payload: Omit<RescueCrewContact, 'id' | 'createdAt' | 'updatedAt'> = {
      title: form.title.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      relationship: form.relationship as RescueCrewRelationship,
      email: form.email.trim(),
      phone1: {
        countryCode: form.phone1.countryCode,
        number: form.phone1.number.trim(),
        type: form.phone1.type,
      },
      phone2: phone2HasData
        ? {
            countryCode: form.phone2.countryCode,
            number: form.phone2.number.trim(),
            type: form.phone2.type,
            ext: (form.phone2.ext || '').trim(),
          }
        : null,
      address: addressHasData(form.address)
        ? {
            street: form.address.street.trim(),
            unit: form.address.unit.trim(),
            city: form.address.city.trim(),
            state: form.address.state.trim(),
            postal: form.address.postal.trim(),
            country: form.address.country.trim(),
          }
        : null,
      tagCodes: form.tagCodes,
      showWhenLost: form.showWhenLost,
      permissionAttestedAt: new Date().toISOString(),
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await updateContact(user.uid, editingId, payload)
      } else {
        await addContact(user.uid, payload)
      }
      await loadData()
      closeForm()
    } catch (err) {
      console.error('Error saving contact:', err)
      setFormError('Something went wrong while saving. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    setDeletingId(id)
    try {
      await deleteContact(user.uid, id)
      await loadData()
    } catch (err) {
      console.error('Error deleting contact:', err)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* Heading */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Rescue Crew</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              Trusted people and safe places that can help bring your pet home. Finders only see them
              while your pet is marked lost.
            </p>
          </div>
          {!showForm && contacts.length > 0 && (
            <button
              onClick={openAddForm}
              className="shrink-0 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-400 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingId ? 'Edit Contact' : 'Add a Rescue Crew Contact'}
              </h2>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Close form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className={labelClass}>Contact nickname *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={'e.g. "Our dog walker" or "Grandma\'s house"'}
                  className={inputClass}
                />
              </div>

              {/* Pet assignment */}
              <div>
                <label className={labelClass}>Which pets is this contact for? *</label>
                {tags.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    You don&apos;t have any activated tags yet.{' '}
                    <Link href="/activate" className="text-primary-600 dark:text-primary-400 hover:underline">
                      Activate a tag
                    </Link>{' '}
                    to assign a Rescue Crew contact.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tags.map(tag => (
                      <label
                        key={tag.code}
                        className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.tagCodes.includes(tag.code)}
                          onChange={() => toggleTag(tag.code)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{tag.petName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono ml-auto">{tag.code}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First name *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Last name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Relationship */}
              <div>
                <label className={labelClass}>Relationship *</label>
                <select
                  value={form.relationship}
                  onChange={e => setForm(p => ({ ...p, relationship: e.target.value as RescueCrewRelationship | '' }))}
                  className={inputClass}
                >
                  <option value="">- Select -</option>
                  {RELATIONSHIP_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="name@example.com"
                  className={inputClass}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Only visible to you — never shown publicly</p>
              </div>

              {/* Telephone 1 */}
              <div>
                <label className={labelClass}>Telephone 1 *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={form.phone1.countryCode}
                    onChange={e => setForm(p => ({ ...p, phone1: { ...p.phone1, countryCode: e.target.value } }))}
                    className={inputClass}
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={form.phone1.number}
                    onChange={e => setForm(p => ({ ...p, phone1: { ...p.phone1, number: e.target.value } }))}
                    placeholder="(555) 123-4567"
                    className={inputClass}
                  />
                  <select
                    value={form.phone1.type}
                    onChange={e => setForm(p => ({ ...p, phone1: { ...p.phone1, type: e.target.value as RescueCrewPhone['type'] } }))}
                    className={inputClass}
                  >
                    {PHONE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Telephone 2 */}
              <div>
                <label className={labelClass}>Telephone 2 <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select
                    value={form.phone2.countryCode}
                    onChange={e => setForm(p => ({ ...p, phone2: { ...p.phone2, countryCode: e.target.value } }))}
                    className={inputClass}
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={form.phone2.number}
                    onChange={e => setForm(p => ({ ...p, phone2: { ...p.phone2, number: e.target.value } }))}
                    placeholder="(555) 987-6543"
                    className={inputClass}
                  />
                  <select
                    value={form.phone2.type}
                    onChange={e => setForm(p => ({ ...p, phone2: { ...p.phone2, type: e.target.value as RescueCrewPhone['type'] } }))}
                    className={inputClass}
                  >
                    {PHONE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.phone2.ext || ''}
                    onChange={e => setForm(p => ({ ...p, phone2: { ...p.phone2, ext: e.target.value } }))}
                    placeholder="Ext."
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Pet-safe address */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-primary-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Pet-safe address <span className="text-gray-400 font-normal text-sm">(optional)</span></h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Street</label>
                    <input
                      type="text"
                      value={form.address.street}
                      onChange={e => setForm(p => ({ ...p, address: { ...p.address, street: e.target.value } }))}
                      placeholder="123 Main St"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Apt / Unit</label>
                      <input
                        type="text"
                        value={form.address.unit}
                        onChange={e => setForm(p => ({ ...p, address: { ...p.address, unit: e.target.value } }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>City</label>
                      <input
                        type="text"
                        value={form.address.city}
                        onChange={e => setForm(p => ({ ...p, address: { ...p.address, city: e.target.value } }))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>State</label>
                      <input
                        type="text"
                        value={form.address.state}
                        onChange={e => setForm(p => ({ ...p, address: { ...p.address, state: e.target.value } }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Postal code</label>
                      <input
                        type="text"
                        value={form.address.postal}
                        onChange={e => setForm(p => ({ ...p, address: { ...p.address, postal: e.target.value } }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Country</label>
                      <input
                        type="text"
                        value={form.address.country}
                        onChange={e => setForm(p => ({ ...p, address: { ...p.address, country: e.target.value } }))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Show when lost */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showWhenLost}
                    onChange={e => setForm(p => ({ ...p, showWhenLost: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Show this contact publicly when my pet is marked as lost
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                      When enabled, this contact appears on your pet&apos;s public profile page — but only
                      while the pet is reported lost. At all other times it stays private to you.
                    </span>
                  </span>
                </label>
              </div>

              {/* Permission attestation (required) */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.permissionAttested}
                    onChange={e => setForm(p => ({ ...p, permissionAttested: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    I confirm I have this person&apos;s permission to share their contact information on my
                    pet&apos;s public profile while my pet is reported lost. *
                  </span>
                </label>
              </div>

              {formError && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {formError}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={closeForm}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <div className="flex-1" />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-primary-600 hover:bg-primary-400 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : editingId ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        )}

        {/* Contact list */}
        {dataLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto" />
          </div>
        ) : contacts.length === 0 && !showForm ? (
          /* Empty state */
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Build your Rescue Crew
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Add trusted people and safe places a finder can turn to if your pet ever goes missing.
            </p>
            <button
              onClick={openAddForm}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-400 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </div>
        ) : contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map(contact => (
              <div
                key={contact.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center shrink-0">
                      {contact.relationship === 'safe_place'
                        ? <MapPin className="w-5 h-5 text-primary-600" />
                        : <Users className="w-5 h-5 text-primary-600" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{contact.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {[contact.firstName, contact.lastName].filter(Boolean).join(' ')}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      contact.showWhenLost
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {contact.showWhenLost ? 'Shown when lost' : 'Private'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <p>
                    <span className="text-gray-400 dark:text-gray-500">Relationship: </span>
                    {relationshipLabel(contact.relationship)}
                  </p>
                  {contact.phone1?.number && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {contact.phone1.countryCode} {contact.phone1.number}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {contact.tagCodes.map(code => (
                      <span
                        key={code}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                      >
                        {petNameForCode(code)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => openEditForm(contact)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {confirmDeleteId === contact.id ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Delete?</span>
                      <button
                        onClick={() => contact.id && handleDelete(contact.id)}
                        disabled={deletingId === contact.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === contact.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(contact.id || null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

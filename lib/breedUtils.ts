import breedsData from './breeds.json'

export type SpeciesType = 'Dog' | 'Cat' | 'Other'

export function getSpecies(): SpeciesType[] {
  return ['Dog', 'Cat', 'Other']
}

// Cat breeds that should always appear first as defaults, in this order.
const CAT_DEFAULTS = ['Domestic Shorthair', 'Domestic Longhair']

export function getBreeds(species: string): string[] {
  if (species === 'Dog') {
    // Dogs: fully alphabetical (most owners know their dog's breed).
    return [...breedsData.Dog].sort((a, b) => a.localeCompare(b))
  }
  if (species === 'Cat') {
    // Cats: keep the domestic defaults pinned at the top, rest alphabetical.
    const rest = breedsData.Cat
      .filter((breed) => !CAT_DEFAULTS.includes(breed))
      .sort((a, b) => a.localeCompare(b))
    return [...CAT_DEFAULTS, ...rest]
  }
  return []
}

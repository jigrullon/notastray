import breedsData from './breeds.json'

export type SpeciesType = 'Dog' | 'Cat' | 'Other'

export function getSpecies(): SpeciesType[] {
  return ['Dog', 'Cat', 'Other']
}

export function getBreeds(species: string): string[] {
  if (species === 'Dog' || species === 'Cat') {
    return breedsData[species as keyof typeof breedsData] || []
  }
  return []
}

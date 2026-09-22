import { artisans } from '../mocks/artisans'

const MOCK_DELAY_MS = 600

export function getArtisans() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(artisans), MOCK_DELAY_MS)
  })
}

export function getArtisanById(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const artisan = artisans.find((item) => item.id === Number(id))
      if (!artisan) {
        reject(new Error('NOT_FOUND'))
        return
      }
      resolve(artisan)
    }, MOCK_DELAY_MS)
  })
}
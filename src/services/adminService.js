import { getAllUsers, updateUser, withoutPassword } from './userStore'
import { getAllRequests } from './requestsService'
import { statusKey } from '../utils/requestStatus'

const MOCK_DELAY_MS = 600
const ACTIVE_STATUSES = ['open', 'accepted', 'in_progress']

export function getArtisanAccounts() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const artisans = getAllUsers()
        .filter((user) => user.role === 'artisan')
        .map(withoutPassword)
      resolve(artisans)
    }, MOCK_DELAY_MS)
  })
}

export function approveArtisan(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const updated = updateUser(id, { status: 'approved' })
      if (!updated) {
        reject(new Error('NOT_FOUND'))
        return
      }
      resolve(withoutPassword(updated))
    }, MOCK_DELAY_MS)
  })
}

export function rejectArtisan(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const updated = updateUser(id, { status: 'rejected' })
      if (!updated) {
        reject(new Error('NOT_FOUND'))
        return
      }
      resolve(withoutPassword(updated))
    }, MOCK_DELAY_MS)
  })
}

export function getDashboardStats() {
  return getAllRequests().then((requests) => {
    const users = getAllUsers()
    const residents = users.filter((user) => user.role === 'resident')
    const artisans = users.filter((user) => user.role === 'artisan')
    const approvedArtisans = artisans.filter((user) => user.status === 'approved')
    const pendingArtisans = artisans.filter((user) => user.status === 'pending')

    const activeRequests = requests.filter((request) =>
      ACTIVE_STATUSES.includes(statusKey(request.status)),
    )
    const completedRequests = requests.filter(
      (request) => statusKey(request.status) === 'completed',
    )
       const reviews = requests.filter((request) => request.review && !request.review.isHidden)
    const averageRating = reviews.length
      ? Math.round(
          (reviews.reduce((total, item) => total + item.review.rating, 0) / reviews.length) * 10,
        ) / 10
      : 0

    return {
      residentsCount: residents.length,
      artisansCount: artisans.length,
      approvedArtisansCount: approvedArtisans.length,
      pendingArtisansCount: pendingArtisans.length,
      totalRequestsCount: requests.length,
      activeRequestsCount: activeRequests.length,
      completedRequestsCount: completedRequests.length,
      reviewsCount: reviews.length,
      averageRating,
    }
  })
}

export function getRequestsOverview() {
  return getAllRequests().then((requests) => {
    const users = getAllUsers()
    return requests.map((request) => {
      const resident = users.find((user) => user.id === request.residentId)
      return { ...request, residentName: resident ? resident.fullName : '—' }
    })
  })
}

export function getReviewsOverview() {
  return getAllRequests().then((requests) => {
    const users = getAllUsers()
    return requests
      .filter((request) => request.review)
      .map((request) => {
        const resident = users.find((user) => user.id === request.residentId)
        return {
          requestId: request.id,
          title: request.title,
          categoryName: request.categoryName,
          artisanName: request.artisanName,
          residentName: resident ? resident.fullName : '—',
          ...request.review,
        }
      })
  })
}
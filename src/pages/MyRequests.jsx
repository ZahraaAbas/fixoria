import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CalendarDays, ChevronLeft, ClipboardList, LayoutGrid, Plus } from 'lucide-react'
import { translate } from '../i18n'
import { getMyResidentRequests } from '../services/requestsService'
import { formatDate } from '../utils/formatDate'
import { statusTone } from '../utils/requestStatus'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import AiAssistantButton from '../components/ui/AiAssistantButton'
import StatusBadge from '../components/ui/StatusBadge'
import { RevealGroup, RevealItem } from '../components/ui/Reveal'
import './MyRequests.css'

function MyRequests() {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    getMyResidentRequests()
      .then((data) => {
        if (!isCancelled) setRequests(data)
      })
      .catch((err) => {
        if (!isCancelled) setError(err)
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [attempt])

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setAttempt((count) => count + 1)
  }

  return (
    <section className="mr">
      <PageHeader
        title={translate('myRequests.title')}
        meta={
          !isLoading && !error && requests.length > 0 ? (
            <span className="mr-count">
              <ClipboardList size={15} aria-hidden="true" />
              {requests.length}
            </span>
          ) : null
        }
        actions={
          <>
            <AiAssistantButton size={17} />
            <Link to="/home" className="fx-btn fx-btn--primary">
              <Plus size={17} aria-hidden="true" />
              {translate('home.heroPrimary')}
            </Link>
          </>
        }
      />

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('myRequests.loading')}
          </p>
          <SkeletonList count={4} />
        </>
      )}

      {!isLoading && error && (
        <ErrorState
          message={translate('myRequests.error')}
          onRetry={handleRetry}
          retryLabel={translate('myRequests.retry')}
        />
      )}

      {!isLoading && !error && requests.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={translate('myRequests.empty')}
          action={
            <Link to="/home" className="fx-btn fx-btn--primary">
              <LayoutGrid size={16} aria-hidden="true" />
              {translate('myRequests.browseCategories')}
            </Link>
          }
        />
      )}

      {!isLoading && !error && requests.length > 0 && (
        <RevealGroup as="ul" className="mr-list" gap={0.05}>
          {requests.map((request) => (
            <RevealItem as="li" key={request.id}>
              <Link
                to={`/my-requests/${request.id}`}
                className={`mr-card mr-card--${statusTone(request.status)}`}
              >
                <span className="mr-card-stripe" aria-hidden="true" />
                <div className="mr-card-main">
                  <p className="mr-card-title">{request.title || request.categoryName}</p>
                  <p className="mr-card-meta">
                    <span>
                      {translate('myRequests.category')}: <strong>{request.categoryName}</strong>
                    </span>
                    {request.preferredDate && (
                      <span className="mr-card-date">
                        <CalendarDays size={14} aria-hidden="true" />
                        <span className="sr-only">{translate('myRequests.preferredDate')}: </span>
                        {formatDate(request.preferredDate)}
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={request.status} />
                <ChevronLeft size={18} aria-hidden="true" className="mr-card-chevron icon-forward" />
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </section>
  )
}

export default MyRequests

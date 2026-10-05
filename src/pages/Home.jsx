import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import {
  ArrowLeft,
  BadgeCheck,
  ChevronLeft,
  ClipboardList,
  LayoutGrid,
  ListChecks,
  MessageSquareHeart,
  Send,
  Star,
  Users,
} from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getCategories } from '../services/categoriesService'
import { getArtisans } from '../services/artisansService'
import { serviceVisuals, defaultServiceVisual } from '../config/serviceVisuals'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import TiltCard from '../components/ui/TiltCard'
import Avatar from '../components/ui/Avatar'
import CountUp from '../components/ui/CountUp'
import AiAssistantButton from '../components/ui/AiAssistantButton'
import { easeOut, fadeUp, spring, stagger } from '../components/ui/motion'
import heroImage from '../assets/images/background.webp'
import './Home.css'

const PREVIEW_STATUSES = [
  { key: 'open', badge: 'open' },
  { key: 'accepted', badge: 'accepted' },
  { key: 'in_progress', badge: 'progress' },
  { key: 'completed', badge: 'completed' },
]

function getVisual(icon) {
  return serviceVisuals[icon] || defaultServiceVisual
}

// يحمّل بيانات بنفس نمط الصفحات الأخرى (تحميل / خطأ / إعادة محاولة)
function useRemoteData(loader) {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    loader()
      .then((result) => {
        if (!isCancelled) setData(result)
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
  }, [loader, attempt])

  function retry() {
    setIsLoading(true)
    setError(null)
    setAttempt((count) => count + 1)
  }

  return { data, isLoading, error, retry }
}

/* ================= Hero ================= */

function HeroPreview({ category }) {
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(reduceMotion ? 2 : 0)
  const visual = getVisual(category?.icon)
  const Icon = visual.Icon

  useEffect(() => {
    if (reduceMotion) return undefined
    const timer = setInterval(() => setStep((current) => (current + 1) % PREVIEW_STATUSES.length), 2200)
    return () => clearInterval(timer)
  }, [reduceMotion])

  const status = PREVIEW_STATUSES[step]

  return (
    <div className="hero-preview fx-glass" role="img" aria-label={translate('home.previewLabel')}>
      <div className="hero-preview-head">
        <span className="hero-preview-icon" style={{ background: visual.gradient }}>
          <Icon size={18} />
        </span>
        <span className="hero-preview-text">
          <span className="hero-preview-title">{translate('home.previewTitle')}</span>
          <span className="hero-preview-sub">{category?.name ?? '—'}</span>
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={status.key}
            className={`fx-badge fx-badge--${status.badge}`}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: easeOut }}
          >
            {translate(`requestStatus.${status.key}`)}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="hero-preview-track" aria-hidden="true">
        {PREVIEW_STATUSES.map((item, index) => (
          <span key={item.key} className={`hero-preview-dot ${index <= step ? 'is-done' : ''}`} />
        ))}
        <motion.span
          className="hero-preview-fill"
          animate={{ scaleX: step / (PREVIEW_STATUSES.length - 1) }}
          transition={spring}
        />
      </div>
    </div>
  )
}

function HeroSection({ categories, artisans, isReady }) {
  const heroRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const imageY = useTransform(smooth, [0, 1], [0, 90])
  const imageScale = useTransform(smooth, [0, 1], [1.04, 1.14])
  const floatY = useTransform(smooth, [0, 1], [0, -70])
  const floatYSlow = useTransform(smooth, [0, 1], [0, -30])

  const rated = artisans.filter((artisan) => artisan.reviewsCount > 0)
  const averageRating = rated.length
    ? rated.reduce((sum, artisan) => sum + Number(artisan.rating || 0), 0) / rated.length
    : 0
  const topArtisan = [...rated].sort((a, b) => b.rating - a.rating)[0]

  const stats = [
    { value: categories.length, label: translate('home.statServices'), Icon: LayoutGrid },
    { value: artisans.length, label: translate('home.statArtisans'), Icon: BadgeCheck },
    ...(averageRating ? [{ value: averageRating, decimals: 1, label: translate('home.statRating'), Icon: Star }] : []),
  ]

  const parallax = (value) => (reduceMotion ? undefined : value)

  return (
    <section ref={heroRef} className="home-hero">
      <motion.div
        className="home-hero-copy"
        variants={stagger(0.1, 0.1)}
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
      >
        <motion.span variants={fadeUp} className="fx-eyebrow">
          {translate('home.heroEyebrow')}
        </motion.span>
        <motion.h1 variants={fadeUp} className="fx-display home-hero-title">
          {translate('home.heroTitleStart')}
          <br />
          <span className="home-hero-highlight">
            <span>{translate('home.heroTitleHighlight')}</span>
          </span>
        </motion.h1>
        <motion.p variants={fadeUp} className="fx-lead home-hero-lead">
          {translate('home.heroLead')}
        </motion.p>
        <motion.div variants={fadeUp} className="home-hero-actions">
          <a href="#home-services" className="fx-btn fx-btn--primary fx-btn--lg">
            {translate('home.heroPrimary')}
            <ArrowLeft size={18} aria-hidden="true" className="icon-forward" />
          </a>
          <AiAssistantButton className="fx-btn fx-btn--dark fx-btn--lg" />
          <Link to="/artisans" className="fx-btn fx-btn--secondary fx-btn--lg">
            <Users size={18} aria-hidden="true" />
            {translate('home.heroSecondary')}
          </Link>
        </motion.div>

        <motion.dl variants={fadeUp} className="home-hero-stats" aria-live="polite">
          {stats.map(({ value, decimals, label, Icon }) => (
            <div key={label} className="home-stat">
              <dt className="home-stat-label">
                <Icon size={14} aria-hidden="true" />
                {label}
              </dt>
              <dd className="home-stat-value">
                {isReady ? <CountUp value={value} decimals={decimals} /> : <span className="fx-skeleton home-stat-skeleton" />}
              </dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      <motion.div
        className="home-hero-visual"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1, ease: easeOut, delay: 0.15 }}
      >
        <div className="home-hero-frame">
          <motion.img
            src={heroImage}
            alt=""
            className="home-hero-image"
            style={{ y: parallax(imageY), scale: parallax(imageScale) }}
          />
          <span className="home-hero-shade" aria-hidden="true" />
        </div>

        <motion.div className="home-hero-float home-hero-float--preview" style={{ y: parallax(floatY) }}>
          <HeroPreview category={categories[0]} />
        </motion.div>

        {topArtisan && (
          <motion.div className="home-hero-float home-hero-float--rating" style={{ y: parallax(floatYSlow) }}>
            <Link to={`/artisans/${topArtisan.id}`} className="hero-rating fx-glass">
              <Avatar src={topArtisan.avatar} name={topArtisan.fullName} className="hero-rating-avatar" />
              <span className="hero-rating-text">
                <span className="hero-rating-name">{topArtisan.fullName}</span>
                <span className="hero-rating-score">
                  <Star size={13} aria-hidden="true" />
                  {topArtisan.rating} · {topArtisan.reviewsCount} {translate('artisans.reviewsCount')}
                </span>
              </span>
            </Link>
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}

/* ================= Services (Bento) ================= */

// عدد أعمدة الشبكة يطابق نقاط الكسر في Home.css
const BENTO_QUERIES = [
  { query: '(max-width: 600px)', columns: 2 },
  { query: '(max-width: 1024px)', columns: 3 },
]

function getBentoColumns() {
  if (typeof window === 'undefined') return 4
  return BENTO_QUERIES.find(({ query }) => window.matchMedia(query).matches)?.columns ?? 4
}

function useBentoColumns() {
  const [columns, setColumns] = useState(getBentoColumns)

  useEffect(() => {
    const lists = BENTO_QUERIES.map(({ query }) => window.matchMedia(query))
    const update = () => setColumns(getBentoColumns())
    lists.forEach((list) => list.addEventListener('change', update))
    return () => lists.forEach((list) => list.removeEventListener('change', update))
  }, [])

  return columns
}

// آخر بطاقة تمتد لتملأ الصف الأخير، فلا تبقى فراغات في الشبكة
function getLastSpan(count, columns) {
  const others = count - 1
  const besideFeatured = columns === 4 ? 4 : 0
  const remainder = Math.max(0, others - besideFeatured) % columns
  return remainder === 0 ? 1 : columns - remainder + 1
}

function ServicesSection({ categories, isLoading, error, onRetry }) {
  const columns = useBentoColumns()
  const lastSpan = getLastSpan(categories.length, columns)

  return (
    <section id="home-services" className="home-section" aria-labelledby="home-services-title">
      <Reveal className="home-section-head">
        <div>
          <span className="fx-eyebrow">{translate('home.servicesEyebrow')}</span>
          <h2 id="home-services-title" className="fx-h1">
            {translate('home.servicesTitle')}
          </h2>
        </div>
        <p className="fx-lead home-section-lead">{translate('home.servicesLead')}</p>
      </Reveal>

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('home.loading')}
          </p>
          <SkeletonList count={6} variant="grid" />
        </>
      )}

      {!isLoading && error && (
        <ErrorState message={translate('home.error')} onRetry={onRetry} retryLabel={translate('home.retry')} />
      )}

      {!isLoading && !error && categories.length === 0 && (
        <EmptyState icon={LayoutGrid} title={translate('home.empty')} />
      )}

      {!isLoading && !error && categories.length > 0 && (
        <RevealGroup as="ul" className="bento" gap={0.07}>
          {categories.map((category, index) => {
            const { Icon, gradient } = getVisual(category.icon)
            const isFeatured = index === 0
            const isLast = !isFeatured && index === categories.length - 1
            return (
              <RevealItem
                as="li"
                key={category.id}
                className={isFeatured ? 'bento-item bento-item--featured' : 'bento-item'}
                style={isLast && lastSpan > 1 ? { gridColumn: `span ${lastSpan}` } : undefined}
              >
                <TiltCard className="bento-tilt" max={isFeatured ? 4 : 7}>
                  <Link
                    to={`/requests/new/${category.id}`}
                    className={`bento-card ${isFeatured ? 'bento-card--featured' : ''}`}
                  >
                    <span className="bento-glow" aria-hidden="true" />
                    <span className="bento-icon" style={{ background: gradient }}>
                      <Icon size={isFeatured ? 30 : 22} strokeWidth={1.9} />
                    </span>
                    <span className="bento-name">{category.name}</span>
                    <span className="bento-action">
                      {translate('home.serviceAction')}
                      <ChevronLeft size={16} aria-hidden="true" className="icon-forward" />
                    </span>
                    <Icon className="bento-watermark" aria-hidden="true" strokeWidth={1.2} />
                  </Link>
                </TiltCard>
              </RevealItem>
            )
          })}
        </RevealGroup>
      )}
    </section>
  )
}

/* ================= How it works (scroll-linked) ================= */

const HOW_STEPS = [
  { titleKey: 'home.howStep1Title', textKey: 'about.step1', Icon: ListChecks },
  { titleKey: 'home.howStep2Title', textKey: 'about.step2', Icon: Send },
  { titleKey: 'home.howStep3Title', textKey: 'about.step3', Icon: MessageSquareHeart },
]

function HowStep({ index, step, isActive, onActive }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { margin: '-45% 0px -45% 0px' })

  useEffect(() => {
    if (isInView) onActive(index)
  }, [isInView, index, onActive])

  const { Icon } = step
  return (
    <li ref={ref} className={`how-step ${isActive ? 'is-active' : ''}`}>
      <span className="how-step-marker" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div className="how-step-body">
        <span className="how-step-number">0{index + 1}</span>
        <h3 className="how-step-title">{translate(step.titleKey)}</h3>
        <p className="how-step-text">{translate(step.textKey)}</p>
      </div>
    </li>
  )
}

function HowSection() {
  const listRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 70%', 'end 55%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26 })
  const ActiveIcon = HOW_STEPS[active].Icon

  return (
    <section className="home-section home-how" aria-labelledby="home-how-title">
      <div className="how-sticky">
        <Reveal>
          <span className="fx-eyebrow">{translate('home.howEyebrow')}</span>
          <h2 id="home-how-title" className="fx-h1">
            {translate('about.howTitle')}
          </h2>
        </Reveal>

        <div className="how-visual fx-surface-depth" aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              className="how-visual-inner"
              initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.92, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -24, scale: 0.96, filter: 'blur(6px)' }}
              transition={{ duration: 0.45, ease: easeOut }}
            >
              <span className="how-visual-number">0{active + 1}</span>
              <span className="how-visual-icon">
                <ActiveIcon size={40} strokeWidth={1.6} />
              </span>
              <span className="how-visual-title">{translate(HOW_STEPS[active].titleKey)}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ol ref={listRef} className="how-list">
        <span className="how-line" aria-hidden="true">
          <motion.span className="how-line-fill" style={{ scaleY: reduceMotion ? 1 : progress }} />
        </span>
        {HOW_STEPS.map((step, index) => (
          <HowStep key={step.titleKey} index={index} step={step} isActive={index === active} onActive={setActive} />
        ))}
      </ol>
    </section>
  )
}

/* ================= Featured artisans ================= */

function FeaturedSection({ artisans, isLoading, error, onRetry }) {
  const featured = [...artisans]
    .sort((a, b) => (b.reviewsCount > 0) - (a.reviewsCount > 0) || b.rating - a.rating)
    .slice(0, 3)

  if (!isLoading && !error && featured.length === 0) return null

  return (
    <section className="home-section" aria-labelledby="home-featured-title">
      <Reveal className="home-section-head">
        <div>
          <span className="fx-eyebrow">{translate('home.featuredEyebrow')}</span>
          <h2 id="home-featured-title" className="fx-h1">
            {translate('home.featuredTitle')}
          </h2>
        </div>
        <Link to="/artisans" className="fx-btn fx-btn--secondary">
          {translate('home.featuredAll')}
          <ArrowLeft size={16} aria-hidden="true" className="icon-forward" />
        </Link>
      </Reveal>

      {isLoading && <SkeletonList count={3} variant="grid" />}

      {!isLoading && error && (
        <ErrorState message={translate('home.featuredError')} onRetry={onRetry} retryLabel={translate('home.retry')} />
      )}

      {!isLoading && !error && (
        <RevealGroup as="ul" className="featured-grid" gap={0.1}>
          {featured.map((artisan, index) => (
            <RevealItem as="li" key={artisan.id}>
              <TiltCard className="featured-tilt">
                <Link to={`/artisans/${artisan.id}`} className="featured-card">
                  <span className="featured-rank" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <Avatar src={artisan.avatar} name={artisan.fullName} className="featured-avatar" />
                  <span className="featured-name">{artisan.fullName}</span>
                  <span className="featured-categories">{artisan.categoryNames.join(translate('common.comma'))}</span>
                  {artisan.reviewsCount > 0 ? (
                    <span className="featured-rating">
                      <span className="featured-stars" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={14} className={n <= Math.round(artisan.rating) ? 'is-on' : ''} />
                        ))}
                      </span>
                      <strong>{artisan.rating}</strong>
                      <span>
                        ({artisan.reviewsCount} {translate('artisans.reviewsCount')})
                      </span>
                    </span>
                  ) : (
                    <span className="featured-rating featured-rating--empty">{translate('artisans.noReviews')}</span>
                  )}
                </Link>
              </TiltCard>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </section>
  )
}

/* ================= CTA + Trust ================= */

function CtaSection() {
  const { user, isAuthenticated } = useAuth()
  const isResident = isAuthenticated && user.role === 'resident'
  const trust = [
    { Icon: BadgeCheck, title: 'home.trust1Title', text: 'home.trust1Text' },
    { Icon: Star, title: 'home.trust2Title', text: 'home.trust2Text' },
    { Icon: ClipboardList, title: 'home.trust3Title', text: 'home.trust3Text' },
  ]

  return (
    <Reveal as="section" className="home-cta fx-surface-depth" aria-labelledby="home-cta-title">
      <span className="home-cta-orb" aria-hidden="true" />
      <div className="home-cta-main">
        <h2 id="home-cta-title" className="home-cta-title">
          {translate('home.ctaTitle')}
        </h2>
        <p className="home-cta-lead">{translate('home.ctaLead')}</p>
        <div className="home-cta-actions">
          {isResident ? (
            <>
              <a href="#home-services" className="fx-btn fx-btn--primary fx-btn--lg">
                {translate('home.heroPrimary')}
              </a>
              <Link to="/my-requests" className="fx-btn fx-btn--lg home-cta-ghost">
                {translate('home.ctaMyRequests')}
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="fx-btn fx-btn--primary fx-btn--lg">
                {translate('home.ctaRegister')}
              </Link>
              <Link to="/login" className="fx-btn fx-btn--lg home-cta-ghost">
                {translate('home.ctaLogin')}
              </Link>
            </>
          )}
        </div>
      </div>

      <ul className="home-trust">
        {trust.map(({ Icon, title, text }) => (
          <li key={title} className="home-trust-item">
            <span className="home-trust-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span>
              <strong>{translate(title)}</strong>
              <span>{translate(text)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

/* ================= Page ================= */

function Home() {
  const services = useRemoteData(getCategories)
  const artisans = useRemoteData(getArtisans)

  return (
    <div className="home">
      <HeroSection
        categories={services.data}
        artisans={artisans.data}
        isReady={!services.isLoading && !artisans.isLoading}
      />
      <ServicesSection
        categories={services.data}
        isLoading={services.isLoading}
        error={services.error}
        onRetry={services.retry}
      />
      <HowSection />
      <FeaturedSection
        artisans={artisans.data}
        isLoading={artisans.isLoading}
        error={artisans.error}
        onRetry={artisans.retry}
      />
      <CtaSection />
    </div>
  )
}

export default Home

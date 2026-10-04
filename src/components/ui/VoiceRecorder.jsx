import { useEffect, useRef, useState } from 'react'
import { Mic, RotateCcw, Square, Trash2 } from 'lucide-react'
import { translate } from '../../i18n'
import ActionError from './ActionError'
import './VoiceRecorder.css'

// أنواع التسجيل بترتيب الأفضلية: webm/opus (Chrome/Firefox/Edge) ثم mp4 (Safari)
const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function extensionFor(type) {
  if (type.includes('mp4')) return 'm4a'
  if (type.includes('ogg')) return 'ogg'
  return 'webm'
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const isSupported = () =>
  typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

// تسجيل وصف صوتي من المتصفح. onChange(file|null) يُبلغ الأب بالتسجيل النهائي.
function VoiceRecorder({ onChange, maxSeconds = 120 }) {
  const [status, setStatus] = useState('idle') // idle | recording | recorded
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [errorKey, setErrorKey] = useState(isSupported() ? '' : 'voice.unsupported')

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const urlRef = useRef(null)

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    clearInterval(timerRef.current)
  }

  function clearPreview() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
    setPreviewUrl(null)
  }

  // عند مغادرة الصفحة: إيقاف الميكروفون وتحرير رابط المعاينة
  useEffect(
    () => () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      clearInterval(timerRef.current)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  async function start() {
    setErrorKey('')
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      setErrorKey(error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'voice.denied' : 'voice.failed')
      return
    }

    const mimeType = pickMimeType()
    let recorder
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch {
      stream.getTracks().forEach((track) => track.stop())
      setErrorKey('voice.failed')
      return
    }

    const chunks = []
    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) chunks.push(event.data)
    }
    recorder.onstop = () => {
      stopTracks()
      const type = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0]
      const blob = new Blob(chunks, { type })
      if (blob.size === 0) {
        setStatus('idle')
        setErrorKey('voice.failed')
        return
      }
      const file = new File([blob], `voice-note.${extensionFor(type)}`, { type })
      clearPreview()
      urlRef.current = URL.createObjectURL(blob)
      setPreviewUrl(urlRef.current)
      setStatus('recorded')
      onChange(file)
    }

    streamRef.current = stream
    recorderRef.current = recorder
    recorder.start()
    setStatus('recording')
    setElapsed(0)

    const startedAt = Date.now()
    timerRef.current = setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000
      setElapsed(seconds)
      if (seconds >= maxSeconds && recorder.state === 'recording') recorder.stop()
    }, 250)
  }

  function stop() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  function remove() {
    clearPreview()
    setStatus('idle')
    setElapsed(0)
    onChange(null)
  }

  const progress = Math.min(elapsed / maxSeconds, 1)

  return (
    <div className="voice-recorder">
      {status === 'idle' && (
        <button type="button" className="voice-start" onClick={start} disabled={!isSupported()}>
          <span className="voice-start-icon" aria-hidden="true">
            <Mic size={20} />
          </span>
          <span className="voice-start-text">
            <strong>{translate('voice.record')}</strong>
            <span>{translate('voice.hint')}</span>
          </span>
        </button>
      )}

      {status === 'recording' && (
        <div className="voice-live" role="status" aria-live="polite">
          <span className="voice-live-dot" aria-hidden="true" />
          <span className="voice-live-label">{translate('voice.recording')}</span>
          <span className="voice-live-time">
            {formatTime(elapsed)} / {formatTime(maxSeconds)}
          </span>
          <span className="voice-live-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${progress})` }} />
          </span>
          <button type="button" className="fx-btn fx-btn--danger fx-btn--sm" onClick={stop}>
            <Square size={14} aria-hidden="true" />
            {translate('voice.stop')}
          </button>
        </div>
      )}

      {status === 'recorded' && previewUrl && (
        <div className="voice-done">
          <audio controls src={previewUrl} preload="metadata" aria-label={translate('requestDetail.voice')} />
          <div className="voice-done-actions">
            <button type="button" className="fx-btn fx-btn--ghost fx-btn--sm" onClick={() => { remove(); start() }}>
              <RotateCcw size={14} aria-hidden="true" />
              {translate('voice.rerecord')}
            </button>
            <button type="button" className="fx-btn fx-btn--danger fx-btn--sm" onClick={remove}>
              <Trash2 size={14} aria-hidden="true" />
              {translate('voice.remove')}
            </button>
          </div>
        </div>
      )}

      <ActionError messageKey={errorKey} className="voice-error" />
    </div>
  )
}

export default VoiceRecorder

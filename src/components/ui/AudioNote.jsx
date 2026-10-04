import { Mic } from 'lucide-react'
import { translate } from '../../i18n'
import { mediaUrl } from '../../services/apiClient'
import './VoiceRecorder.css'

// مشغّل الوصف الصوتي المرفق بالطلب (للساكن والحرفي والمشرف)
function AudioNote({ src }) {
  if (!src) return null
  const label = translate('requestDetail.voice')

  return (
    <div className="audio-note">
      <span className="audio-note-label">
        <Mic size={14} aria-hidden="true" />
        {label}
      </span>
      <audio controls preload="none" src={mediaUrl(src)} aria-label={label} />
    </div>
  )
}

export default AudioNote

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { translate } from '../../i18n'
import Avatar from './Avatar'
import ActionError from './ActionError'
import { checkImageFile, IMAGE_ACCEPT } from '../../utils/files'
import './AvatarUploader.css'

// صورة الملف الشخصي مع زر تغييرها. onUpload(file) يرفع الصورة ويرجع Promise.
function AvatarUploader({ src, name, onUpload }) {
  const inputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errorKey, setErrorKey] = useState('')

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const problem = checkImageFile(file)
    if (problem) {
      setErrorKey(problem)
      return
    }

    setErrorKey('')
    setIsUploading(true)
    try {
      await onUpload(file)
    } catch (error) {
      setErrorKey(error.message === 'NETWORK_ERROR' ? 'common.networkError' : 'profile.photoUploadError')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="avatar-uploader">
      <div className={`avatar-uploader-frame ${isUploading ? 'is-uploading' : ''}`}>
        <Avatar src={src} name={name} className="avatar-uploader-image" />
        <button
          type="button"
          className="avatar-uploader-button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          aria-label={translate('profile.photoChange')}
          title={translate('profile.photoChange')}
        >
          <Camera size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="avatar-uploader-text">
        <button
          type="button"
          className="fx-btn fx-btn--secondary fx-btn--sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          data-loading={isUploading || undefined}
        >
          {translate('profile.photoChange')}
        </button>
        <p className="fx-hint">{translate('profile.photoHint')}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFile}
      />
      <ActionError messageKey={errorKey} className="avatar-uploader-error" />
    </div>
  )
}

export default AvatarUploader

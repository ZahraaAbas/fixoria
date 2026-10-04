import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ImagePlus, X } from 'lucide-react'
import { translate } from '../../i18n'
import { checkImageFile, IMAGE_ACCEPT } from '../../utils/files'
import ActionError from './ActionError'
import './PhotoPicker.css'

// معاينة صورة محلية: رابط مؤقت يُحرَّر بعد تحميل الصورة (تبقى معروضة بعدها)
function PhotoThumb({ file }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  return <img src={url} alt={file.name} onLoad={() => URL.revokeObjectURL(url)} />
}

// اختيار عدة صور مع معاينة وحذف قبل الإرسال. files/onChange مصفوفة File يتحكم بها الأب.
function PhotoPicker({ files, onChange, max = 5 }) {
  const reduceMotion = useReducedMotion()
  const inputRef = useRef(null)
  const [errorKey, setErrorKey] = useState('')

  function handleSelect(event) {
    const selected = [...(event.target.files || [])]
    event.target.value = ''
    if (selected.length === 0) return

    const problem = selected.map(checkImageFile).find(Boolean)
    if (problem) {
      setErrorKey(problem)
      return
    }

    const room = max - files.length
    if (selected.length > room) setErrorKey('request.photosLimit')
    else setErrorKey('')
    onChange([...files, ...selected.slice(0, room)])
  }

  function removeAt(index) {
    setErrorKey('')
    onChange(files.filter((_, i) => i !== index))
  }

  const isFull = files.length >= max

  return (
    <div className="photo-picker">
      <ul className="photo-picker-grid">
        <AnimatePresence initial={false}>
          {files.map((file, index) => (
            <motion.li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="photo-picker-item"
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
            >
              <PhotoThumb file={file} />
              <button
                type="button"
                className="photo-picker-remove"
                onClick={() => removeAt(index)}
                aria-label={`${translate('request.photoRemove')}: ${file.name}`}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>

        {!isFull && (
          <li>
            <button type="button" className="photo-picker-add" onClick={() => inputRef.current?.click()}>
              <ImagePlus size={24} aria-hidden="true" />
              <span>{translate('request.photosAdd')}</span>
            </button>
          </li>
        )}
      </ul>

      <p className="fx-hint">
        {translate('request.photosHint')} ({files.length}/{max})
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleSelect}
      />
      <ActionError messageKey={errorKey} className="photo-picker-error" />
    </div>
  )
}

export default PhotoPicker

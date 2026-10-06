// حدود الملفات تطابق ما يقبله الخادم (artisan-backend/app/storage.py)
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',')

// يرجع مفتاح رسالة الخطأ، أو '' إن كانت الصورة مقبولة
export function checkImageFile(file) {
  if (!IMAGE_TYPES.includes(file.type)) return 'profile.photoTypeError'
  if (file.size > MAX_IMAGE_BYTES) return 'profile.photoSizeError'
  return ''
}

const SHRINK_MAX_SIDE = 1600
const SHRINK_QUALITY = 0.82
const SHRINK_SKIP_BYTES = 400 * 1024

// يصغّر الصورة قبل الرفع (أطول ضلع 1600px، JPEG): صور الموبايل 3-5MB والخادم على Vercel
// يرفض أي طلب أكبر من 4.5MB. إذا المتصفح ما يقدر يقرأ الصورة (مثل HEIC على Chrome)
// أو النتيجة ما صارت أصغر، نرجع الملف الأصلي كما هو.
export async function shrinkImage(file) {
  if (!file?.type?.startsWith('image/')) return file
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }
  const scale = Math.min(1, SHRINK_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size <= SHRINK_SKIP_BYTES) {
    bitmap.close()
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  // JPEG بدون شفافية: خلفية بيضاء بدل السوداء لصور PNG الشفافة
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', SHRINK_QUALITY))
  if (!blob || blob.size >= file.size) return file
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

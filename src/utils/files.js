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

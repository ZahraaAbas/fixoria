import ar from './ar'

export function translate(key) {
  const value = key.split('.').reduce((obj, part) => obj?.[part], ar)
  return typeof value === 'string' ? value : key
}
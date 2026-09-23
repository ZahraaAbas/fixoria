const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
const PHONE_PATTERN = /^\+?[0-9\s-]{7,15}$/
const MIN_PASSWORD_LENGTH = 8

function requiredError(value) {
  return value.trim() ? '' : 'validation.required'
}

function emailError(value) {
  if (!value.trim()) return 'validation.required'
  return EMAIL_PATTERN.test(value.trim()) ? '' : 'validation.invalidEmail'
}

function phoneError(value) {
  if (!value.trim()) return 'validation.required'
  return PHONE_PATTERN.test(value.trim()) ? '' : 'validation.invalidPhone'
}

function newPasswordError(value) {
  if (!value) return 'validation.required'
  return value.length >= MIN_PASSWORD_LENGTH ? '' : 'validation.passwordTooShort'
}

function withoutEmpty(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, key]) => key))
}

export function validateLogin({ email, password }) {
  return withoutEmpty({
    email: emailError(email),
    password: password ? '' : 'validation.required',
  })
}

export function validateRegister(values) {
  return withoutEmpty({
    fullName: requiredError(values.fullName),
    phone: phoneError(values.phone),
    building: requiredError(values.building),
    apartment: requiredError(values.apartment),
    email: emailError(values.email),
    password: newPasswordError(values.password),
  })
}

export function validateRequest(values) {
  return withoutEmpty({
    title: requiredError(values.title),
    description: requiredError(values.description),
    building: requiredError(values.building),
    apartment: requiredError(values.apartment),
    preferredDate: requiredError(values.preferredDate),
  })
}
export function validateArtisanRegister(values) {
  return withoutEmpty({
    fullName: requiredError(values.fullName),
    phone: phoneError(values.phone),
    email: emailError(values.email),
    password: newPasswordError(values.password),
    bio: requiredError(values.bio),
    categoryIds: values.categoryIds.length > 0 ? '' : 'validation.selectAtLeastOne',
  })
}

export function validateArtisanProfile(values) {
  return withoutEmpty({
    fullName: requiredError(values.fullName),
    phone: phoneError(values.phone),
    bio: requiredError(values.bio),
    categoryIds: values.categoryIds.length > 0 ? '' : 'validation.selectAtLeastOne',
  })
}

export function validateCategoryName(name) {
  return requiredError(name)
}
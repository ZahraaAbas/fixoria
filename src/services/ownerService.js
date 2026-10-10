import { apiGet, apiPost, apiPut } from './apiClient'

// لوحة مالك المنصة (/owner/*)

function mapStaff(row) {
  return { id: row.id, name: row.name, email: row.email }
}

function mapCompound(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address || '',
    phone: row.phone || '',
    isActive: row.is_active,
    residents: row.residents,
    pendingResidents: row.pending_residents,
    requests: row.requests,
    admins: row.admins.map(mapStaff),
    companies: row.companies,
  }
}

function mapCompany(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    isActive: row.is_active,
    artisans: row.artisans,
    managers: row.managers.map(mapStaff),
    compounds: row.compounds,
  }
}

function mapAgreement(row) {
  return {
    id: row.id,
    compoundId: row.compound_id,
    compoundName: row.compound_name,
    companyId: row.company_id,
    companyName: row.company_name,
    serviceIds: row.service_ids,
    isActive: row.is_active,
  }
}

// أخطاء الخادم المتوقعة تتحول لرموز يعرف الفرونت يترجمها
function mapOwnerError(error) {
  if (error.status === 400 && /الإيميل/.test(error.message)) return new Error('EMAIL_TAKEN', { cause: error })
  if (error.status === 400 && /الاسم/.test(error.message)) return new Error('NAME_TAKEN', { cause: error })
  if (error.status === 409) return new Error('AGREEMENT_EXISTS', { cause: error })
  return error
}

async function withErrors(promise) {
  try {
    return await promise
  } catch (error) {
    throw mapOwnerError(error)
  }
}

const nullable = (value) => (value?.trim() ? value.trim() : null)

export async function getOwnerOverview() {
  const row = await apiGet('/owner/overview')
  return {
    compounds: row.compounds,
    activeCompounds: row.active_compounds,
    companies: row.companies,
    activeAgreements: row.active_agreements,
    residents: row.residents,
    pendingResidents: row.pending_residents,
    artisans: row.artisans,
    requests: row.requests,
    openRequests: row.open_requests,
  }
}

export async function getCompounds() {
  return (await apiGet('/owner/compounds')).map(mapCompound)
}

export async function createCompound({ name, address, phone }) {
  return mapCompound(await withErrors(apiPost('/owner/compounds', { name, address: nullable(address), phone: nullable(phone) })))
}

export async function updateCompound(id, changes) {
  const body = {}
  if ('name' in changes) body.name = changes.name
  if ('address' in changes) body.address = nullable(changes.address)
  if ('phone' in changes) body.phone = nullable(changes.phone)
  if ('isActive' in changes) body.is_active = changes.isActive
  return mapCompound(await withErrors(apiPut(`/owner/compounds/${id}`, body)))
}

export async function addCompoundAdmin(compoundId, staff) {
  return mapStaff(await withErrors(apiPost(`/owner/compounds/${compoundId}/admins`, staff)))
}

export async function getCompanies() {
  return (await apiGet('/owner/companies')).map(mapCompany)
}

export async function createCompany({ name, phone }) {
  return mapCompany(await withErrors(apiPost('/owner/companies', { name, phone: nullable(phone) })))
}

export async function updateCompany(id, changes) {
  const body = {}
  if ('name' in changes) body.name = changes.name
  if ('phone' in changes) body.phone = nullable(changes.phone)
  if ('isActive' in changes) body.is_active = changes.isActive
  return mapCompany(await withErrors(apiPut(`/owner/companies/${id}`, body)))
}

export async function addCompanyManager(companyId, staff) {
  return mapStaff(await withErrors(apiPost(`/owner/companies/${companyId}/managers`, staff)))
}

export async function getAgreements() {
  return (await apiGet('/owner/agreements')).map(mapAgreement)
}

export async function createAgreement({ compoundId, companyId, serviceIds }) {
  return mapAgreement(await withErrors(
    apiPost('/owner/agreements', { compound_id: compoundId, company_id: companyId, service_ids: serviceIds }),
  ))
}

export async function updateAgreement(id, changes) {
  const body = {}
  if ('serviceIds' in changes) body.service_ids = changes.serviceIds
  if ('isActive' in changes) body.is_active = changes.isActive
  return mapAgreement(await withErrors(apiPut(`/owner/agreements/${id}`, body)))
}

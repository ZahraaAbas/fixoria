import { Wrench } from 'lucide-react'
import OwnerEntityPage from '../components/owner/OwnerEntityPage'
import { addCompanyManager, createCompany, getCompanies, updateCompany } from '../services/ownerService'

const CONFIG = {
  ns: 'companies',
  Icon: Wrench,
  fields: [{ name: 'name', wide: true }, { name: 'phone', type: 'tel' }],
  api: { list: getCompanies, create: createCompany, update: updateCompany, addStaff: addCompanyManager },
  metrics: (company) => [
    { key: 'artisans', value: company.artisans },
    { key: 'compoundsCount', value: company.compounds.length },
  ],
  partnersOf: (company) => company.compounds,
  staffKey: 'managers',
  staffOf: (company) => company.managers,
}

function OwnerCompanies() {
  return <OwnerEntityPage config={CONFIG} />
}

export default OwnerCompanies

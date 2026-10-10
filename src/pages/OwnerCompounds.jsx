import { Building2 } from 'lucide-react'
import OwnerEntityPage from '../components/owner/OwnerEntityPage'
import { addCompoundAdmin, createCompound, getCompounds, updateCompound } from '../services/ownerService'

const CONFIG = {
  ns: 'compounds',
  Icon: Building2,
  fields: [
    { name: 'name', wide: true },
    { name: 'address' },
    { name: 'phone', type: 'tel' },
  ],
  api: { list: getCompounds, create: createCompound, update: updateCompound, addStaff: addCompoundAdmin },
  metrics: (compound) => [
    { key: 'residents', value: compound.residents },
    { key: 'pending', value: compound.pendingResidents },
    { key: 'requests', value: compound.requests },
  ],
  partnersOf: (compound) => compound.companies,
  staffKey: 'admins',
  staffOf: (compound) => compound.admins,
}

function OwnerCompounds() {
  return <OwnerEntityPage config={CONFIG} />
}

export default OwnerCompounds

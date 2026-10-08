import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/ui/PageHeader'
import ChangePasswordCard from '../components/ui/ChangePasswordCard'
import { Reveal } from '../components/ui/Reveal'

// حساب المشرف: الاسم والإيميل للعرض، وتغيير كلمة السر
function AdminAccount() {
  const { user } = useAuth()

  return (
    <section className="cp-page">
      <PageHeader title={translate('adminAccount.title')} meta={`${user.fullName} · ${user.email}`} />
      <Reveal>
        <ChangePasswordCard />
      </Reveal>
    </section>
  )
}

export default AdminAccount

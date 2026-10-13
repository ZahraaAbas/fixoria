"""
توزيع الطلبات على الحرفيين.

كل شركة تختار:
- open    (الافتراضي): الطلب ينعرض مباشرة لكل حرفيي الشركات المتفقة على الخدمة، وأول واحد يقبله ياخذه.
- company: الطلب يروح للشركة أول، ومديرها يعيّن حرفي. إذا ما عيّن خلال dispatch_minutes،
           الطلب ينفتح تلقائيًا لحرفيي نفس الشركة (حتى ما يتأخر الساكن).

ما عدنا مهام مجدولة على Vercel، فانتهاء المهلة ينحسب وقت القراءة (الطلب يطلع بقائمة الحرفي لمن يفتحها).
"""
from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import Session, func, select

from app.models import Company, NotificationType, RequestStatus, ServiceRequest, User, UserRole
from app.notifications import notify
from app.tenancy import compound_company_ids

MODES = ("open", "company")
MINUTES = (15, 30, 60, 120)


def route_new_request(session: Session, req: ServiceRequest) -> Optional[Company]:
    """طلب جديد بدون حرفي: إذا وحدة من الشركات المتفقة على الخدمة "توزّع"، يروح إلها.
    بأكثر من شركة توزّع، ياخذه الأقل طلبات بانتظار التوزيع. يرجع الشركة أو None (توزيع ذاتي)."""
    if req.artisan_id is not None:
        return None
    company_ids = compound_company_ids(session, req.compound_id, req.service_id)
    if not company_ids:
        return None
    dispatchers = session.exec(
        select(Company).where(Company.id.in_(company_ids), Company.dispatch_mode == "company")
    ).all()
    if not dispatchers:
        return None

    def queue(company: Company) -> int:
        return session.exec(
            select(func.count()).select_from(ServiceRequest).where(
                ServiceRequest.company_id == company.id,
                ServiceRequest.artisan_id.is_(None),
                ServiceRequest.status == RequestStatus.pending,
            )
        ).one()

    company = min(dispatchers, key=lambda c: (queue(c), c.id))
    req.company_id = company.id
    req.dispatch_deadline = datetime.utcnow() + timedelta(minutes=company.dispatch_minutes or 30)
    session.add(req)
    for manager in session.exec(
        select(User).where(User.company_id == company.id, User.role == UserRole.company_manager)
    ).all():
        notify(session, manager.id, NotificationType.new_request,
               f"طلب جديد بانتظار توزيعك #{req.id}",
               f"عيّن حرفي خلال {company.dispatch_minutes} دقيقة، وبعدها ينفتح لحرفييك", req.id)
    return company


def in_dispatch_window(req: ServiceRequest, now: Optional[datetime] = None) -> bool:
    """الطلب بعده عند الشركة ينتظر توزيع المدير (ما ينعرض للحرفيين)."""
    now = now or datetime.utcnow()
    return (
        req.company_id is not None and req.artisan_id is None and req.status == RequestStatus.pending
        and req.dispatch_deadline is not None and now < req.dispatch_deadline
    )


def open_to_artisan_company(req: ServiceRequest, artisan_company_id: Optional[int],
                            now: Optional[datetime] = None) -> bool:
    """طلب مفتوح (بدون حرفي): هل يكدر حرفي من هالشركة يشوفه ويقبله؟"""
    if req.company_id is None:
        return True  # توزيع ذاتي: نفس قواعد التغطية القديمة
    if in_dispatch_window(req, now):
        return False  # المدير بعده يوزّع
    return req.company_id == artisan_company_id  # انتهت المهلة: لحرفيي نفس الشركة بس

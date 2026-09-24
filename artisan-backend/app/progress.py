"""
Progress bar لكل طلب خدمة — يترجم الـ status الداخلي (RequestStatus)
إلى 4 مراحل مفهومة للسكان والأدمن:

    pending      -> تم الحجز
    accepted     -> في الطريق اليك
    in_progress  -> يتم تنفيذ العملية
    completed    -> تم تنفيذ العملية

الرفض (rejected) حالة نهائية منفصلة، ما تدخل ضمن شريط التقدّم.
"""

from typing import List

from pydantic import BaseModel

from app.models import RequestStatus

STEP_ORDER = [
    (RequestStatus.pending, "تم الحجز"),
    (RequestStatus.accepted, "في الطريق اليك"),
    (RequestStatus.in_progress, "يتم تنفيذ العملية"),
    (RequestStatus.completed, "تم تنفيذ العملية"),
]

_STATUS_INDEX = {status: i for i, (status, _label) in enumerate(STEP_ORDER)}


class ProgressStep(BaseModel):
    key: str
    label: str
    done: bool
    active: bool


def build_progress(status: RequestStatus) -> List[ProgressStep]:
    if status == RequestStatus.rejected:
        return []

    current = _STATUS_INDEX.get(status, -1)
    steps: List[ProgressStep] = []
    for i, (step_status, label) in enumerate(STEP_ORDER):
        steps.append(
            ProgressStep(
                key=step_status.value,
                label=label,
                done=i < current,
                active=i == current,
            )
        )
    return steps


# تسميات الحالة كما تظهر للساكن (عمود "الحالة" بجداول الداشبورد)
STATUS_LABELS_AR = {
    RequestStatus.pending: "بانتظار القبول",
    RequestStatus.accepted: "مقبول",
    RequestStatus.in_progress: "قيد التنفيذ",
    RequestStatus.completed: "مكتمل",
    RequestStatus.rejected: "مرفوض",
}


def status_label(status: RequestStatus) -> str:
    return STATUS_LABELS_AR.get(RequestStatus(status), str(status))

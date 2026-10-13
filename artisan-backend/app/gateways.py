"""
بوابات الدفع الأونلاين.

كل بوابة إلها نفس الواجهة، فربط شركة جديدة (زين كاش، مصرف العراق الأول، كي كارد...) = كلاس جديد هنا
ومفاتيحها بمتغيرات البيئة، وباقي النظام ما يتغير:

- create_checkout: ينشئ عملية دفع عند البوابة ويرجع (مرجعها، رابط صفحة الدفع)
- fetch_status:   يسأل البوابة نفسها عن حالة العملية (ما نصدّق رابط الرجوع)
- parse_webhook:  يتحقق من توقيع إشعار البوابة ويطلع (المرجع، الحالة، المبلغ)

بوابة التجربة (sandbox) تشتغل بس إذا PAYMENTS_SANDBOX=1، وما تحرّك فلوس حقيقية أبدًا.
"""
import hashlib
import hmac
import json
import os
import uuid
from dataclasses import dataclass
from typing import Dict, Optional

from app.flags import env_flag


class GatewayError(Exception):
    pass


@dataclass
class GatewayResult:
    status: str                      # pending / paid / failed / cancelled
    amount: Optional[int] = None     # المبلغ الي تقول البوابة انه اندفع
    provider_status: Optional[str] = None
    provider_ref: Optional[str] = None


class Gateway:
    name = ""
    label = ""

    def is_available(self) -> bool:
        """البوابة مربوطة ومفاتيحها موجودة."""
        return False

    def create_checkout(self, attempt) -> tuple:
        raise GatewayError("البوابة غير مربوطة")

    def fetch_status(self, attempt) -> GatewayResult:
        raise GatewayError("البوابة غير مربوطة")

    def parse_webhook(self, body: bytes, headers: Dict[str, str]) -> GatewayResult:
        raise GatewayError("البوابة غير مربوطة")


class SandboxGateway(Gateway):
    """بوابة تجربة داخل صنعة: صفحة دفع وهمية (/pay/sandbox/<ref>) تختار منها نتيجة الدفع.
    تتصرف مثل البوابات الحقيقية (مرجع، صفحة دفع، تحقق من الحالة، إشعار موقّع) بدون ما تحرّك فلوس."""

    name = "sandbox"
    label = "بوابة تجربة"
    OUTCOMES = {"succeeded": "paid", "declined": "failed", "cancelled": "cancelled"}

    def is_available(self) -> bool:
        return env_flag("PAYMENTS_SANDBOX")

    def _secret(self) -> bytes:
        return (os.getenv("PAYMENTS_SANDBOX_SECRET") or "sandbox-secret").encode()

    def create_checkout(self, attempt) -> tuple:
        if not self.is_available():
            raise GatewayError("بوابة التجربة مطفية")
        ref = f"sbx_{uuid.uuid4().hex}"
        # رابط داخل الواجهة نفسها (البوابات الحقيقية ترجع رابط كامل لموقعها)
        return ref, f"/pay/sandbox/{ref}"

    def fetch_status(self, attempt) -> GatewayResult:
        # "البوابة" تحفظ قرار الدفع بـ provider_status (من صفحة الدفع التجريبية)
        outcome = attempt.provider_status
        return GatewayResult(status=self.OUTCOMES.get(outcome, "pending"), amount=attempt.amount,
                             provider_status=outcome, provider_ref=attempt.provider_ref)

    def sign(self, body: bytes) -> str:
        return hmac.new(self._secret(), body, hashlib.sha256).hexdigest()

    def parse_webhook(self, body: bytes, headers: Dict[str, str]) -> GatewayResult:
        if not self.is_available():
            raise GatewayError("بوابة التجربة مطفية")
        signature = headers.get("x-sandbox-signature", "")
        if not hmac.compare_digest(signature, self.sign(body)):
            raise GatewayError("توقيع غير صحيح")
        data = json.loads(body or b"{}")
        outcome = data.get("outcome")
        return GatewayResult(status=self.OUTCOMES.get(outcome, "pending"), amount=data.get("amount"),
                             provider_status=outcome, provider_ref=data.get("ref"))


class PlannedGateway(Gateway):
    """شركة دفع مخطط ربطها (تنعرض للمالك كـ "غير مربوطة بعد")."""

    def __init__(self, name: str, label: str):
        self.name = name
        self.label = label


GATEWAYS: Dict[str, Gateway] = {
    g.name: g
    for g in (
        SandboxGateway(),
        PlannedGateway("zaincash", "زين كاش"),
        PlannedGateway("fib", "مصرف العراق الأول (FIB)"),
        PlannedGateway("qicard", "كي كارد"),
    )
}


def get_gateway(name: Optional[str]) -> Optional[Gateway]:
    return GATEWAYS.get(name or "")

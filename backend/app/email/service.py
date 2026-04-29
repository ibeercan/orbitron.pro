"""SMTP email service for Orbitron."""

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def send_email(to: str, subject: str, html_body: str) -> None:
    """Send an HTML email via SMTP."""
    if not settings.SMTP_HOST:
        logger.warning("smtp_not_configured", to=to, subject=subject)
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=True,
        )
        logger.info("email_sent", to=to, subject=subject)
    except Exception as e:
        logger.error("email_send_failed", to=to, subject=subject, error=str(e))
        raise


async def send_verification_email(to: str, token: str) -> None:
    """Send email verification link."""
    from app.email.templates import verification_email_html

    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = verification_email_html(verify_url)
    await send_email(to=to, subject="Подтвердите ваш email — Orbitron", html_body=html)
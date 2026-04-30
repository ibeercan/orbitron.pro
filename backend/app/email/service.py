"""SMTP email service for Orbitron."""

from typing import Optional

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def send_email(to: str, subject: str, html_body: str, db: Optional[AsyncSession] = None) -> None:
    """Send an HTML email via SMTP."""
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_user = settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    smtp_from = settings.SMTP_FROM
    frontend_url = settings.FRONTEND_URL

    if db is not None:
        from app.admin.settings import get_smtp_config
        config = await get_smtp_config(db)
        smtp_host = config["host"]
        smtp_port = config["port"]
        smtp_user = config["user"]
        smtp_password = config["password"]
        smtp_from = config["from_addr"]
        frontend_url = config["frontend_url"]

    if not smtp_host:
        logger.warning("smtp_not_configured", to=to, subject=subject)
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = smtp_from
    msg["To"] = to
    msg["Subject"] = subject

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    use_tls = smtp_port == 465
    start_tls = smtp_port == 587

    try:
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user or None,
            password=smtp_password or None,
            use_tls=use_tls,
            start_tls=start_tls if not use_tls else False,
            timeout=10,
        )
        logger.info("email_sent", to=to, subject=subject)
    except Exception as e:
        logger.error("email_send_failed", to=to, subject=subject, error=str(e))
        raise


async def send_verification_email(to: str, token: str, db: Optional[AsyncSession] = None) -> None:
    """Send email verification link."""
    from app.email.templates import verification_email_html

    config = {"frontend_url": settings.FRONTEND_URL}
    if db is not None:
        from app.admin.settings import get_smtp_config
        full_config = await get_smtp_config(db)
        config["frontend_url"] = full_config["frontend_url"]

    verify_url = f"{config['frontend_url']}/verify-email?token={token}"
    html = verification_email_html(verify_url)
    await send_email(to=to, subject="Подтвердите ваш email — Orbitron", html_body=html, db=db)


async def send_invite_email(to: str, code: str, db: Optional[AsyncSession] = None) -> None:
    """Send invite code to a subscriber."""
    from app.email.templates import invite_email_html

    frontend_url = settings.FRONTEND_URL
    if db is not None:
        from app.admin.settings import get_smtp_config
        config = await get_smtp_config(db)
        frontend_url = config["frontend_url"]

    register_url = f"{frontend_url}/?invite={code}"
    html = invite_email_html(code, register_url)
    await send_email(to=to, subject="Ваш инвайт-код — Orbitron", html_body=html, db=db)
"""HTML email templates for Orbitron."""


def invite_email_html(code: str, register_url: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0A0612;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0612;min-height:100vh;">
<tr><td align="center" style="padding:40px 20px;">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
<h1 style="margin:0;color:#F0EAD6;font-size:28px;font-weight:600;">Orbitron</h1>
<p style="margin:8px 0 0;color:#8B7FA8;font-size:14px;">ИИ-астролог</p>
</td></tr>
<tr><td style="background:linear-gradient(135deg,rgba(28,18,6,0.95),rgba(10,6,18,0.98));border:1px solid rgba(212,175,55,0.2);border-radius:16px;padding:40px 32px;">
<h2 style="margin:0 0 16px;color:#F0EAD6;font-size:22px;font-weight:600;">Ваш инвайт-код для Orbitron</h2>
<p style="margin:0 0 24px;color:#8B7FA8;font-size:15px;line-height:1.6;">Вы получили приглашение на закрытый доступ к Orbitron. Используйте код ниже для регистрации:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr><td align="center" style="background:rgba(212,175,55,0.08);border:1px dashed rgba(212,175,55,0.3);border-radius:10px;padding:16px 24px;">
<span style="font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#D4AF37;letter-spacing:4px;">{code}</span>
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<a href="{register_url}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#B8960F);color:#0A0612;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Зарегистрироваться</a>
</td></tr>
</table>
<p style="margin:24px 0 0;color:#4A3F6A;font-size:13px;line-height:1.5;">Если кнопка не работает, скопируйте код и введите его на странице регистрации вручную.</p>
</td></tr>
<tr><td align="center" style="padding-top:24px;">
<p style="margin:0;color:#4A3F6A;font-size:12px;">Orbitron · 2026</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""


def verification_email_html(verify_url: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0A0612;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0612;min-height:100vh;">
<tr><td align="center" style="padding:40px 20px;">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
<tr><td align="center" style="padding-bottom:32px;">
<h1 style="margin:0;color:#F0EAD6;font-size:28px;font-weight:600;">Orbitron</h1>
<p style="margin:8px 0 0;color:#8B7FA8;font-size:14px;">ИИ-астролог</p>
</td></tr>
<tr><td style="background:linear-gradient(135deg,rgba(28,18,6,0.95),rgba(10,6,18,0.98));border:1px solid rgba(212,175,55,0.2);border-radius:16px;padding:40px 32px;">
<h2 style="margin:0 0 16px;color:#F0EAD6;font-size:22px;font-weight:600;">Подтвердите ваш email</h2>
<p style="margin:0 0 24px;color:#8B7FA8;font-size:15px;line-height:1.6;">Спасибо за регистрацию в Orbitron! Для завершения нажмите кнопку ниже:</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<a href="{verify_url}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#B8960F);color:#0A0612;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">Подтвердить email</a>
</td></tr>
</table>
<p style="margin:24px 0 0;color:#4A3F6A;font-size:13px;line-height:1.5;">Ссылка действительна 24 часа. Если вы не регистрировались в Orbitron, просто проигнорируйте это письмо.</p>
</td></tr>
<tr><td align="center" style="padding-top:24px;">
<p style="margin:0;color:#4A3F6A;font-size:12px;">Orbitron · 2026</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
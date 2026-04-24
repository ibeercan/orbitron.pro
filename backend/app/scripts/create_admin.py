"""Create admin user script.

Usage:
    python -m app.scripts.create_admin --email admin@orbitron.pro --password admin123
    python -m app.scripts.create_admin --email admin@orbitron.pro --password admin123 --premium
"""

import argparse
import asyncio
import sys

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.user import User, SubscriptionType


async def create_admin(email: str, password: str, premium: bool = False) -> None:
    from app.models.base import Base
    from app.db.session import engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalars().first()
        if existing:
            print(f"User {email} already exists (id={existing.id})")
            sys.exit(1)

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            is_admin=True,
            is_active=True,
            subscription_type=SubscriptionType.PREMIUM.value if premium else SubscriptionType.FREE.value,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"Admin user created: id={user.id}, email={email}, subscription={user.subscription_type}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create admin user")
    parser.add_argument("--email", required=True, help="Admin email")
    parser.add_argument("--password", required=True, help="Admin password")
    parser.add_argument("--premium", action="store_true", help="Grant premium subscription")
    args = parser.parse_args()

    asyncio.run(create_admin(args.email, args.password, args.premium))


if __name__ == "__main__":
    main()
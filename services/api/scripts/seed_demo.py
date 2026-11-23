"""Seed the local API with a visual Photo Tree demo.

Run from services/api:
    python scripts/seed_demo.py
"""
from datetime import date, datetime, timedelta
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.db import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.models import Space, SpaceMember, TreeFolder, TreeSpaceLink, User


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "demo@4to.app"))
        if not user:
            user = User(
                email="demo@4to.app",
                password_hash=hash_password("DemoPassword123"),
                username="demo",
                display_name="Demo Explorer",
            )
            db.add(user)
            db.flush()
        root_names = ["2024", "2025", "2026"]
        roots = []
        for root_name in root_names:
            root = db.scalar(select(TreeFolder).where(TreeFolder.owner_id == user.id, TreeFolder.name == root_name, TreeFolder.parent_id.is_(None)))
            if not root:
                root = TreeFolder(owner_id=user.id, name=root_name)
                db.add(root)
                db.flush()
            roots.append(root)
        branch_names = ["Bali", "Coast", "Family", "Graduation"]
        branches = []
        for index in range(12):
            parent = roots[index % len(roots)]
            name = f"{branch_names[index % len(branch_names)]} {index // len(branch_names) + 1}"
            branch = db.scalar(select(TreeFolder).where(TreeFolder.owner_id == user.id, TreeFolder.name == name, TreeFolder.parent_id == parent.id))
            if not branch:
                branch = TreeFolder(owner_id=user.id, parent_id=parent.id, name=name)
                db.add(branch)
                db.flush()
            branches.append(branch)
        for index in range(20):
            name = f"Demo Space {index + 1:02d}"
            space = db.scalar(select(Space).where(Space.owner_id == user.id, Space.name == name))
            if not space:
                start = date(2024 + index // 8, (index % 8) + 1, 5)
                space = Space(owner_id=user.id, name=name, start_date=start, end_date=start + timedelta(days=3))
                db.add(space)
                db.flush()
                db.add(SpaceMember(space_id=space.id, user_id=user.id, role="owner", membership_type="friend", status="joined", joined_at=datetime.utcnow()))
                db.add(TreeSpaceLink(user_id=user.id, space_id=space.id, folder_id=branches[index % len(branches)].id, position=index))
        db.commit()
        print("Seeded demo@4to.app / DemoPassword123 with 12 branches and 20 Spaces.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

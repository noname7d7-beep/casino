import os
import sqlite3
import time
import secrets
import string
from pathlib import Path
from typing import List, Optional, Set

from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from dotenv import load_dotenv


# =============================
#   ЗАГРУЖАЕМ .env
# =============================

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

ADMIN_USER = os.getenv("ADMIN_USER", "Worker077")
ADMIN_PASS = os.getenv("ADMIN_PASS", "MTadmin!2025")

DB_PATH = ROOT_DIR / "backend" / "data" / "codex.db"
os.makedirs(DB_PATH.parent, exist_ok=True)


router = APIRouter(prefix="/api", tags=["api"])


# =============================
#   МОДЕЛИ
# =============================

class AdminLoginRequest(BaseModel):
    user: str
    password: str


class AdminLoginResponse(BaseModel):
    ok: bool
    token: str


class GenerateRequest(BaseModel):
    game: str


class GenerateResponse(BaseModel):
    code: str
    game: str
    max_uses: int


class PromoCode(BaseModel):
    code: str
    game: str
    max_uses: int
    used: int
    created_at: int


class PromoCheckRequest(BaseModel):
    code: str
    game: str


class PromoCheckResponse(BaseModel):
    valid: bool
    attempts_left: int


class GameUseRequest(BaseModel):
    code: str
    game: str


class GameUseResponse(BaseModel):
    ok: bool
    remaining: int


# =============================
#   БАЗА ДАННЫХ
# =============================

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS promo_codes (
            code TEXT PRIMARY KEY,
            game TEXT NOT NULL,
            max_uses INTEGER NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        )
    """)
    conn.commit()
    conn.close()


init_db()


MAX_USES_PER_CODE = 7
VALID_GAMES = {
    "aviator",
    "mines",
    "plinko",
    "chickenroad",
    "footballx",
    "thimbles",
}

ADMIN_TOKENS: Set[str] = set()


# =============================
#   АДМИН — ЛОГИН
# =============================

@router.post("/admin/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest) -> AdminLoginResponse:
    if payload.user != ADMIN_USER or payload.password != ADMIN_PASS:
        raise HTTPException(status_code=403, detail="invalid_credentials")

    token = secrets.token_hex(16)
    ADMIN_TOKENS.add(token)

    return AdminLoginResponse(ok=True, token=token)


def require_admin(x_admin_token: Optional[str] = Header(default=None)) -> str:
    if not x_admin_token or x_admin_token not in ADMIN_TOKENS:
        raise HTTPException(status_code=401, detail="unauthorized")
    return x_admin_token


# =============================
#   АДМИН — ГЕНЕРАЦИЯ ПРОМО
# =============================

def generate_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.post("/admin/generate", response_model=GenerateResponse)
def generate_promo(payload: GenerateRequest, _: str = Depends(require_admin)) -> GenerateResponse:
    game = payload.game.lower()

    if game not in VALID_GAMES:
        raise HTTPException(status_code=400, detail="invalid_game")

    code = generate_code()
    created_at = int(time.time())

    conn = get_db()
    conn.execute(
        """
        INSERT INTO promo_codes (code, game, max_uses, used, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (code, game, MAX_USES_PER_CODE, 0, created_at),
    )
    conn.commit()
    conn.close()

    return GenerateResponse(code=code, game=game, max_uses=MAX_USES_PER_CODE)


# =============================
#   АДМИН — СПИСОК ПРОМО
# =============================

@router.get("/admin/list", response_model=List[PromoCode])
def list_codes(_: str = Depends(require_admin)) -> List[PromoCode]:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT code, game, max_uses, used, created_at
        FROM promo_codes
        ORDER BY created_at DESC
        """
    ).fetchall()
    conn.close()
    return [PromoCode(**dict(row)) for row in rows]


# =============================
#   ПРОВЕРКА ПРОМО (НЕ СПИСЫВАЕТ)
# =============================

@router.post("/promo/check", response_model=PromoCheckResponse)
def promo_check(payload: PromoCheckRequest) -> PromoCheckResponse:
    game = payload.game.lower()
    code = payload.code.strip().upper()

    if game not in VALID_GAMES:
        return PromoCheckResponse(valid=False, attempts_left=0)

    conn = get_db()
    row = conn.execute(
        """
        SELECT max_uses, used
        FROM promo_codes
        WHERE code = ? AND game = ?
        """,
        (code, game),
    ).fetchone()
    conn.close()

    if not row:
        return PromoCheckResponse(valid=False, attempts_left=0)

    remaining = row["max_uses"] - row["used"]

    if remaining <= 0:
        return PromoCheckResponse(valid=False, attempts_left=0)

    return PromoCheckResponse(valid=True, attempts_left=remaining)


# =============================
#   ИСПОЛЬЗОВАНИЕ ПРОМО (СПИСЫВАЕТ)
# =============================

@router.post("/game/use", response_model=GameUseResponse)
def use_code(payload: GameUseRequest) -> GameUseResponse:
    game = payload.game.lower()
    code = payload.code.strip().upper()

    conn = get_db()
    row = conn.execute(
        """
        SELECT max_uses, used
        FROM promo_codes
        WHERE code = ? AND game = ?
        """,
        (code, game),
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=403, detail="invalid_code_or_game")

    if row["used"] >= row["max_uses"]:
        conn.close()
        raise HTTPException(status_code=403, detail="limit_exceeded")

    remaining = row["max_uses"] - row["used"] - 1

    conn.execute(
        "UPDATE promo_codes SET used = used + 1 WHERE code = ?",
        (code,)
    )
    conn.commit()
    conn.close()

    return GameUseResponse(ok=True, remaining=remaining)
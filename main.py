import hashlib
import hmac
import io
import json
import os
import random
import secrets
import smtplib
import socket
import sqlite3
import ssl
import urllib.error
import urllib.request
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from google.genai import types

load_dotenv(override=True)

DB_FILE = "kharach_ai.db"
UPLOADS_DIR = "uploads"
STATIC_DIR = "static"

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

app = FastAPI(title="Kharach AI API", version="2.9.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Kharach AI API"
    }


@app.get("/api/config")
def get_public_config():
    return {
        "require_mobile_otp": get_setting_from_db("REQUIRE_MOBILE_OTP", "false").lower() == "true",
        "save_uploaded_files": get_setting_from_db("SAVE_UPLOADED_FILES", "false").lower() == "true",
    }


OTP_STORE: Dict[str, Dict[str, Any]] = {}

PROMPT_TEXT = """
Extract all line-item bank/UPI transactions from the provided document or image.
Return ONLY a valid JSON list of objects without any markdown formatting or extra commentary.

Each transaction object must strictly conform to this JSON schema:
[
  {
    "date": "YYYY-MM-DD",
    "recipient_or_sender": "Name or Merchant extracted from Particulars",
    "particulars_note": "Specific transaction notes (e.g., petrol, rent, bike servicing, jagga la pathavle)",
    "debit_amount": 0.0,
    "credit_amount": 0.0,
    "type": "DEBIT" or "CREDIT",
    "category": "Fuel" or "Rent/Housing" or "Shopping" or "ATM/Cash" or "Food/Groceries" or "EMIs/Loans" or "Transfers/Personal" or "Income" or "Bills/Recharge" or "Others"
  }
]

Parsing Rules:
1. Handle page breaks or incomplete entries gracefully.
2. Clean messy UPI handles into readable recipient names and specific notes (e.g., parse 'UPI/DR/657380366355/SANDEEP/SBIN/Bike Servicing' to Recipient: 'SANDEEP', Note: 'Bike Servicing').
3. Default missing credit or debit amounts to 0.0.
4. Ensure 'type' is strictly either 'DEBIT' or 'CREDIT'.
"""


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


def get_setting_from_db(key: str, default: str = "") -> str:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM app_settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        val = row["value"].strip() if (row and row["value"]) else ""
        return val if val else os.environ.get(key, default)


def set_setting_in_db(key: str, value: str) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
            (key, value, value),
        )
        conn.commit()
    os.environ[key] = value


def get_secret_key() -> str:
    secret = get_setting_from_db("SECRET_KEY", "")
    if not secret:
        secret = secrets.token_hex(32)
        set_setting_in_db("SECRET_KEY", secret)
    return secret


def sign_cookie(value: str) -> str:
    secret = get_secret_key()
    signature = hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()
    return f"{value}.{signature}"


def verify_cookie(signed_cookie: str) -> Optional[str]:
    if not signed_cookie or "." not in signed_cookie:
        return None
    value, signature = signed_cookie.rsplit(".", 1)
    secret = get_secret_key()
    expected_sig = hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()
    if hmac.compare_digest(signature, expected_sig):
        return value
    return None


def init_db() -> None:
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = [row["name"] for row in cursor.fetchall()]

        if "full_name" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN full_name TEXT NOT NULL DEFAULT ''")
        if "email" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''")
        if "mobile" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN mobile TEXT NOT NULL DEFAULT ''")
        if "is_admin" not in columns:
            conn.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
            conn.execute("UPDATE users SET is_admin = 1 WHERE id = 1")

        # Ensure default admin user exists
        cursor.execute("SELECT id FROM users WHERE username = ?", ("admin",))
        if not cursor.fetchone():
            conn.execute(
                "INSERT INTO users (username, password_hash, full_name, email, mobile, is_admin) VALUES (?, ?, ?, ?, ?, 1)",
                ("admin", hash_password("Corpus@123"), "Administrator", "admin@kharach.ai", "0000000000")
            )


        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT,
                recipient_or_sender TEXT,
                particulars_note TEXT,
                debit_amount REAL DEFAULT 0.0,
                credit_amount REAL DEFAULT 0.0,
                type TEXT,
                category TEXT,
                account_name TEXT DEFAULT 'General',
                file_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            """
        )
        cursor.execute("PRAGMA table_info(transactions)")
        tx_cols = [row["name"] for row in cursor.fetchall()]
        if "account_name" not in tx_cols:
            conn.execute("ALTER TABLE transactions ADD COLUMN account_name TEXT DEFAULT 'General'")
        conn.execute("UPDATE transactions SET account_name = 'General' WHERE account_name = 'General Account' OR account_name IS NULL OR account_name = ''")


        # Deduplicate existing transactions before creating unique index
        conn.execute(
            """
            DELETE FROM transactions
            WHERE rowid NOT IN (
                SELECT MIN(rowid)
                FROM transactions
                GROUP BY user_id, date, recipient_or_sender, particulars_note, debit_amount, credit_amount
            );
            """
        )
        conn.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique 
            ON transactions (user_id, date, recipient_or_sender, particulars_note, debit_amount, credit_amount);
            """
        )


        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_budgets (
                user_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                budget_limit REAL DEFAULT 0.0,
                PRIMARY KEY (user_id, category),
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                phone TEXT DEFAULT '',
                email TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS debts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                contact_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('GAVE', 'GOT')),
                amount REAL NOT NULL DEFAULT 0.0,
                note TEXT DEFAULT '',
                date TEXT NOT NULL,
                due_date TEXT DEFAULT '',
                status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SETTLED')),
                linked_transaction_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
                FOREIGN KEY (linked_transaction_id) REFERENCES transactions (id) ON DELETE SET NULL
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                currency TEXT DEFAULT 'INR',
                description TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS group_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                contact_id INTEGER,
                phone TEXT DEFAULT '',
                email TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
                FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE SET NULL
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS group_expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                paid_by_member_id INTEGER NOT NULL,
                amount REAL NOT NULL DEFAULT 0.0,
                title TEXT NOT NULL,
                category TEXT DEFAULT 'Others',
                date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
                FOREIGN KEY (paid_by_member_id) REFERENCES group_members (id) ON DELETE CASCADE
            );
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS group_expense_splits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expense_id INTEGER NOT NULL,
                member_id INTEGER NOT NULL,
                split_amount REAL NOT NULL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (expense_id) REFERENCES group_expenses (id) ON DELETE CASCADE,
                FOREIGN KEY (member_id) REFERENCES group_members (id) ON DELETE CASCADE
            );
            """
        )
        conn.commit()


def hash_password(password: str) -> str:
    salt = b"kharach_ai_salt_2026"
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000).hex()


def verify_password(plain_password: str, stored_hash: str) -> bool:
    new_hash = hash_password(plain_password)
    if hmac.compare_digest(new_hash, stored_hash):
        return True
    legacy_hash = hashlib.sha256(plain_password.encode()).hexdigest()
    return hmac.compare_digest(legacy_hash, stored_hash)


init_db()



def create_ipv4_socket(host: str, port: int, timeout: float = 10.0) -> socket.socket:
    """Force IPv4 socket resolution to prevent Render/Cloud IPv6 unreachable errors."""
    infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
    last_err = None
    for family, socktype, proto, _, sockaddr in infos:
        try:
            s = socket.socket(family, socktype, proto)
            s.settimeout(timeout)
            s.connect(sockaddr)
            return s
        except Exception as e:
            last_err = e
    if last_err:
        raise last_err
    raise socket.error(f"Could not connect to {host}:{port} via IPv4")


def send_email_via_http_api(to_email: str, otp_code: str, html_body: str) -> bool:
    """Send Email OTP via HTTPS REST API (Port 443 — NEVER blocked on Render Free Tier)."""
    resend_key = get_setting_from_db("RESEND_API_KEY", "").strip() or os.environ.get("RESEND_API_KEY", "").strip()
    brevo_key = get_setting_from_db("BREVO_API_KEY", "").strip() or os.environ.get("BREVO_API_KEY", "").strip()

    subject = f"Kharach AI — Your Verification Code: {otp_code}"
    from_email = get_setting_from_db("SMTP_FROM_EMAIL", "").strip()

    # 1. Try Resend HTTP API (Port 443)
    if resend_key:
        try:
            print(f"[HTTP EMAIL ATTEMPT] Sending via Resend API to {to_email}...")
            payload = json.dumps({
                "from": from_email or "onboarding@resend.dev",
                "to": [to_email],
                "subject": subject,
                "html": html_body
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.resend.com/emails",
                data=payload,
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201):
                    print(f"[HTTP EMAIL SUCCESS] Email OTP sent to {to_email} via Resend API")
                    return True
        except Exception as e:
            print(f"[HTTP EMAIL ERROR] Resend API failed: {e}")

    # 2. Try Brevo HTTP API (Port 443)
    if brevo_key:
        try:
            print(f"[HTTP EMAIL ATTEMPT] Sending via Brevo API to {to_email}...")
            sender = from_email or get_setting_from_db("SMTP_USERNAME", "").strip() or "noreply@kharach.ai"
            payload = json.dumps({
                "sender": {"email": sender, "name": "Kharach AI"},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_body
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=payload,
                headers={
                    "api-key": brevo_key,
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201):
                    print(f"[HTTP EMAIL SUCCESS] Email OTP sent to {to_email} via Brevo API")
                    return True
        except Exception as e:
            print(f"[HTTP EMAIL ERROR] Brevo API failed: {e}")

    return False


def send_email_otp(to_email: str, otp_code: str) -> bool:
    smtp_server = get_setting_from_db("SMTP_SERVER", "smtp.gmail.com")
    smtp_port_raw = get_setting_from_db("SMTP_PORT", "587")
    try:
        smtp_port = int(smtp_port_raw)
    except (ValueError, TypeError):
        smtp_port = 587

    smtp_user = get_setting_from_db("SMTP_USERNAME", "")
    smtp_pass = get_setting_from_db("SMTP_PASSWORD", "")
    from_email = get_setting_from_db("SMTP_FROM_EMAIL", smtp_user or "noreply@kharach.ai")

    body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #0a0c10; color: #f0f4f8; padding: 20px;">
        <div style="max-width: 500px; margin: auto; background-color: #12161f; padding: 25px; border-radius: 10px; border: 1px solid #222;">
          <h2 style="color: #6366f1; text-align: center;">💡 Kharach AI</h2>
          <p>Hello,</p>
          <p>Your verification code for Kharach AI is:</p>
          <h1 style="text-align: center; color: #10b981; letter-spacing: 5px; font-size: 32px;">{otp_code}</h1>
          <p>This code will expire in 10 minutes. Do not share this OTP with anyone.</p>
        </div>
      </body>
    </html>
    """

    # First attempt: Try HTTP API (Port 443 — 100% works on Render without firewall port blocking)
    if send_email_via_http_api(to_email, otp_code, body):
        return True

    if not smtp_user or not smtp_pass:
        print(f"[SMTP WARNING] Credentials missing. Logging Email OTP for {to_email}: {otp_code}")
        return False

    msg = MIMEMultipart()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = f"Kharach AI — Your Verification Code: {otp_code}"
    msg.attach(MIMEText(body, "html"))

    # Fallback list: try configured port first, then alternative port (587 vs 465)
    ports_to_try = [smtp_port]
    alt_port = 587 if smtp_port == 465 else 465
    if alt_port not in ports_to_try:
        ports_to_try.append(alt_port)

    for p in ports_to_try:
        try:
            print(f"[SMTP ATTEMPT] Connecting to {smtp_server}:{p} via IPv4 socket...")
            raw_sock = create_ipv4_socket(smtp_server, p, timeout=6.0)
            if p == 465:
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(smtp_server, p, sock=raw_sock, context=context)
            else:
                server = smtplib.SMTP(smtp_server, p, sock=raw_sock)
                server.starttls()

            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            print(f"[SMTP SUCCESS] Email OTP sent to {to_email} via port {p}")
            return True
        except Exception as err:
            print(f"[SMTP ATTEMPT FAILED] Server {smtp_server}:{p} error: {err}")

    print(f"[SMTP ERROR] All SMTP connection attempts failed for {to_email}. Fallback OTP: {otp_code}")
    return False


def get_current_user_id(request: Request) -> int:
    raw_cookie = request.cookies.get("user_id", "")
    user_id_str = verify_cookie(raw_cookie)
    if not user_id_str:
        # Check raw integer fallback for legacy un-signed cookies
        if raw_cookie and raw_cookie.isdigit():
            user_id_str = raw_cookie
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
            )
    return int(user_id_str)



def is_admin_user(user_id: int) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT is_admin FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if row and row["is_admin"] is not None:
            return bool(row["is_admin"])
        return user_id == 1


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, full_name, username, email, mobile, is_admin FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


@app.get("/api/admin/settings")
def get_admin_settings(request: Request):
    user_id = get_current_user_id(request)
    if not is_admin_user(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    return {
        "gemini_api_key": get_setting_from_db("GEMINI_API_KEY", ""),
        "gemini_model": get_setting_from_db("GEMINI_MODEL", "gemini-flash-latest"),
        "smtp_server": get_setting_from_db("SMTP_SERVER", "smtp.gmail.com"),
        "smtp_port": get_setting_from_db("SMTP_PORT", "587"),
        "smtp_username": get_setting_from_db("SMTP_USERNAME", ""),
        "smtp_password": get_setting_from_db("SMTP_PASSWORD", ""),
        "smtp_from_email": get_setting_from_db("SMTP_FROM_EMAIL", ""),
        "resend_api_key": get_setting_from_db("RESEND_API_KEY", ""),
        "brevo_api_key": get_setting_from_db("BREVO_API_KEY", ""),
        "require_mobile_otp": get_setting_from_db("REQUIRE_MOBILE_OTP", "false"),
        "save_uploaded_files": get_setting_from_db("SAVE_UPLOADED_FILES", "false"),
    }


@app.post("/api/admin/settings")
def save_admin_settings(
    request: Request,
    gemini_api_key: str = Form(...),
    gemini_model: str = Form(...),
    smtp_server: str = Form(...),
    smtp_port: str = Form(...),
    smtp_username: str = Form(...),
    smtp_password: str = Form(...),
    smtp_from_email: str = Form(...),
    resend_api_key: str = Form(""),
    brevo_api_key: str = Form(""),
    require_mobile_otp: str = Form("false"),
    save_uploaded_files: str = Form("false"),
):
    user_id = get_current_user_id(request)
    if not is_admin_user(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    set_setting_in_db("GEMINI_API_KEY", gemini_api_key)
    set_setting_in_db("GEMINI_MODEL", gemini_model)
    set_setting_in_db("SMTP_SERVER", smtp_server)
    set_setting_in_db("SMTP_PORT", smtp_port)
    set_setting_in_db("SMTP_USERNAME", smtp_username)
    set_setting_in_db("SMTP_PASSWORD", smtp_password)
    set_setting_in_db("SMTP_FROM_EMAIL", smtp_from_email)
    set_setting_in_db("RESEND_API_KEY", resend_api_key)
    set_setting_in_db("BREVO_API_KEY", brevo_api_key)
    set_setting_in_db("REQUIRE_MOBILE_OTP", require_mobile_otp)
    set_setting_in_db("SAVE_UPLOADED_FILES", save_uploaded_files)
    return {"message": "Admin settings saved successfully"}




@app.post("/api/send-otp")
def send_otp(email: str = Form(...), mobile: Optional[str] = Form("")):
    if not email:
        raise HTTPException(status_code=400, detail="Email address is required")

    email_otp = f"{random.randint(100000, 999999)}"
    OTP_STORE[email] = {"otp": email_otp, "created_at": datetime.now().timestamp()}

    req_mobile = get_setting_from_db("REQUIRE_MOBILE_OTP", "false").lower() == "true"
    if req_mobile and mobile:
        mobile_otp = f"{random.randint(100000, 999999)}"
        OTP_STORE[mobile] = {"otp": mobile_otp, "created_at": datetime.now().timestamp()}
        print(f"[OTP SERVICE] Mobile OTP for {mobile}: {mobile_otp}")

    sent_via_smtp = send_email_otp(email, email_otp)

    print(f"[OTP SERVICE] Email OTP for {email}: {email_otp}")

    status_msg = "Verification OTP sent to your Email Address."
    if not sent_via_smtp:
        status_msg += " (Check server log if SMTP is not configured)"

    return {"message": status_msg}


@app.post("/api/signup")
def signup(
    full_name: str = Form(...),
    username: str = Form(...),
    email: str = Form(...),
    mobile: str = Form(""),
    password: str = Form(...),
    email_otp: str = Form(...),
    mobile_otp: Optional[str] = Form(""),
):
    if not full_name or not username or not email or not password:
        raise HTTPException(status_code=400, detail="All required fields must be filled")

    stored_email = OTP_STORE.get(email)

    if not stored_email or stored_email["otp"] != email_otp:
        raise HTTPException(status_code=400, detail="Invalid or expired Email OTP")

    req_mobile = get_setting_from_db("REQUIRE_MOBILE_OTP", "false").lower() == "true"
    if req_mobile:
        stored_mobile = OTP_STORE.get(mobile)
        if not stored_mobile or stored_mobile["otp"] != mobile_otp:
            raise HTTPException(status_code=400, detail="Invalid or expired Mobile OTP")

    password_hash = hash_password(password)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM users")
            user_count = cursor.fetchone()["count"]
            is_first_user = 1 if user_count == 0 else 0

            conn.execute(
                """
                INSERT INTO users (full_name, username, email, mobile, password_hash, is_admin)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (full_name, username, email, mobile, password_hash, is_first_user),
            )
            conn.commit()
            OTP_STORE.pop(email, None)
            OTP_STORE.pop(mobile, None)
            return {"message": "Account created and verified successfully!"}
    except sqlite3.IntegrityError as e:
        err_msg = str(e)
        if "username" in err_msg:
            raise HTTPException(status_code=400, detail="Username already exists")
        elif "email" in err_msg:
            raise HTTPException(status_code=400, detail="Email already registered")
        elif "mobile" in err_msg:
            raise HTTPException(status_code=400, detail="Mobile number already registered")
        raise HTTPException(status_code=400, detail="User registration failed")


@app.post("/api/login")
def login(response: Response, username: str = Form(...), password: str = Form(...)):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, full_name, username, password_hash, is_admin FROM users WHERE username = ? OR email = ? OR mobile = ?",
            (username, username, username),
        )
        row = cursor.fetchone()
        if not row or not verify_password(password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id = row["id"]
        # Auto-upgrade legacy hash to PBKDF2
        new_pbkdf2_hash = hash_password(password)
        if row["password_hash"] != new_pbkdf2_hash:
            conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_pbkdf2_hash, user_id))
            conn.commit()

        signed_val = sign_cookie(str(user_id))
        response.set_cookie(
            key="user_id",
            value=signed_val,
            httponly=True,
            samesite="lax",
            max_age=86400 * 7,
        )
        return {
            "message": "Login successful",
            "username": row["username"],
            "full_name": row["full_name"],
            "is_admin": is_admin_user(user_id),
        }


@app.post("/api/reset-password")
def reset_password(
    email: str = Form(...),
    email_otp: str = Form(...),
    new_password: str = Form(...),
):
    if not email or not email_otp or not new_password:
        raise HTTPException(status_code=400, detail="All fields are required")

    stored_email = OTP_STORE.get(email)
    if not stored_email or stored_email["otp"] != email_otp:
        raise HTTPException(status_code=400, detail="Invalid or expired Email OTP")

    new_hash = hash_password(new_password)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        user_row = cursor.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="Email address not found")

        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_row["id"]))
        conn.commit()
        OTP_STORE.pop(email, None)
        return {"message": "Password reset successfully. Please sign in with your new password."}


@app.post("/api/transactions")
def add_transaction(
    request: Request,
    date: str = Form(...),
    recipient_or_sender: str = Form(...),
    particulars_note: str = Form(...),
    debit_amount: float = Form(0.0),
    credit_amount: float = Form(0.0),
    tx_type: str = Form("DEBIT"),
    category: str = Form("Others"),
    account_name: str = Form("General"),
):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        try:
            cursor = conn.execute(
                """
                INSERT INTO transactions (
                    user_id, date, recipient_or_sender, particulars_note,
                    debit_amount, credit_amount, type, category, account_name, file_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_entry')
                """,
                (user_id, date, recipient_or_sender, particulars_note, debit_amount, credit_amount, tx_type, category, account_name),
            )
            conn.commit()
            return {"message": "Transaction added successfully", "id": cursor.lastrowid}
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail="Identical transaction already exists.")


@app.put("/api/transactions/{tx_id}")
def update_transaction(
    tx_id: int,
    request: Request,
    date: str = Form(...),
    recipient_or_sender: str = Form(...),
    particulars_note: str = Form(...),
    debit_amount: float = Form(0.0),
    credit_amount: float = Form(0.0),
    tx_type: str = Form("DEBIT"),
    category: str = Form("Others"),
    account_name: str = Form("General"),
):

    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Transaction not found")

        conn.execute(
            """
            UPDATE transactions
            SET date = ?, recipient_or_sender = ?, particulars_note = ?,
                debit_amount = ?, credit_amount = ?, type = ?, category = ?, account_name = ?
            WHERE id = ? AND user_id = ?
            """,
            (date, recipient_or_sender, particulars_note, debit_amount, credit_amount, tx_type, category, account_name, tx_id, user_id),
        )
        conn.commit()
        return {"message": "Transaction updated successfully"}



@app.delete("/api/transactions/{tx_id}")
def delete_single_transaction(tx_id: int, request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Transaction not found")
        conn.commit()
        return {"message": "Transaction deleted successfully"}


@app.post("/api/transactions/bulk-delete")
def bulk_delete_transactions(request: Request, tx_ids: List[int] = Form(...)):
    user_id = get_current_user_id(request)
    if not tx_ids:
        raise HTTPException(status_code=400, detail="No transaction IDs provided")
    with get_db() as conn:
        placeholders = ",".join(["?"] * len(tx_ids))
        cursor = conn.cursor()
        cursor.execute(f"DELETE FROM transactions WHERE user_id = ? AND id IN ({placeholders})", [user_id] + list(tx_ids))
        conn.commit()
        return {"message": f"{cursor.rowcount} transactions deleted successfully"}


@app.post("/api/transactions/bulk-category")
def bulk_category_transactions(request: Request, category: str = Form(...), tx_ids: List[int] = Form(...)):
    user_id = get_current_user_id(request)
    if not tx_ids:
        raise HTTPException(status_code=400, detail="No transaction IDs provided")
    with get_db() as conn:
        placeholders = ",".join(["?"] * len(tx_ids))
        cursor = conn.cursor()
        cursor.execute(f"UPDATE transactions SET category = ? WHERE user_id = ? AND id IN ({placeholders})", [category, user_id] + list(tx_ids))
        conn.commit()
        return {"message": f"{cursor.rowcount} transactions updated successfully"}



@app.post("/api/logout")
def logout(response: Response):
    response.delete_cookie("user_id")
    return {"message": "Logged out successfully"}


@app.get("/api/me")
def me(request: Request):
    try:
        user_id = get_current_user_id(request)
        user = get_user_by_id(user_id)
        if user:
            return {
                "authenticated": True,
                "username": user["username"],
                "full_name": user["full_name"],
                "is_admin": is_admin_user(user_id),
            }
    except HTTPException:
        pass
    return {"authenticated": False, "is_admin": False}


def get_api_key_pool() -> List[str]:
    """Return all configured Gemini API keys in order, filtering out empty entries."""
    keys: List[str] = []
    # Collect GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3 ...
    primary = get_setting_from_db("GEMINI_API_KEY", "")
    if primary:
        keys.append(primary)
    idx = 2
    while True:
        env_key = f"GEMINI_API_KEY_{idx}"
        val = os.environ.get(env_key, "").strip()
        if not val:
            break
        keys.append(val)
        idx += 1
    return keys


def get_working_model(client: genai.Client) -> str:
    """Return the configured Gemini model name. Actual availability is
    validated lazily inside the rotation loop in /api/chat, so no
    pre-flight ping is made here (avoids burning quota on verification)."""
    env_model = get_setting_from_db("GEMINI_MODEL", "gemini-flash-latest")
    return env_model.strip() if env_model.strip() else "gemini-flash-latest"


@app.get("/api/test-models")
def test_models(request: Request):
    user_id = get_current_user_id(request)
    if not is_admin_user(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    api_keys = get_api_key_pool()
    if not api_keys:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY configuration missing.")

    candidates = ["gemini-flash-latest", "gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"]

    results = []
    for key_idx, api_key in enumerate(api_keys):
        client = genai.Client(api_key=api_key)
        key_label = f"Key#{key_idx + 1}"
        for m_name in candidates:
            try:
                res = client.models.generate_content(model=m_name, contents=["ping"])
                if res and (res.text or hasattr(res, "candidates")):
                    results.append({"name": f"{key_label} · {m_name}", "status": "WORKING"})
                else:
                    results.append({"name": f"{key_label} · {m_name}", "status": "NO RESPONSE"})
            except Exception as err:
                err_str = str(err)
                results.append({"name": f"{key_label} · {m_name}", "status": f"FAILED: {err_str[:60]}"})

    return {"models": results}


@app.get("/api/user-files")
def get_user_files(request: Request):
    user_id = get_current_user_id(request)
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    username = user["username"]
    user_folder = os.path.join(UPLOADS_DIR, username)
    if not os.path.exists(user_folder):
        return []

    files_list = []
    for fname in os.listdir(user_folder):
        fpath = os.path.join(user_folder, fname)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            files_list.append({
                "filename": fname,
                "size_bytes": stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            })
    return files_list


@app.post("/api/reanalyze-existing")
def reanalyze_existing_files(request: Request, filenames: List[str] = Form(...)):
    user_id = get_current_user_id(request)
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    api_key = get_setting_from_db("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="Server configuration error: GEMINI_API_KEY missing in Admin Settings.")

    client = genai.Client(api_key=api_key)
    active_model = get_working_model(client)
    username = user["username"]
    user_folder = os.path.join(UPLOADS_DIR, username)

    inserted_count = 0
    with get_db() as conn:
        for fname in filenames:
            file_path = os.path.join(user_folder, fname)
            if not os.path.exists(file_path):
                continue

            with open(file_path, "rb") as f:
                file_bytes = f.read()

            ext = os.path.splitext(fname)[1].lower()
            mime_type = "application/pdf" if ext == ".pdf" else "image/png" if ext == ".png" else "image/jpeg"

            try:
                part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
                response = client.models.generate_content(
                    model=active_model,
                    contents=[part, PROMPT_TEXT],
                    config=types.GenerateContentConfig(response_mime_type="application/json"),
                )
                raw_json = response.text or "[]"
                parsed_txs = json.loads(raw_json)

                for tx in parsed_txs:
                    res = conn.execute(
                        """
                        INSERT OR IGNORE INTO transactions (
                            user_id, date, recipient_or_sender, particulars_note,
                            debit_amount, credit_amount, type, category, file_path
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            user_id,
                            str(tx.get("date", "")),
                            str(tx.get("recipient_or_sender", "")),
                            str(tx.get("particulars_note", "")),
                            float(tx.get("debit_amount", 0.0)),
                            float(tx.get("credit_amount", 0.0)),
                            str(tx.get("type", "DEBIT")),
                            str(tx.get("category", "Others")),
                            file_path,
                        ),
                    )
                    if res.rowcount > 0:
                        inserted_count += 1
            except Exception as e:
                print(f"Error reanalyzing file {fname}: {e}")
        conn.commit()

    return {"message": "Existing statements re-analyzed successfully", "inserted_count": inserted_count}


@app.post("/api/analyze")
async def analyze_statements(
    request: Request,
    files: List[UploadFile] = File(...),
    custom_prompt: Optional[str] = Form(None),
):
    user_id = get_current_user_id(request)
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    api_key = get_setting_from_db("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: GEMINI_API_KEY missing in Admin Settings.",
        )

    client = genai.Client(api_key=api_key)
    active_model = get_working_model(client)
    username = user["username"]
    user_folder = os.path.join(UPLOADS_DIR, username)
    os.makedirs(user_folder, exist_ok=True)

    final_prompt = PROMPT_TEXT
    if custom_prompt and custom_prompt.strip():
        final_prompt += f"\n\nAdditional User Inquiry/Instruction:\n{custom_prompt.strip()}"

    inserted_count = 0

    save_files_flag = get_setting_from_db("SAVE_UPLOADED_FILES", "false").lower() == "true"

    with get_db() as conn:
        for file in files:
            file_bytes = await file.read()
            if save_files_flag:
                file_path = os.path.join(user_folder, file.filename)
                with open(file_path, "wb") as f:
                    f.write(file_bytes)
            else:
                file_path = "in_memory"

            mime_type = file.content_type or "application/pdf"
            if mime_type == "application/pdf" or mime_type.startswith("image/"):
                try:
                    part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
                    response = client.models.generate_content(
                        model=active_model,
                        contents=[part, final_prompt],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        ),
                    )
                    raw_json = response.text or "[]"
                    parsed_txs: List[Dict[str, Any]] = json.loads(raw_json)

                    for tx in parsed_txs:
                        res = conn.execute(
                            """
                            INSERT OR IGNORE INTO transactions (
                                user_id, date, recipient_or_sender, particulars_note,
                                debit_amount, credit_amount, type, category, file_path
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                user_id,
                                str(tx.get("date", "")),
                                str(tx.get("recipient_or_sender", "")),
                                str(tx.get("particulars_note", "")),
                                float(tx.get("debit_amount", 0.0)),
                                float(tx.get("credit_amount", 0.0)),
                                str(tx.get("type", "DEBIT")),
                                str(tx.get("category", "Others")),
                                file_path,
                            ),
                        )
                        if res.rowcount > 0:
                            inserted_count += 1
                except Exception as e:
                    print(f"Error parsing file {file.filename}: {e}")

        conn.commit()

    return {
        "message": "Statements analyzed successfully",
        "inserted_count": inserted_count,
    }


@app.delete("/api/user-files/{filename}")
def delete_user_file(filename: str, request: Request):
    user_id = get_current_user_id(request)
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    username = user["username"]
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(UPLOADS_DIR, username, safe_filename)

    if os.path.exists(file_path):
        os.remove(file_path)
        with get_db() as conn:
            conn.execute("DELETE FROM transactions WHERE user_id = ? AND file_path = ?", (user_id, file_path))
            conn.commit()
        return {"message": f"File '{safe_filename}' deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="File not found")


@app.post("/api/chat")
async def chat_with_gemini(
    request: Request,
    prompt: Optional[str] = Form(None),
    selected_model: Optional[str] = Form(None),
    existing_filename: Optional[str] = Form(None),
    existing_filenames: List[str] = Form([]),
    files: List[UploadFile] = File([]),
):
    user_id = get_current_user_id(request)
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    api_keys = get_api_key_pool()
    if not api_keys:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: GEMINI_API_KEY missing in Admin Settings.",
        )

    # Build initial client from first key; will rotate if 429 occurs
    client = genai.Client(api_key=api_keys[0])
    model_to_use = selected_model if (selected_model and selected_model.strip()) else get_working_model(client)

    username = user["username"]
    user_folder = os.path.join(UPLOADS_DIR, username)
    os.makedirs(user_folder, exist_ok=True)

    contents: List[Any] = []
    inserted_count = 0

    # Retrieve existing user transactions to provide financial context for Q&A
    db_context = ""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT date, recipient_or_sender, particulars_note, debit_amount, credit_amount, type, category FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 100",
            (user_id,),
        )
        tx_rows = [dict(r) for r in cursor.fetchall()]
        if tx_rows:
            db_context = f"\nUser Current Saved Financial Transactions Summary (Last {len(tx_rows)} entries):\n"
            db_context += json.dumps(tx_rows, indent=2)

    # Process attached uploaded files
    for file in files:
        if file.filename:
            file_bytes = await file.read()
            file_path = os.path.join(user_folder, file.filename)
            with open(file_path, "wb") as f:
                f.write(file_bytes)

            mime_type = file.content_type or "application/pdf"
            contents.append(types.Part.from_bytes(data=file_bytes, mime_type=mime_type))

    # Combine single and multiple existing library filenames
    all_existing = list(existing_filenames)
    if existing_filename and existing_filename not in all_existing:
        all_existing.append(existing_filename)

    for lib_fname in all_existing:
        file_path = os.path.join(user_folder, lib_fname)
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            ext = os.path.splitext(lib_fname)[1].lower()
            mime_type = "application/pdf" if ext == ".pdf" else "image/png" if ext == ".png" else "image/jpeg"
            contents.append(types.Part.from_bytes(data=file_bytes, mime_type=mime_type))

    user_query = prompt.strip() if prompt else "Analyze the attached document(s)/image(s) and summarize all financial details."

    system_instruction = (
        "You are Kharach AI, an expert intelligent financial assistant & bank statement analyzer.\n"
        "If the user provides a bank statement screenshot or document to analyze/extract:\n"
        "1. Provide a friendly conversational summary of key expenses, income, or findings.\n"
        "2. ALSO, if bank/UPI line-item transactions are present, append a JSON block inside ```json ... ``` tags containing all line-item transactions strictly following this schema:\n"
        "[\n"
        '  {"date": "YYYY-MM-DD", "recipient_or_sender": "Name", "particulars_note": "Notes", "debit_amount": 0.0, "credit_amount": 0.0, "type": "DEBIT", "category": "Category"}\n'
        "]\n"
        "If the user asks a question about their spending, balance, categories, or financial advice:\n"
        "- Provide precise, clean, structured answers using bold category section headers.\n"
        "- Do NOT use deep markdown header symbols like '####'. Use bold section titles like '**1. Category Name (Amount)**'.\n"
        "- Do NOT leave dangling asterisks or unclosed markdown tags at line ends.\n"
        "- Keep line breaks tight and avoid empty line gaps between list items.\n"
        "- CRITICAL FOR CHARTS: Whenever presenting a spending breakdown, category comparison, or top merchant analysis, include an inline chart tag format right inside your response:\n"
        "  [CHART: doughnut | Category Breakdown | Personal Transfers: 50020, Shopping: 9312.78, Fuel: 3577.30, Bills: 1855.00]\n"
        "  Supported chart types: 'doughnut', 'bar', or 'pie'.\n"
        "CRITICAL REQUIREMENT FOR SUGGESTIONS:\n"
        "At the very end of your response, ALWAYS include 2 to 4 follow-up prompt suggestion chips dynamically tailored to the user's actual transactions, specific categories found in their data, top merchants, date ranges, or questions logically stemming from your current answer.\n"
        "Format EACH suggestion on its own line using this exact tag format:\n"
        "[SUGGESTION: Label | Specific Prompt Question tailored to user data]\n"
        f"{db_context}"
    )

    contents.append(f"{system_instruction}\n\nUser Question/Instruction:\n{user_query}")

    response = None
    model_to_use = "gemini-flash-latest"
    last_err = None
    used_key_idx = 0

    # Try each API key in pool — same model, different key on 429
    for key_idx, api_key in enumerate(api_keys):
        key_client = genai.Client(api_key=api_key) if key_idx > 0 else client
        try:
            response = key_client.models.generate_content(model=model_to_use, contents=contents)
            used_key_idx = key_idx
            break
        except Exception as err:
            err_str = str(err)
            is_quota = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()
            print(f"[CHAT FALLBACK] Key#{key_idx + 1} failed ({'RATE LIMIT' if is_quota else 'ERROR'}): {err_str[:120]}")
            last_err = err

    print(f"[CHAT] Responded using Key#{used_key_idx + 1}, Model: {model_to_use}")

    if not response:
        key_count = len(api_keys)
        raise HTTPException(
            status_code=429,
            detail=f"All {key_count} API key(s) and model fallbacks are rate-limited (429). Add more keys to .env or retry later."
        )

    reply_text = response.text or "I parsed your request, but received no text output."

    # Check if response contains transaction JSON block to auto-insert into DB
    if "```json" in reply_text or "```" in reply_text:
        try:
            json_str = reply_text.split("```json")[-1].split("```")[0].strip() if "```json" in reply_text else reply_text.split("```")[-2].strip()
            parsed_txs = json.loads(json_str)
            if isinstance(parsed_txs, list) and len(parsed_txs) > 0:
                with get_db() as conn:
                    for tx in parsed_txs:
                        if isinstance(tx, dict) and "recipient_or_sender" in tx:
                            res = conn.execute(
                                """
                                INSERT OR IGNORE INTO transactions (
                                    user_id, date, recipient_or_sender, particulars_note,
                                    debit_amount, credit_amount, type, category, file_path
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """,
                                (
                                    user_id,
                                    str(tx.get("date", "")),
                                    str(tx.get("recipient_or_sender", "")),
                                    str(tx.get("particulars_note", "")),
                                    float(tx.get("debit_amount", 0.0)),
                                    float(tx.get("credit_amount", 0.0)),
                                    str(tx.get("type", "DEBIT")),
                                    str(tx.get("category", "Others")),
                                    files[0].filename if files and files[0].filename else existing_filename or "chat_upload",
                                ),
                            )
                            if res.rowcount > 0:
                                inserted_count += 1
                    conn.commit()
        except Exception as parse_err:
            print(f"[CHAT JSON AUTO-PARSE WARNING] {parse_err}")

    # Remove raw json block from conversational reply display if wanted, or leave clean formatting
    cleaned_reply = reply_text.split("```json")[0].strip() if "```json" in reply_text else reply_text

    return {
        "reply": cleaned_reply,
        "inserted_count": inserted_count,
        "used_model": model_to_use
    }


@app.post("/api/transactions/clear-all")
def clear_all_transactions(request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE user_id = ?", (user_id,))
        deleted_count = cursor.rowcount
        conn.commit()
    return {"message": "All transaction history cleared successfully", "deleted_count": deleted_count}


@app.get("/api/transactions")
def get_transactions(
    request: Request,
    type_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    account_filter: Optional[str] = None,
    search_query: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    user_id = get_current_user_id(request)
    query = "SELECT id, date, recipient_or_sender, particulars_note, debit_amount, credit_amount, type, category, account_name, file_path FROM transactions WHERE user_id = ?"
    params: List[Any] = [user_id]

    if type_filter and type_filter != "ALL":
        query += " AND type = ?"
        params.append(type_filter)

    if category_filter and category_filter != "ALL":
        query += " AND category = ?"
        params.append(category_filter)

    if account_filter and account_filter != "ALL":
        query += " AND account_name = ?"
        params.append(account_filter)

    if search_query:
        search_term = search_query.strip()
        month_map = {
            "january": "01", "jan": "01", "february": "02", "feb": "02",
            "march": "03", "mar": "03", "april": "04", "apr": "04",
            "may": "05", "june": "06", "jun": "06", "july": "07", "jul": "07",
            "august": "08", "aug": "08", "september": "09", "sep": "09",
            "october": "10", "oct": "10", "november": "11", "nov": "11",
            "december": "12", "dec": "12",
        }
        m_code = month_map.get(search_term.lower())
        if m_code:
            query += " AND (recipient_or_sender LIKE ? OR particulars_note LIKE ? OR date LIKE ? OR category LIKE ? OR account_name LIKE ? OR date LIKE ?)"
            params.extend([f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", f"%-{m_code}-%"])
        else:
            query += " AND (recipient_or_sender LIKE ? OR particulars_note LIKE ? OR date LIKE ? OR category LIKE ? OR account_name LIKE ?)"
            params.extend([f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", f"%{search_query}%", f"%{search_query}%"])

    if start_date:
        query += " AND date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND date <= ?"
        params.append(end_date)

    query += " ORDER BY date DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@app.get("/api/metrics")
def get_metrics(request: Request, account_filter: Optional[str] = None):
    user_id = get_current_user_id(request)
    query = "SELECT date, recipient_or_sender, particulars_note, debit_amount, credit_amount, type, category, account_name FROM transactions WHERE user_id = ?"
    params: List[Any] = [user_id]

    if account_filter and account_filter != "ALL":
        query += " AND account_name = ?"
        params.append(account_filter)

    with get_db() as conn:
        df = pd.read_sql_query(query, conn, params=params)

    if df.empty:
        return {
            "total_credited": 0.0,
            "total_debited": 0.0,
            "net_balance": 0.0,
            "tx_count": 0,
            "accounts": [],
            "categories": [],
            "category_spending": [],
            "top_recipients": [],
            "daily_trends": [],
            "large_transactions": [],
            "monthly_cashflow": [],
            "recurring_transactions": [],
        }

    df["debit_amount"] = pd.to_numeric(df["debit_amount"], errors="coerce").fillna(0.0)
    df["credit_amount"] = pd.to_numeric(df["credit_amount"], errors="coerce").fillna(0.0)

    total_credited = float(df["credit_amount"].sum())
    total_debited = float(df["debit_amount"].sum())
    net_balance = total_credited - total_debited
    tx_count = len(df)

    accounts = sorted(list(df["account_name"].dropna().unique()))
    if "General" not in accounts:
        accounts.append("General")


    large_tx = df[(df["debit_amount"] > 1000) | (df["credit_amount"] > 1000)].to_dict(orient="records")

    debit_df = df[df["type"] == "DEBIT"]
    cat_spending = []
    top_recipients = []
    daily_trends = []
    monthly_cashflow = []
    recurring_tx = []
    categories = sorted(list(df["category"].dropna().unique()))

    # Monthly Cash Flow Aggregation (Credit vs Debit)
    if "date" in df.columns:
        df["month"] = df["date"].astype(str).str.slice(0, 7)
        m_grp = df.groupby("month").agg(
            credited=("credit_amount", "sum"),
            debited=("debit_amount", "sum"),
            tx_count=("type", "count")
        ).reset_index().sort_values(by="month")

        for _, r in m_grp.iterrows():
            c_val = float(r["credited"])
            d_val = float(r["debited"])
            sav = c_val - d_val
            sav_rate = round((sav / c_val * 100.0), 1) if c_val > 0 else (0.0 if d_val == 0 else -100.0)
            monthly_cashflow.append({
                "month": str(r["month"]),
                "credited": c_val,
                "debited": d_val,
                "savings": sav,
                "savings_rate": sav_rate,
                "tx_count": int(r["tx_count"])
            })

    if not debit_df.empty:
        cat_grp = debit_df.groupby("category")["debit_amount"].sum().reset_index()
        cat_spending = cat_grp.to_dict(orient="records")

        top_rec_df = (
            debit_df.groupby(["recipient_or_sender", "category"])
            .agg(debit_amount=("debit_amount", "sum"), count=("debit_amount", "count"))
            .reset_index()
            .sort_values(by="debit_amount", ascending=False)
            .head(10)
        )
        top_recipients = top_rec_df.to_dict(orient="records")

        rec_df = (
            debit_df.groupby(["recipient_or_sender", "category"])
            .agg(
                count=("debit_amount", "count"),
                avg_amount=("debit_amount", "mean"),
                total_spent=("debit_amount", "sum"),
                last_date=("date", "max")
            )
            .reset_index()
        )
        rec_filtered = rec_df[rec_df["count"] >= 2].sort_values(by="total_spent", ascending=False).head(8)
        for _, r in rec_filtered.iterrows():
            recurring_tx.append({
                "recipient_or_sender": str(r["recipient_or_sender"]),
                "category": str(r["category"]),
                "count": int(r["count"]),
                "avg_amount": round(float(r["avg_amount"]), 2),
                "total_spent": round(float(r["total_spent"]), 2),
                "last_date": str(r["last_date"])
            })

        trend_grp = (
            debit_df.groupby("date")["debit_amount"]
            .sum()
            .reset_index()
            .sort_values(by="date")
        )
        daily_trends = trend_grp.to_dict(orient="records")

    return {
        "total_credited": total_credited,
        "total_debited": total_debited,
        "net_balance": net_balance,
        "tx_count": tx_count,
        "accounts": accounts,
        "categories": categories,
        "category_spending": cat_spending,
        "top_recipients": top_recipients,
        "daily_trends": daily_trends,
        "large_transactions": large_tx,
        "monthly_cashflow": monthly_cashflow,
        "recurring_transactions": recurring_tx,
    }


@app.get("/api/budgets")
def get_budgets(request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT category, budget_limit FROM user_budgets WHERE user_id = ?", (user_id,))
        budget_rows = {r["category"]: float(r["budget_limit"]) for r in cursor.fetchall()}

        # Fetch current spending per category
        cursor.execute(
            "SELECT category, SUM(debit_amount) as spent FROM transactions WHERE user_id = ? AND type = 'DEBIT' GROUP BY category",
            (user_id,),
        )
        spent_map = {r["category"]: float(r["spent"] or 0.0) for r in cursor.fetchall()}

        result = {}
        for cat, limit in budget_rows.items():
            spent = spent_map.get(cat, 0.0)
            pct = round((spent / limit * 100.0), 1) if limit > 0 else 0.0
            status_flag = "EXCEEDED" if spent > limit else ("WARNING" if pct >= 80.0 else "OK")
            result[cat] = {
                "budget_limit": limit,
                "spent": spent,
                "percentage": pct,
                "status": status_flag,
            }
        return result


@app.post("/api/budgets")
def set_budget(request: Request, category: str = Form(...), budget_limit: float = Form(...)):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO user_budgets (user_id, category, budget_limit)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, category) DO UPDATE SET budget_limit = ?
            """,
            (user_id, category, budget_limit, budget_limit),
        )
        conn.commit()
    return {"message": f"Budget for {category} set to ₹{budget_limit:.2f}"}


@app.get("/api/export-csv")
def export_csv(request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        df = pd.read_sql_query(
            "SELECT date, recipient_or_sender, particulars_note, debit_amount, credit_amount, type, category, account_name FROM transactions WHERE user_id = ? ORDER BY date DESC",
            conn,
            params=(user_id,),
        )
    csv_data = df.to_csv(index=False)
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=kharach_statement.csv"},
    )


@app.get("/api/export-excel")
def export_excel(
    request: Request,
    type_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    account_filter: Optional[str] = None,
    search_query: Optional[str] = None,
):
    user_id = get_current_user_id(request)
    query = "SELECT date, recipient_or_sender, particulars_note, debit_amount, credit_amount, type, category, account_name FROM transactions WHERE user_id = ?"
    params: List[Any] = [user_id]

    if type_filter and type_filter != "ALL":
        query += " AND type = ?"
        params.append(type_filter)

    if category_filter and category_filter != "ALL":
        query += " AND category = ?"
        params.append(category_filter)

    if account_filter and account_filter != "ALL":
        query += " AND account_name = ?"
        params.append(account_filter)

    if search_query:
        query += " AND (recipient_or_sender LIKE ? OR particulars_note LIKE ?)"
        params.extend([f"%{search_query}%", f"%{search_query}%"])

    query += " ORDER BY date DESC"

    with get_db() as conn:
        df = pd.read_sql_query(query, conn, params=params)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Statement Ledger")
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=kharach_statement.xlsx"},
    )


# --- KHATABOOK / UDHAR LEDGER MODULE ENDPOINTS ---

@app.get("/api/contacts")
def get_contacts(request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT c.id, c.name, c.phone, c.email, c.created_at,
                   COALESCE(SUM(CASE WHEN d.type = 'GAVE' AND d.status = 'PENDING' THEN d.amount ELSE 0 END), 0.0) as total_gave,
                   COALESCE(SUM(CASE WHEN d.type = 'GOT' AND d.status = 'PENDING' THEN d.amount ELSE 0 END), 0.0) as total_got
            FROM contacts c
            LEFT JOIN debts d ON c.id = d.contact_id AND d.user_id = c.user_id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.name ASC
            """,
            (user_id,),
        )
        rows = [dict(r) for r in cursor.fetchall()]

        total_will_get = 0.0
        total_will_give = 0.0
        for r in rows:
            net = r["total_gave"] - r["total_got"]
            r["net_balance"] = net
            if net > 0:
                total_will_get += net
            elif net < 0:
                total_will_give += abs(net)

        return {
            "contacts": rows,
            "total_will_get": round(total_will_get, 2),
            "total_will_give": round(total_will_give, 2),
            "overall_net": round(total_will_get - total_will_give, 2),
        }


@app.post("/api/contacts")
def create_contact(
    request: Request,
    name: str = Form(...),
    phone: str = Form(""),
    email: str = Form(""),
):
    user_id = get_current_user_id(request)
    name_clean = name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Contact name is required")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO contacts (user_id, name, phone, email) VALUES (?, ?, ?, ?)",
            (user_id, name_clean, phone.strip(), email.strip()),
        )
        conn.commit()
        return {"message": "Contact created successfully", "id": cursor.lastrowid}


@app.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: int, request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM contacts WHERE id = ? AND user_id = ?", (contact_id, user_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        conn.commit()
        return {"message": "Contact and associated ledger deleted successfully"}


@app.get("/api/contacts/{contact_id}/debts")
def get_contact_debts(contact_id: int, request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM contacts WHERE id = ? AND user_id = ?", (contact_id, user_id))
        contact = cursor.fetchone()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        cursor.execute(
            """
            SELECT d.*, t.recipient_or_sender as tx_recipient, t.particulars_note as tx_note
            FROM debts d
            LEFT JOIN transactions t ON d.linked_transaction_id = t.id
            WHERE d.contact_id = ? AND d.user_id = ?
            ORDER BY d.date DESC, d.id DESC
            """,
            (contact_id, user_id),
        )
        debts = [dict(r) for r in cursor.fetchall()]

        total_gave = sum(r["amount"] for r in debts if r["type"] == "GAVE" and r["status"] == "PENDING")
        total_got = sum(r["amount"] for r in debts if r["type"] == "GOT" and r["status"] == "PENDING")
        net = total_gave - total_got

        return {
            "contact": dict(contact),
            "debts": debts,
            "total_gave": round(total_gave, 2),
            "total_got": round(total_got, 2),
            "net_balance": round(net, 2),
        }


@app.post("/api/debts")
def add_debt(
    request: Request,
    contact_id: int = Form(...),
    debt_type: str = Form(...),  # GAVE or GOT
    amount: float = Form(...),
    note: str = Form(""),
    date: str = Form(...),
    due_date: str = Form(""),
):
    user_id = get_current_user_id(request)
    if debt_type not in ("GAVE", "GOT"):
        raise HTTPException(status_code=400, detail="Debt type must be 'GAVE' or 'GOT'")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM contacts WHERE id = ? AND user_id = ?", (contact_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Contact not found")

        cursor.execute(
            """
            INSERT INTO debts (user_id, contact_id, type, amount, note, date, due_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
            """,
            (user_id, contact_id, debt_type, amount, note.strip(), date, due_date.strip()),
        )
        conn.commit()
        return {"message": "Debt entry recorded successfully", "id": cursor.lastrowid}


@app.put("/api/debts/{debt_id}/settle")
def settle_debt(
    debt_id: int,
    request: Request,
    status_flag: str = Form("SETTLED"),  # SETTLED or PENDING
):
    user_id = get_current_user_id(request)
    if status_flag not in ("SETTLED", "PENDING"):
        raise HTTPException(status_code=400, detail="Status must be SETTLED or PENDING")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE debts SET status = ? WHERE id = ? AND user_id = ?", (status_flag, debt_id, user_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Debt entry not found")
        conn.commit()
        return {"message": f"Debt marked as {status_flag}"}


@app.delete("/api/debts/{debt_id}")
def delete_debt(debt_id: int, request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM debts WHERE id = ? AND user_id = ?", (debt_id, user_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Debt entry not found")
        conn.commit()
        return {"message": "Debt entry deleted successfully"}


@app.post("/api/debts/reconcile")
def reconcile_transaction(
    request: Request,
    contact_id: int = Form(...),
    transaction_id: int = Form(...),
    debt_type: str = Form("GAVE"),  # GAVE or GOT
):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (transaction_id, user_id))
        tx = cursor.fetchone()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")

        cursor.execute("SELECT id FROM contacts WHERE id = ? AND user_id = ?", (contact_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Contact not found")

        amount = float(tx["debit_amount"]) if tx["debit_amount"] > 0 else float(tx["credit_amount"])
        note = f"Linked Tx: {tx['recipient_or_sender']} - {tx['particulars_note']}"
        date = str(tx["date"] or "")

        cursor.execute(
            """
            INSERT INTO debts (user_id, contact_id, type, amount, note, date, status, linked_transaction_id)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
            """,
            (user_id, contact_id, debt_type, amount, note, date, transaction_id),
        )
        conn.commit()
        return {"message": "Transaction reconciled with contact Udhar ledger"}


# --- GROUP & EVENT EXPENSE SPLITTING (SPLITWISE MODULE) ENDPOINTS ---

def calculate_minimal_debt_settlements(net_balances: Dict[int, float], member_names: Dict[int, str]) -> List[Dict[str, Any]]:
    """Greedy debt minimization algorithm for group expenses."""
    debtors = []   # net < 0
    creditors = [] # net > 0

    for m_id, net in net_balances.items():
        rounded_net = round(net, 2)
        if rounded_net < -0.01:
            debtors.append({"id": m_id, "amount": -rounded_net})
        elif rounded_net > 0.01:
            creditors.append({"id": m_id, "amount": rounded_net})

    # Sort descending by amount
    debtors.sort(key=lambda x: x["amount"], reverse=True)
    creditors.sort(key=lambda x: x["amount"], reverse=True)

    settlements = []
    i, j = 0, 0

    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]

        settle_amt = min(debtor["amount"], creditor["amount"])
        settle_amt_round = round(settle_amt, 2)

        if settle_amt_round > 0:
            settlements.append({
                "from_member_id": debtor["id"],
                "from_name": member_names.get(debtor["id"], f"Member #{debtor['id']}"),
                "to_member_id": creditor["id"],
                "to_name": member_names.get(creditor["id"], f"Member #{creditor['id']}"),
                "amount": settle_amt_round,
            })

        debtor["amount"] -= settle_amt
        creditor["amount"] -= settle_amt

        if round(debtor["amount"], 2) <= 0:
            i += 1
        if round(creditor["amount"], 2) <= 0:
            j += 1

    return settlements


@app.get("/api/groups")
def get_groups(request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT g.id, g.name, g.currency, g.description, g.created_at,
                   COUNT(DISTINCT m.id) as member_count,
                   COALESCE(SUM(DISTINCT e.amount), 0.0) as total_expenses
            FROM groups g
            LEFT JOIN group_members m ON g.id = m.group_id
            LEFT JOIN group_expenses e ON g.id = e.group_id
            WHERE g.user_id = ?
            GROUP BY g.id
            ORDER BY g.created_at DESC
            """,
            (user_id,),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        return {"groups": rows}


@app.post("/api/groups")
def create_group(
    request: Request,
    name: str = Form(...),
    currency: str = Form("INR"),
    description: str = Form(""),
    member_names: str = Form(...), # Comma separated or JSON list
):
    user_id = get_current_user_id(request)
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Group name is required")

    # Parse members
    m_list = []
    if member_names.startswith("["):
        try:
            m_list = json.loads(member_names)
        except Exception:
            m_list = [x.strip() for x in member_names.split(",") if x.strip()]
    else:
        m_list = [x.strip() for x in member_names.split(",") if x.strip()]

    if not m_list:
        raise HTTPException(status_code=400, detail="At least one group member is required")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO groups (user_id, name, currency, description) VALUES (?, ?, ?, ?)",
            (user_id, clean_name, currency.strip() or "INR", description.strip()),
        )
        group_id = cursor.lastrowid

        for m in m_list:
            m_name = m if isinstance(m, str) else m.get("name", "Member")
            cursor.execute(
                "INSERT INTO group_members (group_id, name) VALUES (?, ?)",
                (group_id, m_name.strip()),
            )

        conn.commit()
        return {"message": "Group created successfully", "group_id": group_id}


@app.delete("/api/groups/{group_id}")
def delete_group(group_id: int, request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM groups WHERE id = ? AND user_id = ?", (group_id, user_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Group not found")
        conn.commit()
        return {"message": "Group deleted successfully"}


@app.get("/api/groups/{group_id}")
def get_group_details(group_id: int, request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM groups WHERE id = ? AND user_id = ?", (group_id, user_id))
        group = cursor.fetchone()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        # Members
        cursor.execute("SELECT * FROM group_members WHERE group_id = ? ORDER BY name ASC", (group_id,))
        members = [dict(r) for r in cursor.fetchall()]
        member_names = {m["id"]: m["name"] for m in members}

        # Expenses
        cursor.execute(
            """
            SELECT e.*, m.name as paid_by_name
            FROM group_expenses e
            JOIN group_members m ON e.paid_by_member_id = m.id
            WHERE e.group_id = ?
            ORDER BY e.date DESC, e.id DESC
            """,
            (group_id,),
        )
        expenses = [dict(r) for r in cursor.fetchall()]

        # Fetch splits for each expense
        net_balances = {m["id"]: 0.0 for m in members}
        total_group_spend = 0.0

        for exp in expenses:
            total_group_spend += float(exp["amount"])
            paid_by_id = exp["paid_by_member_id"]
            net_balances[paid_by_id] = net_balances.get(paid_by_id, 0.0) + float(exp["amount"])

            cursor.execute(
                """
                SELECT s.*, m.name as member_name
                FROM group_expense_splits s
                JOIN group_members m ON s.member_id = m.id
                WHERE s.expense_id = ?
                """,
                (exp["id"],),
            )
            splits = [dict(r) for r in cursor.fetchall()]
            exp["splits"] = splits

            for s in splits:
                m_id = s["member_id"]
                s_amt = float(s["split_amount"])
                net_balances[m_id] = net_balances.get(m_id, 0.0) - s_amt

        # Compute minimal settlement graph transfers
        settlements = calculate_minimal_debt_settlements(net_balances, member_names)

        member_summaries = []
        for m in members:
            m_id = m["id"]
            net = round(net_balances.get(m_id, 0.0), 2)
            member_summaries.append({
                "id": m_id,
                "name": m["name"],
                "net_balance": net,
            })

        return {
            "group": dict(group),
            "members": member_summaries,
            "expenses": expenses,
            "total_spend": round(total_group_spend, 2),
            "settlements": settlements,
        }


@app.post("/api/groups/{group_id}/expenses")
def add_group_expense(
    group_id: int,
    request: Request,
    title: str = Form(...),
    amount: float = Form(...),
    paid_by_member_id: int = Form(...),
    category: str = Form("Others"),
    date: str = Form(...),
    splits_json: str = Form(...), # JSON object: {"member_id": split_amount}
):
    user_id = get_current_user_id(request)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Expense amount must be greater than zero")

    try:
        splits_dict = json.loads(splits_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid expense split format")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM groups WHERE id = ? AND user_id = ?", (group_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Group not found")

        cursor.execute(
            """
            INSERT INTO group_expenses (group_id, paid_by_member_id, amount, title, category, date)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (group_id, paid_by_member_id, amount, title.strip(), category, date),
        )
        expense_id = cursor.lastrowid

        for m_id_str, s_amt in splits_dict.items():
            s_amt_val = float(s_amt)
            if s_amt_val > 0:
                cursor.execute(
                    """
                    INSERT INTO group_expense_splits (expense_id, member_id, split_amount)
                    VALUES (?, ?, ?)
                    """,
                    (expense_id, int(m_id_str), s_amt_val),
                )

        conn.commit()
        return {"message": "Group expense added successfully", "expense_id": expense_id}


@app.delete("/api/group-expenses/{expense_id}")
def delete_group_expense(expense_id: int, request: Request):
    user_id = get_current_user_id(request)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            DELETE FROM group_expenses
            WHERE id = ? AND group_id IN (SELECT id FROM groups WHERE user_id = ?)
            """,
            (expense_id, user_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Expense not found")
        conn.commit()
        return {"message": "Group expense deleted successfully"}


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

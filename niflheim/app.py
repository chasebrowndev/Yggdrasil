import sqlite3
import os
import secrets
from flask import Flask, jsonify, g, request, session
from werkzeug.security import check_password_hash
from cryptography.fernet import Fernet

DB_PATH        = os.path.join(os.path.dirname(__file__), "niflheim.db")
SYSTEM_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "yggdrasil.db")

app = Flask(__name__, static_folder=None)

_fernet: Fernet | None = None

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(os.path.abspath(DB_PATH))
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db:
        db.close()

def init_db():
    global _fernet
    db = sqlite3.connect(os.path.abspath(DB_PATH))
    db.execute("""
        CREATE TABLE IF NOT EXISTS credentials (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            title      TEXT NOT NULL,
            username   TEXT,
            password   TEXT,
            url        TEXT,
            notes      TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    row = db.execute("SELECT value FROM settings WHERE key='fernet_key'").fetchone()
    if not row:
        key = Fernet.generate_key()
        db.execute("INSERT INTO settings (key,value) VALUES ('fernet_key',?)", (key.decode(),))
        db.commit()
        _fernet = Fernet(key)
    else:
        _fernet = Fernet(row[0].encode())
    db.close()

def encrypt_pw(plaintext: str) -> str:
    if not plaintext:
        return ""
    return _fernet.encrypt(plaintext.encode()).decode()

def decrypt_pw(token: str) -> str:
    if not token:
        return ""
    try:
        return _fernet.decrypt(token.encode()).decode()
    except Exception:
        return ""

def _row_to_dict(row) -> dict:
    d = dict(row)
    d["password"] = decrypt_pw(d.get("password") or "")
    return d

def get_master_password_hash() -> str:
    db = sqlite3.connect(os.path.abspath(SYSTEM_DB_PATH))
    row = db.execute("SELECT value FROM settings WHERE key='password'").fetchone()
    db.close()
    return row[0] if row else ""

def load_secret() -> str:
    db = sqlite3.connect(os.path.abspath(SYSTEM_DB_PATH))
    row = db.execute("SELECT value FROM settings WHERE key='secret'").fetchone()
    db.close()
    return row[0] if row else secrets.token_hex(32)

def require_auth(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("niflheim_authed"):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route("/api/niflheim/login", methods=["POST"])
def api_login():
    data = request.get_json(force=True) or {}
    stored = get_master_password_hash()
    if stored and check_password_hash(stored, data.get("password", "")):
        session["niflheim_authed"] = True
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": "Incorrect password"}), 401

@app.route("/api/niflheim/logout", methods=["POST"])
def api_logout():
    session.pop("niflheim_authed", None)
    return jsonify({"ok": True})

@app.route("/api/niflheim/status")
def api_status():
    return jsonify({"authed": bool(session.get("niflheim_authed"))})

# ── Credentials CRUD ──────────────────────────────────────────────────────────

@app.route("/api/niflheim/credentials", methods=["GET"])
@require_auth
def api_list():
    rows = get_db().execute(
        "SELECT * FROM credentials ORDER BY title ASC, id ASC"
    ).fetchall()
    return jsonify([_row_to_dict(r) for r in rows])

@app.route("/api/niflheim/credentials", methods=["POST"])
@require_auth
def api_create():
    data = request.get_json(force=True) or {}
    title    = (data.get("title") or "").strip()
    username = (data.get("username") or "").strip()
    password = encrypt_pw(data.get("password") or "")
    url      = (data.get("url") or "").strip()
    notes    = (data.get("notes") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400
    db  = get_db()
    cur = db.execute(
        "INSERT INTO credentials (title,username,password,url,notes) VALUES (?,?,?,?,?)",
        (title, username, password, url, notes)
    )
    db.commit()
    row = db.execute("SELECT * FROM credentials WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(_row_to_dict(row)), 201

@app.route("/api/niflheim/credentials/<int:cid>", methods=["PUT"])
@require_auth
def api_update(cid: int):
    db  = get_db()
    row = db.execute("SELECT * FROM credentials WHERE id=?", (cid,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json(force=True) or {}
    title    = (data.get("title") or row["title"]).strip()
    username = (data.get("username") if "username" in data else row["username"]) or ""
    url      = (data.get("url") if "url" in data else row["url"]) or ""
    notes    = (data.get("notes") if "notes" in data else row["notes"]) or ""
    if "password" in data:
        password = encrypt_pw(data["password"] or "")
    else:
        password = row["password"] or ""
    db.execute(
        "UPDATE credentials SET title=?,username=?,password=?,url=?,notes=? WHERE id=?",
        (title, username, password, url, notes, cid)
    )
    db.commit()
    updated = db.execute("SELECT * FROM credentials WHERE id=?", (cid,)).fetchone()
    return jsonify(_row_to_dict(updated))

@app.route("/api/niflheim/credentials/<int:cid>", methods=["DELETE"])
@require_auth
def api_delete(cid: int):
    db = get_db()
    if not db.execute("SELECT 1 FROM credentials WHERE id=?", (cid,)).fetchone():
        return jsonify({"error": "Not found"}), 404
    db.execute("DELETE FROM credentials WHERE id=?", (cid,))
    db.commit()
    return jsonify({"ok": True})

if __name__ == "__main__":
    init_db()
    app.secret_key = load_secret()
    app.run(host="0.0.0.0", port=5005, debug=False)

import sqlite3
import os
import secrets
from flask import Flask, jsonify, g, request, session
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH     = os.path.join(os.path.dirname(__file__), "..", "yggdrasil.db")
IMG_DIR     = os.path.join(os.path.dirname(__file__), "..", "midgard", "static", "img")
ALLOWED_EXT = {"png", "jpg", "jpeg", "gif", "webp", "svg"}

app = Flask(__name__,
    static_folder="static",
    static_url_path="/asgard/static")

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
    db = sqlite3.connect(os.path.abspath(DB_PATH))
    db.execute("""
        CREATE TABLE IF NOT EXISTS realms (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            description TEXT NOT NULL,
            route       TEXT NOT NULL,
            image_path  TEXT,
            sort_order  INTEGER DEFAULT 0
        )
    """)
    try:
        db.execute("ALTER TABLE realms ADD COLUMN visible INTEGER NOT NULL DEFAULT 1")
        db.execute("UPDATE realms SET visible=1 WHERE visible IS NULL")
    except Exception:
        pass
    # Normalize core realms — fix names, descriptions, routes and add any missing ones.
    # Keyed by canonical route; sort_order reflects intended sidebar position.
    core_realms = [
        ("Vanaheim",     "Library", "/vanaheim",     1),
        ("Svartalfheim", "Files",   "/svartalfheim", 2),
        ("Bifrost",      "Network", "/bifrost",      3),
        ("Niflheim",     "Vault",   "/niflheim",     4),
        ("Asgard",       "Admin",   "/asgard",       5),
    ]
    # Rename the old misspelled route if present
    db.execute("UPDATE realms SET route='/svartalfheim' WHERE route='/svartalheim'")
    for (name, desc, route, order) in core_realms:
        row = db.execute("SELECT id FROM realms WHERE route=?", (route,)).fetchone()
        if row:
            db.execute(
                "UPDATE realms SET name=?, description=?, sort_order=? WHERE id=?",
                (name, desc, order, row[0])
            )
        else:
            db.execute(
                "INSERT INTO realms (name,description,route,image_path,sort_order,visible) VALUES (?,?,?,NULL,?,1)",
                (name, desc, route, order)
            )
    db.commit()
    db.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    row = db.execute("SELECT value FROM settings WHERE key='password'").fetchone()
    if not row:
        db.execute("INSERT INTO settings (key,value) VALUES ('password',?)",
                   (generate_password_hash("admin"),))
    elif not row[0].startswith(("pbkdf2:", "scrypt:", "argon2:")):
        # migrate plaintext → hash
        db.execute("UPDATE settings SET value=? WHERE key='password'",
                   (generate_password_hash(row[0]),))
    if not db.execute("SELECT 1 FROM settings WHERE key='secret'").fetchone():
        db.execute("INSERT INTO settings (key,value) VALUES ('secret',?)",
                   (secrets.token_hex(32),))
    db.commit()
    db.close()

def load_secret():
    db = sqlite3.connect(os.path.abspath(DB_PATH))
    row = db.execute("SELECT value FROM settings WHERE key='secret'").fetchone()
    db.close()
    return row[0] if row else secrets.token_hex(32)

def allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT

def get_setting(key: str):
    row = get_db().execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row[0] if row else None

def set_setting(key: str, value: str):
    get_db().execute(
        "INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value)
    )
    get_db().commit()

def require_auth(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("authed"):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# ── Auth ─────────────────────────────────────────────────────────────────────

@app.route("/api/asgard/login", methods=["POST"])
def api_login():
    data = request.get_json(force=True) or {}
    stored = get_setting("password") or ""
    if check_password_hash(stored, data.get("password", "")):
        session["authed"] = True
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": "Incorrect password"}), 401

@app.route("/api/asgard/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"ok": True})

@app.route("/api/asgard/status")
def api_status():
    return jsonify({"authed": bool(session.get("authed"))})

# ── Realms CRUD ───────────────────────────────────────────────────────────────

@app.route("/api/asgard/realms", methods=["GET"])
@require_auth
def api_realms():
    rows = get_db().execute(
        "SELECT * FROM realms ORDER BY sort_order ASC, id ASC"
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/asgard/realms", methods=["POST"])
@require_auth
def api_realm_create():
    name  = request.form.get("name", "").strip()
    desc  = request.form.get("description", "").strip()
    route = request.form.get("route", "").strip()
    order = int(request.form.get("sort_order") or 0)
    img_path = None

    f = request.files.get("image")
    if f and f.filename and allowed(f.filename):
        os.makedirs(IMG_DIR, exist_ok=True)
        fname = secure_filename(f.filename)
        f.save(os.path.join(IMG_DIR, fname))
        img_path = f"/midgard/static/img/{fname}"

    db = get_db()
    cur = db.execute(
        "INSERT INTO realms (name,description,route,image_path,sort_order) VALUES (?,?,?,?,?)",
        (name, desc, route, img_path, order)
    )
    db.commit()
    row = db.execute("SELECT * FROM realms WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201

@app.route("/api/asgard/realms/<int:rid>", methods=["PUT"])
@require_auth
def api_realm_update(rid: int):
    db    = get_db()
    realm = db.execute("SELECT * FROM realms WHERE id=?", (rid,)).fetchone()
    if not realm:
        return jsonify({"error": "Not found"}), 404

    name      = request.form.get("name", realm["name"]).strip()
    desc      = request.form.get("description", realm["description"]).strip()
    route     = request.form.get("route", realm["route"]).strip()
    order     = int(request.form.get("sort_order") or realm["sort_order"])
    img_path  = realm["image_path"]

    f = request.files.get("image")
    if f and f.filename and allowed(f.filename):
        os.makedirs(IMG_DIR, exist_ok=True)
        fname = secure_filename(f.filename)
        f.save(os.path.join(IMG_DIR, fname))
        img_path = f"/midgard/static/img/{fname}"

    db.execute(
        "UPDATE realms SET name=?,description=?,route=?,image_path=?,sort_order=? WHERE id=?",
        (name, desc, route, img_path, order, rid)
    )
    db.commit()
    row = db.execute("SELECT * FROM realms WHERE id=?", (rid,)).fetchone()
    return jsonify(dict(row))

@app.route("/api/asgard/realms/reorder", methods=["PUT"])
@require_auth
def api_realm_reorder():
    data = request.get_json(force=True) or {}
    order = data.get("order", [])  # list of ids in new display order
    db = get_db()
    for i, rid in enumerate(order):
        db.execute("UPDATE realms SET sort_order=? WHERE id=?", (i + 1, rid))
    db.commit()
    return jsonify({"ok": True})

@app.route("/api/asgard/realms/<int:rid>/toggle", methods=["POST"])
@require_auth
def api_realm_toggle(rid: int):
    db = get_db()
    realm = db.execute("SELECT * FROM realms WHERE id=?", (rid,)).fetchone()
    if not realm:
        return jsonify({"error": "Not found"}), 404
    current = realm["visible"] if realm["visible"] is not None else 1
    db.execute("UPDATE realms SET visible=? WHERE id=?", (0 if current else 1, rid))
    db.commit()
    row = db.execute("SELECT * FROM realms WHERE id=?", (rid,)).fetchone()
    return jsonify(dict(row))

@app.route("/api/asgard/realms/<int:rid>", methods=["DELETE"])
@require_auth
def api_realm_delete(rid: int):
    db = get_db()
    if not db.execute("SELECT 1 FROM realms WHERE id=?", (rid,)).fetchone():
        return jsonify({"error": "Not found"}), 404
    db.execute("DELETE FROM realms WHERE id=?", (rid,))
    db.commit()
    return jsonify({"ok": True})

# ── Settings ──────────────────────────────────────────────────────────────────

@app.route("/api/asgard/settings/password", methods=["POST"])
@require_auth
def api_change_password():
    data    = request.get_json(force=True) or {}
    current = data.get("current_password", "")
    new_pw  = data.get("new_password", "")
    confirm = data.get("confirm_password", "")

    stored = get_setting("password") or ""
    if not check_password_hash(stored, current):
        return jsonify({"ok": False, "error": "Current password is incorrect."})
    if not new_pw:
        return jsonify({"ok": False, "error": "New password cannot be empty."})
    if new_pw != confirm:
        return jsonify({"ok": False, "error": "Passwords do not match."})

    set_setting("password", generate_password_hash(new_pw))
    return jsonify({"ok": True})

if __name__ == "__main__":
    init_db()
    os.makedirs(IMG_DIR, exist_ok=True)
    app.secret_key = load_secret()
    app.run(host="0.0.0.0", port=5001, debug=False)

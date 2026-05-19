import sqlite3
import os
import secrets
from flask import (Flask, render_template, g, request, redirect,
                   url_for, session, flash)
from werkzeug.utils import secure_filename

DB_PATH     = os.path.join(os.path.dirname(__file__), "..", "yggdrasil.db")
IMG_DIR     = os.path.join(os.path.dirname(__file__), "..", "static", "img")
ALLOWED_EXT = {"png", "jpg", "jpeg", "gif", "webp", "svg"}

app = Flask(__name__, template_folder="templates", static_folder="static", static_url_path="/asgard/static")

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
    db.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    if not db.execute("SELECT 1 FROM settings WHERE key='password'").fetchone():
        db.execute("INSERT INTO settings (key,value) VALUES ('password','admin')")
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

def allowed(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT

def get_setting(key):
    row = get_db().execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row[0] if row else None

def set_setting(key, value):
    get_db().execute(
        "INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value)
    )
    get_db().commit()

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("authed"):
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

@app.route("/asgard/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        pw = get_setting("password")
        if request.form.get("password") == pw:
            session["authed"] = True
            return redirect(url_for("index"))
        error = "Incorrect password."
    return render_template("login.html", error=error)

@app.route("/asgard/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/asgard")
@app.route("/asgard/")
@login_required
def index():
    realms = get_db().execute(
        "SELECT * FROM realms ORDER BY sort_order ASC, id ASC"
    ).fetchall()
    return render_template("index.html", realms=realms)

@app.route("/asgard/realm/new", methods=["GET", "POST"])
@login_required
def realm_new():
    if request.method == "POST":
        name    = request.form["name"].strip()
        desc    = request.form["description"].strip()
        route   = request.form["route"].strip()
        order   = int(request.form.get("sort_order") or 0)
        img_path = None

        f = request.files.get("image")
        if f and f.filename and allowed(f.filename):
            os.makedirs(IMG_DIR, exist_ok=True)
            fname = secure_filename(f.filename)
            f.save(os.path.join(IMG_DIR, fname))
            img_path = f"/static/img/{fname}"

        get_db().execute(
            "INSERT INTO realms (name,description,route,image_path,sort_order) VALUES (?,?,?,?,?)",
            (name, desc, route, img_path, order)
        )
        get_db().commit()
        flash("Realm created.")
        return redirect(url_for("index"))
    return render_template("realm_form.html", realm=None, action="Create")

@app.route("/asgard/realm/<int:rid>/edit", methods=["GET", "POST"])
@login_required
def realm_edit(rid):
    db = get_db()
    realm = db.execute("SELECT * FROM realms WHERE id=?", (rid,)).fetchone()
    if not realm:
        return redirect(url_for("index"))

    if request.method == "POST":
        name  = request.form["name"].strip()
        desc  = request.form["description"].strip()
        route = request.form["route"].strip()
        order = int(request.form.get("sort_order") or 0)
        img_path = realm["image_path"]

        f = request.files.get("image")
        if f and f.filename and allowed(f.filename):
            os.makedirs(IMG_DIR, exist_ok=True)
            fname = secure_filename(f.filename)
            f.save(os.path.join(IMG_DIR, fname))
            img_path = f"/static/img/{fname}"

        db.execute(
            "UPDATE realms SET name=?,description=?,route=?,image_path=?,sort_order=? WHERE id=?",
            (name, desc, route, img_path, order, rid)
        )
        db.commit()
        flash("Realm updated.")
        return redirect(url_for("index"))
    return render_template("realm_form.html", realm=realm, action="Update")

@app.route("/asgard/realm/<int:rid>/delete", methods=["POST"])
@login_required
def realm_delete(rid):
    get_db().execute("DELETE FROM realms WHERE id=?", (rid,))
    get_db().commit()
    flash("Realm deleted.")
    return redirect(url_for("index"))

@app.route("/asgard/settings", methods=["GET", "POST"])
@login_required
def settings():
    error = None
    success = None
    if request.method == "POST":
        current = request.form.get("current_password", "")
        new_pw  = request.form.get("new_password", "")
        confirm = request.form.get("confirm_password", "")
        if current != get_setting("password"):
            error = "Current password is incorrect."
        elif not new_pw:
            error = "New password cannot be empty."
        elif new_pw != confirm:
            error = "Passwords do not match."
        else:
            set_setting("password", new_pw)
            success = "Password updated."
    return render_template("settings.html", error=error, success=success)

if __name__ == "__main__":
    init_db()
    os.makedirs(IMG_DIR, exist_ok=True)
    app.secret_key = load_secret()
    app.run(host="0.0.0.0", port=5001, debug=False)

import sqlite3
import os
import markdown as md
from flask import Flask, jsonify, g, request
from werkzeug.utils import secure_filename

DB_PATH     = os.path.join(os.path.dirname(__file__), "vanaheim.db")
IMG_DIR     = os.path.join(os.path.dirname(__file__), "static", "img")
ALLOWED_EXT = {"png", "jpg", "jpeg", "gif", "webp", "svg"}

app = Flask(__name__,
    static_folder="static",
    static_url_path="/vanaheim/static")

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

TEMPLATE_RECIPE = """\
## Ingredients

- 500g bread flour
- 375g water (75% hydration)
- 100g active sourdough starter
- 10g salt

## Instructions

1. **Autolyse** — Mix flour and 350g water. Rest 30–60 minutes.
2. **Add starter and salt** — Add starter and remaining 25g water, mix until incorporated, then add salt.
3. **Bulk fermentation** — 4–5 hours at room temperature. Perform 4 sets of stretch-and-fold in the first 2 hours.
4. **Shape** — Turn onto a lightly floured surface. Pre-shape, bench rest 20 minutes, then final shape into a boule or batard.
5. **Cold proof** — Place in a floured banneton, cover, and refrigerate 10–16 hours.
6. **Bake** — Preheat oven with Dutch oven inside to 500°F (260°C). Score the loaf, bake covered 20 min, then uncovered 20–25 min until deep brown.

## Notes

- Starter should be at peak — doubled in size, domed, and bubbly.
- Higher hydration yields a more open crumb but is harder to handle.
- Score at a shallow 45° angle for maximum ear development.
"""

def init_db():
    db = sqlite3.connect(os.path.abspath(DB_PATH))
    db.execute("""
        CREATE TABLE IF NOT EXISTS entries (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            category    TEXT NOT NULL DEFAULT 'recipe',
            description TEXT,
            image_path  TEXT,
            body        TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        )
    """)
    if db.execute("SELECT COUNT(*) FROM entries").fetchone()[0] == 0:
        db.execute(
            "INSERT INTO entries (title, category, description, body) VALUES (?,?,?,?)",
            (
                "Sourdough Bread",
                "recipe",
                "A classic sourdough with a crispy crust and open crumb. Takes time but rewards patience.",
                TEMPLATE_RECIPE,
            )
        )
    db.commit()
    db.close()

def allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT

# ── API ───────────────────────────────────────────────────────────────────────

@app.route("/api/vanaheim/entries", methods=["GET"])
def api_entries():
    rows = get_db().execute(
        "SELECT * FROM entries ORDER BY created_at DESC"
    ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/vanaheim/entries/<int:eid>", methods=["GET"])
def api_entry(eid: int):
    row = get_db().execute("SELECT * FROM entries WHERE id=?", (eid,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    data = dict(row)
    data["body_html"] = md.markdown(data.get("body") or "", extensions=["extra"])
    return jsonify(data)

@app.route("/api/vanaheim/entries", methods=["POST"])
def api_entry_create():
    title    = request.form.get("title", "").strip()
    category = request.form.get("category", "recipe")
    desc     = request.form.get("description", "").strip()
    body     = request.form.get("body", "")
    img_path = None

    f = request.files.get("image")
    if f and f.filename and allowed(f.filename):
        os.makedirs(IMG_DIR, exist_ok=True)
        fname = secure_filename(f.filename)
        f.save(os.path.join(IMG_DIR, fname))
        img_path = f"/vanaheim/static/img/{fname}"

    db  = get_db()
    cur = db.execute(
        "INSERT INTO entries (title,category,description,image_path,body) VALUES (?,?,?,?,?)",
        (title, category, desc, img_path, body)
    )
    db.commit()
    row = db.execute("SELECT * FROM entries WHERE id=?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(row)), 201

@app.route("/api/vanaheim/entries/<int:eid>", methods=["PUT"])
def api_entry_update(eid: int):
    db  = get_db()
    row = db.execute("SELECT * FROM entries WHERE id=?", (eid,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404

    title    = request.form.get("title", row["title"]).strip()
    category = request.form.get("category", row["category"])
    desc     = request.form.get("description", row["description"] or "").strip()
    body     = request.form.get("body", row["body"] or "")
    img_path = row["image_path"]

    f = request.files.get("image")
    if f and f.filename and allowed(f.filename):
        os.makedirs(IMG_DIR, exist_ok=True)
        fname = secure_filename(f.filename)
        f.save(os.path.join(IMG_DIR, fname))
        img_path = f"/vanaheim/static/img/{fname}"

    db.execute(
        "UPDATE entries SET title=?,category=?,description=?,image_path=?,body=? WHERE id=?",
        (title, category, desc, img_path, body, eid)
    )
    db.commit()
    updated = db.execute("SELECT * FROM entries WHERE id=?", (eid,)).fetchone()
    return jsonify(dict(updated))

@app.route("/api/vanaheim/entries/<int:eid>", methods=["DELETE"])
def api_entry_delete(eid: int):
    db = get_db()
    if not db.execute("SELECT 1 FROM entries WHERE id=?", (eid,)).fetchone():
        return jsonify({"error": "Not found"}), 404
    db.execute("DELETE FROM entries WHERE id=?", (eid,))
    db.commit()
    return jsonify({"ok": True})

if __name__ == "__main__":
    init_db()
    os.makedirs(IMG_DIR, exist_ok=True)
    app.run(host="0.0.0.0", port=5003, debug=False)

import sqlite3
import os
from flask import Flask, jsonify, g

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "yggdrasil.db")

app = Flask(__name__,
    static_folder="static",
    static_url_path="/midgard/static")

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db:
        db.close()

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("""
        CREATE TABLE IF NOT EXISTS realms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            route TEXT NOT NULL,
            image_path TEXT,
            sort_order INTEGER DEFAULT 0
        )
    """)
    if db.execute("SELECT COUNT(*) FROM realms").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO realms (name, description, route, image_path, sort_order) VALUES (?,?,?,?,?)",
            [
                ("Vanaheim",     "Library", "/vanaheim",     None, 1),
                ("Svartalfheim", "Files",   "/svartalfheim", None, 2),
                ("Bifrost",      "Network", "/bifrost",      None, 3),
                ("Niflheim",     "Vault",   "/niflheim",     None, 4),
                ("Asgard",       "Admin",   "/asgard",       None, 5),
            ]
        )
    db.commit()
    db.close()

@app.route("/api/realms")
def api_realms():
    rows = get_db().execute(
        "SELECT * FROM realms WHERE (visible IS NULL OR visible = 1) ORDER BY sort_order ASC, id ASC"
    ).fetchall()
    return jsonify([dict(r) for r in rows])

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=False)

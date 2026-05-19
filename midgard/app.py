import sqlite3
import os
from flask import Flask, render_template, g

DB_PATH = os.path.join(os.path.dirname(__file__), "yggdrasil.db")

app = Flask(__name__, 
    template_folder="templates",
    static_folder="static")

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
                ("Svartalheim", "File services", "/svartalheim", None, 1),
                ("Asgard",     "System administration", "/asgard", None, 2),
            ]
        )
    db.commit()
    db.close()

@app.route("/midgard")
def midgard():
    realms = get_db().execute(
        "SELECT * FROM realms ORDER BY sort_order ASC, id ASC"
    ).fetchall()
    return render_template("midgard.html", realms=realms)

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=False)

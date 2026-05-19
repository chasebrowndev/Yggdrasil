# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Yggdrasil is a self-hosted intranet hub accessible only over Tailscale. It consists of several Flask services fronted by Caddy at `yggdrasil.home.arpa`.

## Running the services

```bash
# Use servetree.sh to start everything at once (recommended):
./servetree.sh   # starts all Flask services + Vite dev server + Caddy

# Or individually, each in its own terminal, from the repo root:
python midgard/app.py      # port 5000
python asgard/app.py       # port 5001
python vanaheim/app.py     # port 5003
python svartalfheim/app.py # port 5002
python bifrost/app.py      # port 5004
python niflheim/app.py     # port 5005

# Caddy (routes by API path prefix to the Flask services)
sudo caddy run --config Caddyfile
```

Dependencies: `pip install flask markdown cryptography`

## Architecture

**Midgard** (port 5000) is the read-only homepage. It queries `realms` and renders cards. No auth.

**Asgard** (port 5001) is the password-protected admin panel. It provides full CRUD for realm cards and a password-change UI. Session secret is generated on first run and persisted in the DB.

**Vanaheim** (port 5003) is the recipe and guide library. It has its own `vanaheim/vanaheim.db` (separate from the shared system DB). Entries have a title, category (recipe/guide), description, optional image, and a Markdown body rendered server-side with the `markdown` library (`extra` extension). Full CRUD with no auth (Tailscale-only). Images stored in `vanaheim/static/img/` and referenced as `/vanaheim/static/img/<filename>`.

**Niflheim** (port 5005) is the password vault. It has its own `niflheim/niflheim.db`. Auth uses the same master password as Asgard (checked against the hash in `yggdrasil.db`). Vault entry passwords are Fernet-encrypted at rest; the key is auto-generated on first run and stored in `niflheim/niflheim.db` `settings` table. The API decrypts on read so the frontend can display/copy them.

**Svartalfheim** (port 5002) is the file server / upload manager.

**Bifrost** (port 5004) is the Tailscale network viewer (peers, ping, status).

**Shared database**: Midgard, Asgard, and Niflheim all open `yggdrasil.db` at the repo root. Asgard manages the schema (`init_db` creates tables and seeds default credentials on first run). Midgard and Niflheim are read-only consumers of the shared settings.

**Caddy** routes API requests by path prefix: `/api/realms*` → 5000, `/api/asgard*` → 5001, `/api/svartalfheim*` → 5002, `/api/vanaheim*` → 5003, `/api/bifrost*` → 5004, `/api/niflheim*` → 5005. All other requests (the React SPA) go to Vite at 5173. Static asset paths: `/midgard/static/*` → 5000, `/vanaheim/static/*` → 5003.

## Database schemas

`yggdrasil.db` (shared, repo root) — used by Midgard, Asgard, and Niflheim:
```
realms(id, name, description, route, image_path, sort_order)
settings(key, value)   -- 'password' (scrypt hash via Werkzeug), 'secret' (Flask session key)
```

`vanaheim/vanaheim.db` — used only by Vanaheim:
```
entries(id, title, category, description, image_path, body, created_at)
```

`niflheim/niflheim.db` — used only by Niflheim:
```
credentials(id, title, username, password, url, notes, created_at)  -- password is Fernet-encrypted
settings(key, value)   -- 'fernet_key' (base64 Fernet key)
```

## Known issues / constraints

- Admin password is scrypt-hashed (Werkzeug) in `settings`. Default is `admin` (hashed on first run; existing plaintext is auto-migrated on next startup). Niflheim uses the same master password — both read the hash from `yggdrasil.db`.
- Asgard and Niflheim share the same Flask `secret_key` (from `yggdrasil.db` `settings.secret`), so they share the same signed session cookie on the same domain. They use separate session keys (`authed` vs `niflheim_authed`) so they don't conflict.
- No CSRF protection on POST routes.
- Asgard mounts its static files at `/asgard/static/`, but image paths in the DB are `/static/img/...` — images 404 in Asgard's own UI (they render fine in Midgard when served through Caddy).

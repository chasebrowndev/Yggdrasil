# Yggdrasil

Self-hosted intranet hub. Tailscale-only access.

## Structure

```
yggdrasil/
├── Caddyfile
├── midgard/        # Homepage — port 5000
│   ├── app.py
│   ├── yggdrasil.db  (auto-created on first run)
│   ├── templates/
│   │   └── midgard.html
│   └── static/
│       ├── midgard.css
│       └── img/    (realm images go here)
```

## Setup

Install dependencies:
```bash
pip install flask
```

Run Midgard:
```bash
cd midgard
python app.py
```

The DB initializes automatically on first run with Svartalheim and Asgard as seed realms.

## Caddy

Place Caddyfile at `/etc/caddy/Caddyfile` or reference it directly:
```bash
caddy run --config /path/to/Caddyfile
```

## DNS

On your Pi5 (or router), add a local DNS entry:
```
yggdrasil.home.arpa -> <pi5 tailscale IP>
```

If using NetworkManager dnsmasq-shared, add a drop-in:
```
# /etc/NetworkManager/dnsmasq-shared.d/yggdrasil.conf
address=/yggdrasil.home.arpa/<pi5 tailscale IP>
```

## Adding realms

Cards are stored in `midgard/yggdrasil.db`, table `realms`.
Asgard will manage these via UI once built.
For now, add manually:
```bash
sqlite3 midgard/yggdrasil.db \
  "INSERT INTO realms (name, description, route, image_path, sort_order) \
   VALUES ('Helheim', 'Monitoring', '/helheim', NULL, 3);"
```

Image paths: place images in `static/img/` and set `image_path` to `/static/img/filename.png`.

## Ports

| Realm       | Port |
|-------------|------|
| Midgard     | 5000 |
| Asgard      | 5001 |
| Svartalheim | 5002 |

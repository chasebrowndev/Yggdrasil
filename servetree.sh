#!/bin/bash
cd ~/dev/Projects/Yggdrasil
python midgard/app.py &
python asgard/app.py &
sudo caddy run --config Caddyfile

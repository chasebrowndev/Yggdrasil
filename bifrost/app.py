import json
import shutil
import subprocess
from flask import Flask, jsonify

app = Flask(__name__)

def tailscale(*args, timeout=8):
    ts = shutil.which('tailscale') or 'tailscale'
    return subprocess.run([ts, *args], capture_output=True, text=True, timeout=timeout)

@app.route('/api/bifrost/status')
def status():
    try:
        r = tailscale('status', '--json')
        if r.returncode != 0:
            return jsonify({'error': r.stderr.strip() or 'tailscale command failed'}), 500
        return jsonify(json.loads(r.stdout))
    except FileNotFoundError:
        return jsonify({'error': 'tailscale not installed'}), 503
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'tailscale timed out'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bifrost/ping/<ip>')
def ping(ip):
    try:
        r = tailscale('ping', '--c', '1', '--timeout', '5s', ip, timeout=10)
        output = (r.stdout + r.stderr).strip()
        return jsonify({'output': output, 'ok': r.returncode == 0})
    except subprocess.TimeoutExpired:
        return jsonify({'output': 'timed out', 'ok': False})
    except Exception as e:
        return jsonify({'output': str(e), 'ok': False})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004, debug=False)

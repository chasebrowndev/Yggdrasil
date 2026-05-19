import os
import mimetypes
from datetime import datetime
from flask import Flask, jsonify, request, send_file, abort
from werkzeug.utils import secure_filename

FILES_DIR = os.path.join(os.path.dirname(__file__), 'files')

app = Flask(__name__)

@app.route('/api/svartalfheim/files', methods=['GET'])
def list_files():
    os.makedirs(FILES_DIR, exist_ok=True)
    files = []
    for name in sorted(os.listdir(FILES_DIR)):
        path = os.path.join(FILES_DIR, name)
        if os.path.isfile(path):
            stat = os.stat(path)
            mime, _ = mimetypes.guess_type(name)
            files.append({
                'name': name,
                'size': stat.st_size,
                'uploaded_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'mime_type': mime or 'application/octet-stream',
            })
    return jsonify(files)

@app.route('/api/svartalfheim/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'Empty filename'}), 400

    os.makedirs(FILES_DIR, exist_ok=True)
    name = secure_filename(f.filename)
    base, ext = os.path.splitext(name)
    counter = 1
    dest = os.path.join(FILES_DIR, name)
    while os.path.exists(dest):
        name = f'{base}_{counter}{ext}'
        dest = os.path.join(FILES_DIR, name)
        counter += 1

    f.save(dest)
    stat = os.stat(dest)
    mime, _ = mimetypes.guess_type(name)
    return jsonify({
        'name': name,
        'size': stat.st_size,
        'uploaded_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
        'mime_type': mime or 'application/octet-stream',
    }), 201

@app.route('/api/svartalfheim/files/<filename>', methods=['GET'])
def download(filename):
    safe = secure_filename(filename)
    path = os.path.abspath(os.path.join(FILES_DIR, safe))
    if not os.path.isfile(path):
        abort(404)
    return send_file(path, as_attachment=True, download_name=safe)

@app.route('/api/svartalfheim/files/<filename>', methods=['DELETE'])
def delete_file(filename):
    safe = secure_filename(filename)
    path = os.path.abspath(os.path.join(FILES_DIR, safe))
    if not os.path.isfile(path):
        return jsonify({'error': 'Not found'}), 404
    os.remove(path)
    return jsonify({'ok': True})

if __name__ == '__main__':
    os.makedirs(FILES_DIR, exist_ok=True)
    app.run(host='0.0.0.0', port=5002, debug=False)

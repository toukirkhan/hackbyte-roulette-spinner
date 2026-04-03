import os
import uuid
import json
import csv
import random
import io
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_file
from PIL import Image

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload

UPLOAD_FOLDER = os.path.join('static', 'uploads')
RESULTS_FILE = os.path.join('results', 'winners.json')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'}
THUMBNAIL_SIZE = (300, 300)

# In-memory participant store: {id: {id, name, image_path, active}}
participants = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_thumbnail(file_stream, filename):
    """Save uploaded image as a resized thumbnail."""
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    ext = filename.rsplit('.', 1)[1].lower()
    if ext == 'gif':
        # Keep GIFs as-is (no PIL resize to preserve animation)
        unique_name = f"{uuid.uuid4().hex}.gif"
        save_path = os.path.join(UPLOAD_FOLDER, unique_name)
        file_stream.save(save_path)
    else:
        img = Image.open(file_stream)
        img = img.convert('RGB')
        img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
        unique_name = f"{uuid.uuid4().hex}.jpg"
        save_path = os.path.join(UPLOAD_FOLDER, unique_name)
        img.save(save_path, 'JPEG', quality=85)
    return unique_name


def load_results():
    if not os.path.exists(RESULTS_FILE):
        return []
    try:
        with open(RESULTS_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_results(results):
    os.makedirs(os.path.dirname(RESULTS_FILE), exist_ok=True)
    with open(RESULTS_FILE, 'w') as f:
        json.dump(results, f, indent=2)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400

    files = request.files.getlist('files')
    added = []

    for file in files:
        if file.filename == '':
            continue
        if not allowed_file(file.filename):
            continue

        # Derive name from filename (strip extension)
        original_name = os.path.splitext(file.filename)[0]
        # Replace underscores/hyphens with spaces, title-case
        display_name = original_name.replace('_', ' ').replace('-', ' ').title()

        try:
            unique_name = save_thumbnail(file, file.filename)
        except Exception:
            return jsonify({'error': 'Failed to process image. Please check the file and try again.'}), 500

        participant_id = uuid.uuid4().hex
        participant = {
            'id': participant_id,
            'name': display_name,
            'image_path': f'static/uploads/{unique_name}',
            'active': True
        }
        participants[participant_id] = participant
        added.append(participant)

    return jsonify({'added': added, 'total': len(participants)})


@app.route('/participants', methods=['GET'])
def get_participants():
    return jsonify(list(participants.values()))


@app.route('/spin', methods=['POST'])
def spin():
    active = [p for p in participants.values() if p['active']]
    if len(active) < 2:
        return jsonify({'error': 'Need at least 2 active participants'}), 400

    winner = random.choice(active)

    # Save to results log
    results = load_results()
    results.append({
        'id': winner['id'],
        'name': winner['name'],
        'image_path': winner['image_path'],
        'timestamp': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    })
    save_results(results)

    return jsonify({'winner': winner})


@app.route('/toggle/<participant_id>', methods=['POST'])
def toggle(participant_id):
    if participant_id not in participants:
        return jsonify({'error': 'Participant not found'}), 404
    participants[participant_id]['active'] = not participants[participant_id]['active']
    return jsonify(participants[participant_id])


@app.route('/participant/<participant_id>', methods=['DELETE'])
def delete_participant(participant_id):
    if participant_id not in participants:
        return jsonify({'error': 'Participant not found'}), 404

    participant = participants.pop(participant_id)

    # Remove image file
    image_path = participant.get('image_path', '')
    if image_path and os.path.exists(image_path):
        try:
            os.remove(image_path)
        except OSError:
            pass

    return jsonify({'success': True, 'removed': participant})


@app.route('/participant/<participant_id>/rename', methods=['POST'])
def rename_participant(participant_id):
    if participant_id not in participants:
        return jsonify({'error': 'Participant not found'}), 404
    data = request.get_json()
    new_name = (data or {}).get('name', '').strip()
    if not new_name:
        return jsonify({'error': 'Name cannot be empty'}), 400
    participants[participant_id]['name'] = new_name
    return jsonify(participants[participant_id])


@app.route('/results', methods=['GET'])
def get_results():
    return jsonify(load_results())


@app.route('/clear-results', methods=['POST'])
def clear_results():
    save_results([])
    return jsonify({'success': True})


@app.route('/export-results', methods=['GET'])
def export_results():
    results = load_results()
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=['name', 'timestamp', 'image_path'])
    writer.writeheader()
    for row in results:
        writer.writerow({
            'name': row.get('name', ''),
            'timestamp': row.get('timestamp', ''),
            'image_path': row.get('image_path', '')
        })
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='winners.csv'
    )


if __name__ == '__main__':
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs('results', exist_ok=True)
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=5000)

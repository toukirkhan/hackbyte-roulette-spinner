# HackByte Roulette Spinner

HackByte Roulette Spinner is a Flask web app that lets you upload participant images and pick a random winner with a roulette-style animation.

## Features

- Upload multiple participant images (JPG, JPEG, PNG, GIF, WEBP, BMP)
- Roulette spin animation with winner reveal
- Add, remove, enable/disable, and rename participants
- Save winner history to JSON with timestamps
- View history in the UI and export results as CSV

## Requirements

- Python 3.8 or newer
- pip

## Project Structure

```text
hackbyte-roulette-spinner/
|-- app.py
|-- requirements.txt
|-- README.md
|-- static/
|   |-- css/style.css
|   |-- js/roulette.js
|   `-- uploads/
|-- templates/
|   `-- index.html
`-- results/
    `-- winners.json
```

## Setup and Run

```bash
# 1) Clone the repository
git clone https://github.com/toukirkhan/hackbyte-roulette-spinner.git
cd hackbyte-roulette-spinner

# 2) Create and activate a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# 3) Install dependencies
pip install -r requirements.txt

# 4) Start the app
python app.py
```

Open this URL in your browser:

```text
http://localhost:5000
```

## How to Close the Program

When you are done, stop the Flask server from the terminal where it is running:

```bash
Ctrl + C
```

Optional: if you used a virtual environment, deactivate it:

```bash
deactivate
```

If the server is still running in the background and port 5000 is busy:

```bash
lsof -i :5000
kill -9 <PID>
```

## API Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/` | Main page |
| POST | `/upload` | Upload participant images |
| GET | `/participants` | List participants |
| POST | `/spin` | Select a random winner |
| POST | `/toggle/<participant_id>` | Toggle participant active/inactive |
| DELETE | `/participant/<participant_id>` | Delete participant |
| POST | `/participant/<participant_id>/rename` | Rename participant |
| GET | `/results` | Get winner history |
| POST | `/clear-results` | Clear winner history |
| GET | `/export-results` | Export results as CSV |

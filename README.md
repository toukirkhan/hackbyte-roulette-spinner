# 🎰 HackByte Roulette Spinner

A Python Flask web app for social media challenges — upload participant pictures and randomly select a winner with an animated spin effect!

## Features

- 📸 **Upload Multiple Images** — drag-and-drop or file picker (JPG, PNG, GIF, WEBP, BMP)
- 🎰 **Animated Roulette Spin** — slot-machine style animation that eases out on the winner
- ➕➖ **Add / Remove / Toggle Participants** — manage who's in the pool
- ✏️ **Rename Participants** — click any name to edit it inline
- 💾 **Save Results** — winners logged to `results/winners.json` with timestamps
- 📋 **Winners History** — collapsible results section in the UI
- ⬇️ **Export CSV** — download all results as a spreadsheet
- 🎉 **Confetti Effect** — celebration animation when the winner is revealed
- 🌑 **Dark Casino Theme** — deep purple / black with gold accents

## Project Structure

```
hackbyte-roulette-spinner/
├── app.py                  # Flask application entry point
├── requirements.txt        # Python dependencies
├── README.md               # This file
├── static/
│   ├── css/
│   │   └── style.css       # Styles and animations
│   ├── js/
│   │   └── roulette.js     # Spin animation and logic
│   └── uploads/            # Uploaded participant images
├── templates/
│   └── index.html          # Main UI template
└── results/
    └── winners.json        # Saved results
```

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/toukirkhan/hackbyte-roulette-spinner.git
cd hackbyte-roulette-spinner

# 2. (Recommended) Create a virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
python app.py
```

Open **http://localhost:5000** in your browser.

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Serve the main page |
| POST | `/upload` | Upload participant images |
| GET | `/participants` | List all participants |
| POST | `/spin` | Select a random winner |
| POST | `/toggle/<id>` | Toggle active/inactive status |
| DELETE | `/participant/<id>` | Remove a participant |
| POST | `/participant/<id>/rename` | Rename a participant |
| GET | `/results` | Get winners history |
| POST | `/clear-results` | Clear results history |
| GET | `/export-results` | Download results as CSV |

## Requirements

- Python 3.8+
- Flask ≥ 2.3.0
- Pillow ≥ 10.0.0

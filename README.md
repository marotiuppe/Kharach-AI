# 💡 Kharach AI — Smart Expense & Statement Tracker

Kharach AI is a modern single-page web application built with **FastAPI**, **SQLite**, and **Vanilla JavaScript / HTML5 / CSS3** (featuring Chart.js analytics). It leverages the **Google Gemini API** to automatically parse bank statements (PDFs and screenshots), categorize transactions, analyze vendor spending, detect recurring subscription burn, and answer financial questions in natural language.

---

## ✨ Key Features

- **Instant Statement Extraction**: Drag & drop PDF statements or paste screenshots (Ctrl+V) directly into the Gemini AI chat box.
- **Smart Transaction Ledger**: Advanced filtering by type, category, account, and search term with CSV & Excel export support.
- **Bulk Ledger Management**: Multi-select transaction rows for bulk category re-assignment and bulk processing.
- **Visual Analytics**: Interactive category pie charts, daily spending trendlines, top merchant leaderboards, and month-over-month cash flow charts.
- **Global Keyboard Shortcuts**:
  - `Ctrl+K` / `Cmd+K`: Instant search filter focus
  - `Escape`: Modal dismissal & row selection clear
- **PWA & Mobile Optimized**: Responsive design with PWA installation support and custom light/dark theme preference toggle.
- **100% Private & Local DB**: Operates on localized SQLite storage with zero third-party telemetry.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLite, Pandas, `google-genai` SDK
- **Frontend**: Vanilla HTML5, SCSS/CSS3 Glassmorphism UI, Vanilla JS (Signals pattern), Chart.js
- **Containerization**: Docker, Docker Compose

---

## 🚀 Setup & Local Running

### Prerequisites
- Python 3.10 or higher installed
- Google Gemini API Key (from Google AI Studio)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/Kharach-AI.git
cd Kharach-AI
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_google_ai_studio_api_key_here
GEMINI_MODEL=gemini-flash-latest
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

### 3. Start Development Server
```bash
python -m uvicorn main:app --reload --port 8000
```
Open your browser and navigate to `http://localhost:8000`.

---

## 🐳 Docker Deployment

### Run with Docker Compose (Recommended)
```bash
docker-compose up -d --build
```

### Run with Standalone Docker
```bash
docker build -t kharach-ai .
docker run -d -p 8000:8000 -e GEMINI_API_KEY="your_api_key" --name kharach_container kharach-ai
```

---

## ☁️ Cloud Deployment Guide

### Deploy to Render
1. Connect repository to Render dashboard.
2. Select **Web Service** with build command `pip install -r requirements.txt`.
3. Set start command to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. Add environment variables (`GEMINI_API_KEY`).

---

## 📄 License
Designed & Developed by Maroti Uppe. Built for financial intelligence and seamless statement analysis.

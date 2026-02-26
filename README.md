# 🛡️ FirmShield

**FirmShield** is a production-ready SaaS platform that helps small and medium business owners detect financial risk and potential bankruptcy early. It acts as a "digital financial advisor" — analyzing your financial data and providing clear, actionable insights.

---

## ✨ Features

- **Financial Health Score** — 0-100 risk score with visual indicators
- **Bankruptcy Risk Analysis** — Altman Z-Score inspired predictive model
- **AI Business Advisor** — Plain-language recommendations based on your data
- **Interactive Dashboard** — Revenue, expense, profit, and runway charts
- **Multiple Input Methods** — Manual form input or CSV/Excel file upload
- **PDF Reports** — Downloadable financial health reports
- **Role-Based Access** — Owner, Accountant, Viewer roles
- **Secure Authentication** — JWT with refresh tokens, bcrypt passwords, rate limiting

---

## 🏗️ Architecture

```
firmshield/
├── backend/          # Python FastAPI
│   ├── app/
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic validation
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # Business logic
│   │   └── repositories/  # Data access layer
│   └── alembic/      # Database migrations
├── frontend/         # Next.js 14 + TypeScript + Tailwind
│   └── src/
│       ├── app/      # Next.js App Router pages
│       ├── components/
│       ├── lib/      # API client + auth helpers
│       └── types/
└── data/             # Example datasets
```

---

## 🚀 Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose installed

### 1. Clone the repository
```bash
git clone https://github.com/Atanas2008/FirmShield.git
cd FirmShield
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set a strong SECRET_KEY
```

### 3. Start everything
```bash
docker-compose up --build
```

### 4. Open the app
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🛠️ Local Development Setup

### Backend

#### Prerequisites
- Python 3.11+
- PostgreSQL 15+

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database URL and a secure SECRET_KEY

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### Frontend

#### Prerequisites
- Node.js 20+
- npm

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

App available at: http://localhost:3000

---

## 📊 Financial Analysis Engine

FirmShield's risk engine calculates the following metrics:

| Metric | Formula | Healthy Range |
|--------|---------|---------------|
| **Profit Margin** | (Revenue - Expenses) / Revenue × 100 | > 15% |
| **Burn Rate** | Monthly net cash deficit | Should be 0 |
| **Cash Runway** | Cash Reserves / Burn Rate | > 12 months |
| **Debt Ratio** | Total Debt / Total Assets | < 0.5 |
| **Liquidity Ratio** | Cash Reserves / Monthly Expenses | > 3.0 |

### Risk Scoring (0-100)

Based on an adapted **Altman Z-Score** model plus financial ratio analysis:

- **0-30 (Safe)** — Business is financially healthy
- **31-60 (Moderate Risk)** — Some areas need attention
- **61-100 (High Risk)** — Immediate action required

---

## 📁 Example Dataset

A sample CSV dataset is provided in `data/example_dataset.csv` showing 12 months of financial data. Use this to test the file upload feature.

---

## 🔒 Security

- Passwords hashed with **bcrypt**
- **JWT** authentication (30-min access tokens, 7-day refresh tokens)
- **Rate limiting**: 5 login attempts/min, 3 registrations/hour per IP
- **SQL injection protection** via SQLAlchemy ORM
- Input validation via **Pydantic**
- HTTPS enforced in production (configure reverse proxy)
- Financial data is user-scoped (users can only access their own data)

---

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `users` | User accounts with roles |
| `businesses` | Business profiles |
| `financial_records` | Monthly financial data |
| `risk_analyses` | Computed risk analysis results |
| `reports` | Generated PDF report records |

---

## 🔌 API Reference

Full interactive API documentation is available at `/docs` (Swagger UI) when the backend is running.

Key endpoints:

```
POST   /api/auth/register         # Create account
POST   /api/auth/login            # Get JWT tokens
POST   /api/auth/refresh          # Refresh access token

GET    /api/businesses            # List businesses
POST   /api/businesses            # Create business
GET    /api/businesses/{id}       # Get business

POST   /api/businesses/{id}/records          # Add financial record
POST   /api/businesses/{id}/records/upload   # Upload CSV/Excel

POST   /api/businesses/{id}/analyze          # Run risk analysis
GET    /api/businesses/{id}/analysis         # List analyses

POST   /api/businesses/{id}/reports          # Generate PDF report
GET    /api/businesses/{id}/reports/{id}/download  # Download report
```

---

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| frontend | 3000 | Next.js web app |
| backend | 8000 | FastAPI REST API |
| db | 5432 | PostgreSQL (internal) |

---

## 🚧 Roadmap

- [ ] 12-month financial forecasting
- [ ] Scenario simulation ("what if" analysis)
- [ ] Email notifications when risk increases
- [ ] Weekly health email digest
- [ ] Multi-language support
- [ ] Integration with accounting software (QuickBooks, Xero)

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Backend | Python 3.11, FastAPI |
| Database | PostgreSQL 15 |
| ORM | SQLAlchemy 2.0 |
| Auth | JWT (python-jose) + bcrypt |
| File Parsing | pandas, openpyxl |
| PDF Generation | ReportLab |
| Rate Limiting | slowapi |
| Containerization | Docker, Docker Compose |

---

## 📝 License

MIT

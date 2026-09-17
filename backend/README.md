# LokProcure — Backend

AI-powered bilateral government procurement backend built with **FastAPI**, **SQLAlchemy**, **SQLite**, **LangGraph**, **Google Gemini**, and **ChromaDB**.

The backend provides APIs for government procurement, vendor management, bidding, AI-powered compliance auditing, bilateral AI negotiation, approvals, purchase orders, authentication, and audit tracking.

---

## 🚀 Overview

LokProcure is an intelligent procurement platform designed to automate and streamline the government procurement lifecycle while keeping critical decisions under human supervision.

The backend handles the complete procurement workflow:

```text
Government Purchase Request
          ↓
AI Compliance Audit
          ↓
Vendor Bidding
          ↓
Vendor Evaluation
          ↓
Bilateral AI Negotiation
          ↓
Policy Guardrails
          ↓
Human Approval / Escalation
          ↓
Purchase Order Generation
          ↓
Audit Trail
```

---

# 🛠️ Technology Stack

| Technology            | Purpose                        |
| --------------------- | ------------------------------ |
| Python                | Backend programming language   |
| FastAPI               | REST API framework             |
| Uvicorn               | ASGI server                    |
| SQLAlchemy            | ORM and database interaction   |
| SQLite                | Database                       |
| Pydantic              | Request/response validation    |
| JWT                   | Authentication                 |
| bcrypt                | Password hashing               |
| LangGraph             | AI negotiation workflow        |
| Google Gemini         | AI reasoning and generation    |
| ChromaDB              | Vector database for policy RAG |
| Sentence Transformers | Text embeddings                |
| ReportLab             | Purchase Order PDF generation  |
| Python-dotenv         | Environment configuration      |

---

# 📁 Backend Structure

```text
backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── auth.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── ai_service.py
│   │
│   ├── compliance/
│   │   ├── __init__.py
│   │   └── compliance_service.py
│   │
│   ├── negotiation/
│   │   ├── __init__.py
│   │   ├── graph.py
│   │   ├── policy.py
│   │   ├── gov_agent.py
│   │   └── vendor_agent.py
│   │
│   └── routers/
│       ├── auth.py
│       │
│       ├── government/
│       │   ├── approvals.py
│       │   ├── dashboard.py
│       │   ├── purchase_requests.py
│       │   └── vendors.py
│       │
│       └── vendor_portal/
│           ├── bids.py
│           ├── negotiation.py
│           └── orders.py
│
├── seed_data.py
├── requirements.txt
├── .env
├── procureiq.db
└── README.md
```

---

# ⚙️ Requirements

Make sure the following are installed:

* **Python 3.12+**
* pip
* Virtual environment support
* Node.js 18+ for the frontend
* Google Gemini API key for AI functionality

---

# 📥 Backend Installation

## 1. Navigate to the backend

```bash
cd backend
```

## 2. Create a virtual environment

### Windows

```bash
python -m venv venv
```

## 3. Activate the virtual environment

### Command Prompt

```bash
venv\Scripts\activate
```

### PowerShell

```powershell
venv\Scripts\Activate.ps1
```

### Linux/macOS

```bash
source venv/bin/activate
```

---

# 📦 Install Dependencies

```bash
pip install -r requirements.txt
```

---

# 🔐 Environment Variables

Create a `.env` file inside the `backend` directory.

```env
SECRET_KEY=your-strong-secret-key
GEMINI_API_KEY=your-gemini-api-key
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENABLE_API_DOCS=true
```

---

# 🗄️ Database

LokProcure currently uses **SQLite** with **SQLAlchemy**.

The database file is:

```text
procureiq.db
```

The database is initialized through the application's database configuration.

The backend stores information related to:

* Users
* Vendors
* Purchase Requests
* Bids
* Negotiations
* Approvals
* Purchase Orders
* Audit Events

---

# 🌱 Seed Database

The project includes sample data through:

```text
seed_data.py
```

After activating the virtual environment, run:

```bash
python seed_data.py
```

The seed script initializes the database and creates sample users, vendors, procurement requests, approvals, and related data.

---

# ▶️ Run the Backend

Start the FastAPI server using:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The backend will run at:

```text
http://127.0.0.1:8000
```

---

# 📚 API Documentation

When API documentation is enabled, FastAPI automatically provides Swagger UI.

Open:

```text
http://127.0.0.1:8000/docs
```

Alternative ReDoc documentation:

```text
http://127.0.0.1:8000/redoc
```

---

# 🔑 Authentication

LokProcure uses **JWT-based authentication**.

The authentication flow is:

```text
User Login
    ↓
Credentials Validation
    ↓
Password Verification
    ↓
JWT Token Generation
    ↓
Token Sent to Frontend
    ↓
Authenticated API Requests
```

Passwords are hashed using **bcrypt**.

Role-based access control is used to restrict access to different procurement operations.

---

# 👥 User Roles

The backend supports different procurement-related roles, including:

* Lead Procurement Officer
* Plant Head
* VP Operations
* Finance Director
* Department Manager
* Vendor

Different roles can access different government and vendor portal operations.

---

# 🏛️ Government APIs

Government-side functionality is organized under:

```text
/app/routers/government/
```

### Purchase Requests

Handles:

* Creating purchase requests
* Managing procurement requests
* Procurement information
* AI compliance evaluation
* RFQ/bid generation workflows

### Vendors

Handles:

* Vendor information
* Vendor evaluation
* Vendor scoring
* Vendor-related procurement operations

### Approvals

Handles:

* Procurement approval workflows
* Routing rules
* Human approval
* Escalation
* Purchase Order generation

### Dashboard

Provides government-side dashboard and procurement statistics.

---

# 🏢 Vendor APIs

Vendor functionality is organized under:

```text
/app/routers/vendor_portal/
```

### Bids

Handles:

* Viewing procurement opportunities
* Submitting bids
* Managing bid information
* Bid status

### Negotiation

Handles:

* Vendor-side negotiation
* AI negotiation interaction
* Negotiation state
* Counter-proposals

### Orders

Handles:

* Purchase orders
* Order information
* Finalized procurement details

---

# 🤖 AI Services

LokProcure contains multiple AI components.

## 1. Compliance AI

The compliance service uses a **RAG-based approach**.

```text
Procurement Request
        ↓
Policy Query
        ↓
ChromaDB
        ↓
Relevant Procurement Policies
        ↓
Gemini Evaluation
        ↓
Compliance Result
```

The system retrieves relevant procurement policy information from the vector database before evaluating a purchase request.

A deterministic fallback is available when AI configuration is unavailable.

---

# 🧠 Bilateral AI Negotiation

One of the core features of LokProcure is bilateral AI negotiation.

The system contains two AI agents:

```text
Government Agent  ↔  Vendor Agent
```

The negotiation workflow is implemented using **LangGraph**.

The agents can negotiate parameters such as:

* Price
* Delivery time
* Procurement terms

The workflow maintains negotiation state and routes the conversation between the government and vendor agents.

---

# 🛡️ Policy Guardrails

AI-generated negotiation proposals are validated against deterministic business rules.

### Government constraints

Examples include:

```text
Maximum Authorized Price
Maximum Delivery Time
```

### Vendor constraints

Examples include:

```text
Absolute Minimum Price
Feasible Delivery Time
```

A proposal can result in:

```text
ALLOW
ESCALATE
REJECT
```

This prevents AI agents from independently violating predefined procurement constraints.

---

# 👤 Human-in-the-Loop

The backend supports human intervention during critical procurement decisions.

If a negotiation violates a policy boundary:

```text
AI Proposal
    ↓
Policy Validation
    ↓
Violation Detected
    ↓
Human Escalation
    ↓
Human Decision
```

The authorized user can perform actions such as:

* Approve
* Reject
* Counter
* Resume negotiation

The final procurement decision remains under authorized human control.

---

# 📊 Vendor Scoring

The backend evaluates vendors using procurement-related factors.

The scoring logic considers factors such as:

* Price
* Savings
* Delivery requirements
* Reliability
* Vendor performance

The resulting score can be used by the government procurement workflow to compare submitted bids.

---

# 📄 Purchase Order Generation

Once procurement is approved, the backend can generate a Purchase Order.

The PO generation workflow is:

```text
Approved Procurement
        ↓
PO Data
        ↓
ReportLab
        ↓
PDF Purchase Order
```

Generated purchase orders can be stored and accessed through the procurement system.

---

# 📝 Audit Trail

The backend records important procurement events throughout the workflow.

Examples include:

```text
Purchase Request Created
Bid Submitted
Compliance Checked
Negotiation Started
Negotiation Proposal
Policy Validation
Escalation
Human Approval
Purchase Order Generated
```

This provides traceability across the procurement lifecycle.

---

# 🔄 Complete Backend Workflow

```text
              ┌──────────────────────┐
              │ Government User      │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Purchase Request     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ AI Compliance / RAG  │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Vendor Bidding       │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Vendor Evaluation    │
              └──────────┬───────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │   Bilateral AI Negotiation   │
          │                              │
          │ Government Agent ↔ Vendor    │
          │                Agent         │
          └──────────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Policy Guardrails    │
              └──────────┬───────────┘
                         │
                ┌────────┴────────┐
                │                 │
             Allowed           Violation
                │                 │
                │                 ▼
                │        Human Escalation
                │                 │
                └────────┬────────┘
                         ▼
              ┌──────────────────────┐
              │ Human Approval       │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Purchase Order PDF   │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Audit Trail          │
              └──────────────────────┘
```

---

# 🧪 Running in Development

Start the backend:

```bash
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

For development with automatic reload:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

# 🔗 Frontend Connection

The React frontend communicates with the FastAPI backend through REST APIs.

Development backend:

```text
http://127.0.0.1:8000
```

Frontend:

```text
http://localhost:5173
```

CORS should therefore allow:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

# 🔒 Security

The backend includes security mechanisms such as:

* JWT authentication
* bcrypt password hashing
* Role-based authorization
* Login rate limiting
* CORS configuration
* Security headers
* Environment-based secret management
* AI policy guardrails
* Human approval for critical decisions

---

# 🧩 AI Fallback Architecture

The system is designed so that critical procurement workflows do not completely depend on AI availability.

```text
AI Service
    │
    ├── Gemini Available
    │       ↓
    │   AI Evaluation
    │
    └── Gemini Unavailable
            ↓
     Deterministic Logic
```

This improves reliability during development and demonstration.

---

# 🐛 Troubleshooting

## Backend does not start

Check that the virtual environment is activated:

```bash
venv\Scripts\activate
```

Then reinstall dependencies:

```bash
pip install -r requirements.txt
```

---

## ModuleNotFoundError

Make sure the command is executed from the `backend` directory:

```bash
cd backend
python -m uvicorn app.main:app --port 8000
```

Also verify that all router imports use the correct package structure:

```text
app.routers.government.*
app.routers.vendor_portal.*
```

---

## Gemini is not responding

Check:

```env
GEMINI_API_KEY=your-api-key
```

and restart the backend.

The application also contains deterministic fallback logic for supported AI operations.

---

## CORS Error

Verify:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Then restart the FastAPI server.

---

# 🚀 Production Considerations

The current backend is primarily designed for development and hackathon demonstration.

For production deployment, consider:

* PostgreSQL instead of SQLite
* Redis for distributed rate limiting
* Secure secret management
* HTTPS/TLS
* Production-grade logging
* Centralized audit storage
* MFA
* Secure token storage
* Reverse proxy
* Containerized deployment
* Production AI monitoring

---

# 📌 API Base URL

Development:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

ReDoc:

```text
http://127.0.0.1:8000/redoc
```

---

# 👨‍💻 Development

Backend architecture:

```text
FastAPI
   │
   ├── Authentication
   ├── Government APIs
   ├── Vendor APIs
   ├── Procurement Management
   ├── Compliance RAG
   ├── AI Negotiation
   ├── Policy Guardrails
   ├── Approval Workflow
   ├── Purchase Orders
   └── Audit Trail
```

---

# 📜 License

This project was developed as a hackathon project for demonstrating AI-powered government procurement automation.

---

## LokProcure

**AI-Powered Bilateral Government Procurement Platform**

> Automating procurement while keeping compliance, transparency, and human control at the center.

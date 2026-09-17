# 🏛️ LokProcure

## AI-Powered Bilateral Government Procurement Platform

**LokProcure** is an AI-powered procurement platform designed to simplify and improve the government procurement process by combining **artificial intelligence, policy compliance, automated negotiation, vendor evaluation, and human oversight**.

The platform provides dedicated interfaces for **Government Buyers** and **Vendors**, enabling the complete procurement lifecycle to be managed digitally — from creating a purchase request to generating the final Purchase Order.

---

## 🎯 Problem Statement

Traditional procurement processes can involve:

* Complex compliance requirements
* Time-consuming vendor evaluation
* Manual bid comparison
* Lengthy negotiation processes
* Risk of policy violations
* Limited transparency during negotiations
* Large amounts of administrative work
* Difficulty maintaining a complete audit trail

LokProcure addresses these challenges by introducing AI-assisted automation while ensuring that important procurement decisions remain under **human control**.

---

## 💡 Our Solution

LokProcure creates an intelligent procurement workflow where AI assists users at different stages of procurement.

The system combines:

> **AI Automation + Policy Guardrails + Human Oversight + Auditability**

AI can assist with compliance analysis, vendor evaluation, and bilateral negotiation, while deterministic business rules prevent AI-generated decisions from crossing predefined procurement boundaries.

Critical decisions can be escalated to authorized human officers for review and approval.

---

# 🚀 Key Features

### 🤖 AI Compliance Audit

Automatically analyzes purchase requests against relevant procurement policies.

The system uses a **Retrieval-Augmented Generation (RAG)** approach to retrieve relevant policy information before performing compliance evaluation.

---

### 📋 Purchase Request Management

Government users can:

* Create purchase requests
* Define procurement requirements
* Specify budget constraints
* Define delivery requirements
* Track procurement status
* Manage procurement requests

---

### 🏢 Vendor Management

Government users can manage and evaluate participating vendors.

The platform maintains vendor information and uses procurement-related factors for vendor evaluation.

---

### 💰 Vendor Bidding

Vendors can:

* View procurement opportunities
* Submit bids
* Specify prices
* Provide delivery commitments
* Track bid status

Government users can review submitted bids before proceeding with negotiation.

---

### 📊 Vendor Evaluation

The system evaluates bids using multiple procurement factors, including:

* Price
* Savings
* Delivery requirements
* Reliability
* Vendor performance

This provides structured information for procurement officers during bid evaluation.

---

### 🤝 Bilateral AI Negotiation

One of LokProcure's core features is **AI-to-AI bilateral negotiation**.

The platform uses two AI agents:

```text
Government Agent
       ↕
   Negotiation
       ↕
Vendor Agent
```

The agents can negotiate parameters such as:

* Price
* Delivery time
* Procurement terms

The negotiation workflow is orchestrated using **LangGraph**.

---

### 🛡️ AI Policy Guardrails

AI-generated proposals are validated using deterministic procurement rules.

For example:

**Government-side constraints**

* Maximum authorized price
* Maximum acceptable delivery time

**Vendor-side constraints**

* Minimum acceptable price
* Feasible delivery requirements

A proposal can be classified as:

```text
ALLOW
ESCALATE
REJECT
```

This provides a deterministic safety layer around AI-generated decisions.

---

### 👤 Human-in-the-Loop

AI does not independently control the final procurement decision.

When a negotiation reaches a policy boundary or requires human intervention, the system can escalate the decision to an authorized user.

Human users can:

* Approve
* Reject
* Counter
* Resume negotiation

The final authorization remains with the appropriate human decision-maker.

---

### 📄 Purchase Order Generation

After successful approval, the platform can generate a Purchase Order.

```text
Approved Procurement
        ↓
PO Information
        ↓
PDF Generation
        ↓
Purchase Order
```

Purchase Order PDFs are generated using **ReportLab**.

---

### 📝 Audit Trail

Important procurement events are recorded throughout the workflow.

Examples include:

* Purchase request creation
* Compliance evaluation
* Bid submission
* Vendor evaluation
* Negotiation events
* Policy validation
* Escalations
* Human decisions
* Purchase Order generation

This provides traceability across the procurement lifecycle.

---

### 📊 Dashboard & Analytics

The platform provides dashboards for monitoring procurement activities.

The frontend uses **Recharts** for data visualization.

Dashboard information can include:

* Procurement statistics
* Purchase request status
* Vendor information
* Bid information
* Approval status
* Negotiation status
* Procurement trends

---

### 🔐 Authentication & Authorization

The platform implements:

* JWT authentication
* Password hashing
* Role-based access control
* Protected routes
* Login protection
* Security headers
* CORS configuration

Different users receive access according to their assigned role.

---

# 🏗️ System Architecture

```text
                         LokProcure
                             │
             ┌───────────────┴───────────────┐
             │                               │
             ▼                               ▼
      Government Portal                Vendor Portal
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
                       FastAPI Backend
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
     Procurement         Authentication      Database
       APIs                  │               SQLite
          │                  │
          ▼                  │
    AI Services              │
          │                  │
    ┌─────┴─────┐            │
    │           │            │
    ▼           ▼            │
Compliance   Negotiation     │
   RAG       LangGraph       │
    │           │            │
    ▼           ▼            │
 ChromaDB    Gemini          │
                │            │
                └─────┬──────┘
                      ▼
               Policy Guardrails
                      │
                      ▼
                Human Approval
                      │
                      ▼
               Purchase Order
                      │
                      ▼
                 Audit Trail
```

---

# 🔄 Procurement Workflow

```text
1. Government creates Purchase Request
                    ↓
2. AI Compliance Audit
                    ↓
3. Procurement Request becomes available
                    ↓
4. Vendors submit bids
                    ↓
5. Government evaluates bids
                    ↓
6. Bilateral AI negotiation begins
                    ↓
7. AI proposals are checked by policy guardrails
                    ↓
8. Valid negotiation continues
                    ↓
9. Policy violation → Human Escalation
                    ↓
10. Authorized human reviews decision
                    ↓
11. Procurement is approved
                    ↓
12. Purchase Order is generated
                    ↓
13. Procurement activity is recorded
       in the Audit Trail
```

---

# 🛠️ Technology Stack

## Frontend

| Technology   | Purpose                    |
| ------------ | -------------------------- |
| React 19     | User interface             |
| Vite         | Development and build tool |
| Tailwind CSS | Styling                    |
| Axios        | API communication          |
| React Router | Application routing        |
| Recharts     | Analytics and charts       |
| Lucide React | Icons                      |

## Backend

| Technology | Purpose             |
| ---------- | ------------------- |
| Python     | Backend development |
| FastAPI    | REST API            |
| Uvicorn    | ASGI server         |
| SQLAlchemy | ORM                 |
| SQLite     | Database            |
| Pydantic   | Data validation     |
| JWT        | Authentication      |
| bcrypt     | Password hashing    |
| ReportLab  | PDF generation      |

## AI

| Technology            | Purpose                      |
| --------------------- | ---------------------------- |
| Google Gemini         | AI reasoning and generation  |
| LangGraph             | Negotiation workflow         |
| ChromaDB              | Vector database              |
| Sentence Transformers | Text embeddings              |
| RAG                   | Procurement policy retrieval |

---

# 📁 Project Structure

```text
LokProcure/
│
├── backend/
│   ├── app/
│   │   ├── compliance/
│   │   ├── negotiation/
│   │   ├── routers/
│   │   ├── ai_service.py
│   │   ├── auth.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── main.py
│   │
│   ├── seed_data.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# ⚙️ Installation & Setup

## Prerequisites

Make sure the following are installed:

* Python 3.12+
* Node.js 18+
* npm
* pip
* Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/sohamGGs/KH060-Team_Nexora.git
cd KH060-Team_Nexora
```

---

# 🐍 Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 🔐 Backend Environment Variables

Create:

```text
backend/.env
```

Add:

```env
SECRET_KEY=your-strong-secret-key
GEMINI_API_KEY=your-gemini-api-key
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENABLE_API_DOCS=true
```

Do not commit `.env` to Git.

---

## 🌱 Seed Database

Run:

```bash
python seed_data.py
```

This initializes the database with sample procurement data, users, vendors, and related records.

---

## ▶️ Start Backend

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

---

# ⚛️ Frontend Setup

Open another terminal and navigate to:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev -- --port 5173
```

Frontend:

```text
http://localhost:5173
```

---

# 🔗 Application Architecture

When running locally:

```text
Frontend
http://localhost:5173
        │
        │ Axios / REST API
        ▼
Backend
http://127.0.0.1:8000
        │
        ├── Authentication
        ├── Procurement
        ├── Vendors
        ├── Bids
        ├── Negotiation
        ├── Compliance
        ├── Approvals
        └── Orders
```

---

# 🧠 AI Architecture

## Compliance RAG

```text
Purchase Request
       ↓
Policy Query
       ↓
ChromaDB
       ↓
Relevant Policy Documents
       ↓
Gemini
       ↓
Compliance Analysis
       ↓
Government Dashboard
```

---

## Bilateral Negotiation

```text
Purchase Requirements
          ↓
     Government Agent
          ↕
     LangGraph State
          ↕
       Vendor Agent
          ↓
    Proposed Terms
          ↓
  Deterministic Policy
       Validation
          │
     ┌────┴────┐
     ▼         ▼
   ALLOW    ESCALATE
     │         │
     ▼         ▼
 Continue    Human Review
```

---

# 🔒 Security

LokProcure includes several security mechanisms:

* JWT-based authentication
* Password hashing with bcrypt
* Role-based authorization
* Login rate limiting
* CORS configuration
* Security headers
* Environment-based secrets
* Deterministic AI policy guardrails
* Human approval for critical procurement actions

---

# 🧪 Development

### Backend

```bash
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm run dev -- --port 5173
```

---

# 📦 Production Considerations

For production deployment, the current development architecture can be extended with:

* PostgreSQL instead of SQLite
* Redis for distributed rate limiting
* Secure secrets management
* HTTPS/TLS
* Centralized logging
* Production monitoring
* Cloud object storage
* Containerized deployment
* Reverse proxy
* Multi-factor authentication

---

# 🎯 Why LokProcure?

LokProcure focuses on combining AI automation with controlled decision-making.

Instead of allowing AI to independently make procurement decisions, the platform introduces multiple layers:

```text
AI Assistance
      +
Policy Compliance
      +
Deterministic Guardrails
      +
Human Approval
      +
Auditability
```

This creates a procurement workflow where AI can assist with complex tasks while authorized humans retain control over important decisions.

---

# 🌟 Project Highlights

| Area            | LokProcure                      |
| --------------- | ------------------------------- |
| Procurement     | End-to-end digital workflow     |
| Compliance      | AI + RAG                        |
| Negotiation     | Government Agent ↔ Vendor Agent |
| AI Safety       | Deterministic policy guardrails |
| Decision Making | Human-in-the-loop               |
| Vendors         | Bidding and evaluation          |
| Documents       | Automated PO PDF                |
| Transparency    | Audit trail                     |
| Authentication  | JWT + RBAC                      |
| Analytics       | Interactive dashboard           |

---

# 📌 Quick Start

```bash
# Terminal 1
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed_data.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2
cd frontend
npm install
npm run dev -- --port 5173
```

Then open:

**Frontend**

```text
http://localhost:5173
```

**Backend API**

```text
http://127.0.0.1:8000
```

**API Documentation**

```text
http://127.0.0.1:8000/docs
```

## 🏛️ LokProcure

### **Smarter Procurement. Intelligent Negotiation. Transparent Decisions.**

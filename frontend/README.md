# LokProcure — Frontend

AI-powered bilateral government procurement platform frontend built with **React 19**, **Vite**, **Tailwind CSS**, **Axios**, **Recharts**, and **Lucide React**.

The frontend provides dedicated interfaces for government procurement officers and vendors, including procurement management, compliance review, bidding, AI negotiation, approvals, purchase orders, and analytics.

---

# 🚀 Overview

LokProcure provides a modern web interface for managing the complete government procurement lifecycle.

The frontend communicates with the FastAPI backend through REST APIs.

```text
React Frontend
      │
      │ REST API / Axios
      ▼
FastAPI Backend
      │
      ├── Authentication
      ├── Procurement
      ├── Vendors
      ├── Bids
      ├── AI Compliance
      ├── AI Negotiation
      ├── Approvals
      └── Purchase Orders
```

---

# 🛠️ Technology Stack

| Technology   | Purpose                           |
| ------------ | --------------------------------- |
| React 19     | Frontend UI                       |
| Vite         | Development server and build tool |
| Tailwind CSS | Styling and responsive UI         |
| Axios        | Backend API communication         |
| React Router | Client-side routing               |
| Recharts     | Charts and analytics              |
| Lucide React | UI icons                          |
| JavaScript   | Application logic                 |

---

# 📁 Frontend Structure

```text
frontend/
│
├── public/
│
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │   ├── common/
│   │   ├── government/
│   │   ├── vendor/
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── auth/
│   │   ├── government/
│   │   ├── vendor/
│   │   └── ...
│   │
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── ...
│   │
│   ├── hooks/
│   ├── utils/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── package.json
├── package-lock.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

> The exact component and page organization may evolve as new frontend features are added.

---

# ⚙️ Requirements

Install the following before running the frontend:

* **Node.js 18+**
* npm
* A running LokProcure backend

Check your Node.js installation:

```bash
node --version
```

Check npm:

```bash
npm --version
```

---

# 📥 Installation

## 1. Navigate to the frontend

```bash
cd frontend
```

## 2. Install dependencies

```bash
npm install
```

---

# ▶️ Run the Frontend

Start the Vite development server:

```bash
npm run dev -- --port 5173
```

The frontend will be available at:

```text
http://localhost:5173
```

---

# 🔗 Backend Connection

The frontend communicates with the FastAPI backend.

Development backend:

```text
http://127.0.0.1:8000
```

Frontend:

```text
http://localhost:5173
```

Make sure the backend is running before testing features that require API communication.

---

# 🔐 Authentication

The frontend provides login functionality for authorized users.

Authentication flow:

```text
Login Page
    ↓
User enters credentials
    ↓
POST request to FastAPI
    ↓
Backend validates credentials
    ↓
JWT token returned
    ↓
Frontend stores authentication state
    ↓
Protected pages become accessible
```

Authenticated API requests use the JWT token to access protected backend endpoints.

---

# 👥 User Portals

LokProcure provides interfaces for two primary sides of procurement:

```text
                 LokProcure
                     │
             ┌───────┴───────┐
             │               │
             ▼               ▼
       Government          Vendor
         Portal             Portal
```

---

# 🏛️ Government Portal

The Government Portal provides functionality for procurement officers and other authorized government users.

### Main functionality

* Government dashboard
* Purchase request management
* Vendor management
* Bid evaluation
* Compliance review
* Negotiation monitoring
* Approval workflow
* Purchase order management
* Procurement analytics
* Audit information

---

# 📋 Purchase Requests

Government users can create and manage procurement requests.

A purchase request can contain information such as:

* Procurement item
* Quantity
* Budget
* Delivery requirements
* Procurement details
* Request status

Typical workflow:

```text
Create Purchase Request
          ↓
Submit Request
          ↓
Compliance Audit
          ↓
Vendor Bidding
```

---

# 🤖 AI Compliance Interface

The frontend displays the results of the backend's AI-powered compliance audit.

```text
Purchase Request
       ↓
Backend Compliance Service
       ↓
Policy Retrieval
       ↓
AI Evaluation
       ↓
Frontend Compliance Result
```

The interface can display:

* Compliance status
* Relevant policy information
* Findings
* Reasons
* Procurement review information

---

# 🏢 Vendor Portal

Vendors have a dedicated portal for participating in government procurement.

### Vendor functionality

* View procurement opportunities
* Submit bids
* Track bids
* Participate in negotiations
* View negotiation status
* View purchase orders

---

# 💰 Bid Management

Vendors can submit bids for available procurement requests.

Bid information can include:

* Proposed price
* Delivery time
* Vendor details
* Procurement request
* Bid status

Government users can then review and compare vendor submissions.

---

# 🤝 AI Negotiation Interface

LokProcure provides an interface for the bilateral AI negotiation system.

```text
Government Agent
       ↕
 Negotiation
       ↕
Vendor Agent
```

The frontend displays relevant negotiation information and status while the actual negotiation workflow is processed by the backend.

Negotiation parameters include:

* Price
* Delivery time
* Terms
* Counter-proposals
* Negotiation status

---

# 🛡️ Policy Guardrail & Escalation UI

The frontend can display situations where an AI-generated proposal crosses a predefined policy boundary.

```text
AI Proposal
     ↓
Policy Guardrail
     ↓
 ┌───────────────┐
 │               │
 ▼               ▼
Allowed       Violation
                │
                ▼
        Human Escalation
```

Government users can review escalated negotiations and make the final decision.

Possible actions include:

* Approve
* Reject
* Counter
* Resume negotiation

---

# 👤 Human-in-the-Loop Workflow

Critical procurement decisions remain under authorized human control.

Frontend workflow:

```text
AI Decision
     ↓
Review
     ↓
Human Officer
     ↓
Approve / Reject / Counter
     ↓
Continue Procurement
```

This ensures that AI does not independently finalize sensitive procurement decisions.

---

# 📄 Purchase Orders

After procurement approval, users can access the generated Purchase Order.

The workflow is:

```text
Negotiation
    ↓
Approval
    ↓
Purchase Order
    ↓
PDF Generation
```

The frontend provides access to relevant purchase order information and generated documents.

---

# 📊 Dashboard & Analytics

The frontend uses **Recharts** to visualize procurement information.

Possible dashboard information includes:

* Procurement statistics
* Purchase request status
* Vendor information
* Bid statistics
* Procurement trends
* Approval status
* Negotiation information

Example visualization flow:

```text
Backend Data
     ↓
Axios
     ↓
React State
     ↓
Recharts
     ↓
Dashboard Visualization
```

---

# 🔄 API Integration

Axios is used for communication between the React application and FastAPI backend.

General request flow:

```text
React Component
      ↓
Service Layer
      ↓
Axios
      ↓
FastAPI Endpoint
      ↓
Database / AI Service
      ↓
JSON Response
      ↓
React UI
```

Keeping API calls in service modules helps separate UI logic from backend communication.

---

# 🧭 Routing

The frontend uses client-side routing to separate authentication, government, and vendor interfaces.

Conceptually:

```text
/
├── Login
├── Register
│
├── Government
│   ├── Dashboard
│   ├── Purchase Requests
│   ├── Vendors
│   ├── Approvals
│   └── Analytics
│
└── Vendor
    ├── Dashboard
    ├── Bids
    ├── Negotiation
    └── Orders
```

Protected routes require the user to be authenticated and authorized.

---

# 🎨 UI & Styling

The frontend uses **Tailwind CSS** for styling.

The interface focuses on:

* Responsive layouts
* Procurement dashboards
* Cards and data tables
* Status indicators
* Forms
* Charts
* Navigation
* Modal/dialog interactions
* Government and vendor workflows

---

# 🧩 Reusable Components

The application uses reusable React components for common UI elements.

Examples include:

* Buttons
* Cards
* Tables
* Forms
* Navigation
* Modals
* Status indicators
* Loading states
* Error messages

Reusable components help maintain consistent UI throughout the application.

---

# 📱 Responsive Design

The frontend is designed using responsive Tailwind CSS utilities.

The interface can adapt to different screen sizes:

```text
Desktop
   ↓
Tablet
   ↓
Mobile
```

Dashboard layouts, cards, tables, and navigation can be adjusted using responsive CSS classes.

---

# 🔄 Complete Frontend Workflow

```text
                    Login
                      │
                      ▼
               Role Detection
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
       Government Portal   Vendor Portal
             │                 │
             ▼                 ▼
     Purchase Requests       Bids
             │                 │
             ▼                 ▼
      AI Compliance       Bid Submission
             │                 │
             └────────┬────────┘
                      ▼
              AI Negotiation
                      │
                      ▼
              Policy Guardrail
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
           Valid           Escalation
             │                 │
             │                 ▼
             │          Human Review
             │                 │
             └────────┬────────┘
                      ▼
                Final Approval
                      │
                      ▼
               Purchase Order
                      │
                      ▼
                  Audit Trail
```

---

# 🧪 Development Commands

## Start development server

```bash
npm run dev -- --port 5173
```

## Build production version

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```

---

# 🐛 Troubleshooting

## Frontend does not start

Delete dependencies and reinstall:

```bash
rm -rf node_modules
npm install
```

On Windows Command Prompt:

```cmd
rmdir /s /q node_modules
npm install
```

---

## Backend API is not responding

Make sure FastAPI is running:

```bash
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then check:

```text
http://127.0.0.1:8000/docs
```

---

## CORS error

Make sure the backend allows the frontend origin:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Restart the backend after changing `.env`.

---

## API 404 Error

Check:

1. FastAPI server is running.
2. Frontend is using the correct API base URL.
3. The endpoint exists in the backend router.
4. The correct HTTP method is being used.
5. The request path matches the backend route.

---

## Authentication / Redirect Issues

Check:

* JWT token is being returned by the backend.
* Authentication state is initialized correctly.
* Protected routes are configured correctly.
* The frontend is sending the token with authenticated requests.
* Backend authentication middleware accepts the token.

---

# 🔒 Frontend Security Considerations

The frontend should:

* Avoid hardcoding API keys
* Avoid storing sensitive credentials in source code
* Use HTTPS in production
* Handle authentication tokens securely
* Validate user input
* Protect role-specific routes
* Avoid exposing private AI configuration
* Use environment variables for configurable API URLs

---

# 🌐 Production Configuration

For production deployment, configure the frontend to communicate with the deployed backend instead of:

```text
http://127.0.0.1:8000
```

A production architecture can look like:

```text
                  Internet
                     │
                     ▼
              Frontend Application
                     │
                  HTTPS
                     │
                     ▼
                API Server
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
     Database       AI         Storage
```

---

# 📦 Build for Production

Create a production build:

```bash
npm run build
```

The compiled frontend will be generated in:

```text
dist/
```

Preview the build locally:

```bash
npm run preview
```

---

# 🔗 Backend & Frontend

LokProcure consists of two major applications:

```text
┌───────────────────────────────┐
│         Frontend              │
│                               │
│ React + Vite + Tailwind       │
│ Axios + Recharts              │
└───────────────┬───────────────┘
                │
                │ REST API
                ▼
┌───────────────────────────────┐
│          Backend              │
│                               │
│ FastAPI + SQLAlchemy          │
│ SQLite + JWT                  │
│ AI + LangGraph + Gemini       │
└───────────────────────────────┘
```

---

# 🚀 Quick Start

### Terminal 1 — Backend

```bash
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev -- --port 5173
```

Open:

```text
http://localhost:5173
```

Backend API:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

---

# 📌 Project Highlights

### Government Side

* 📋 Purchase Request Management
* 🤖 AI Compliance Audit
* 🏢 Vendor Management
* 💰 Bid Evaluation
* 🤝 AI Negotiation
* 🛡️ Policy Guardrails
* 👤 Human Approval
* 📄 Purchase Orders
* 📊 Procurement Analytics
* 📝 Audit Trail

### Vendor Side

* 🔎 Procurement Opportunities
* 💰 Bid Submission
* 🤝 AI Negotiation
* 📋 Bid Tracking
* 📄 Purchase Orders
* 📊 Procurement Status

---

> A modern procurement interface connecting government buyers and vendors through AI-assisted compliance, negotiation, and transparent human-controlled decision making.

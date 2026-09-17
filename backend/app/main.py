import os
import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app import models
from app.database import Base, engine
from app.routers import auth
from app.routers.government import purchase_requests as gov_pr, vendors as gov_vendors, approvals as gov_approvals, dashboard as gov_dashboard
from app.routers.vendor_portal import bids as vendor_bids, orders as vendor_orders, negotiation as vendor_negotiation
from app.compliance.ingest import init_policy_db

Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    patches = {
        "vendor_bids": [
            ("original_quoted_price", "FLOAT"),
            ("original_delivery_days", "INTEGER"),
        ],
        "vendors": [
            ("is_local_vendor", "BOOLEAN"),
            ("is_incubator", "BOOLEAN"),
            ("local_proximity_km", "FLOAT"),
        ],
        "purchase_orders": [
            ("netsuite_internal_id", "VARCHAR(50)"),
            ("netsuite_sync_status", "VARCHAR(50)"),
            ("netsuite_subsidiary", "VARCHAR(100)"),
            ("netsuite_gl_account", "VARCHAR(100)"),
        ],
    }

    for table_name, columns in patches.items():
        try:
            result = conn.execute(text(f"PRAGMA table_info({table_name});")).fetchall()
            existing_columns = {row[1] for row in result}

            for column_name, column_type in columns:
                if column_name not in existing_columns:
                    conn.execute(
                        text(
                            f"ALTER TABLE {table_name} "
                            f"ADD COLUMN {column_name} {column_type};"
                        )
                    )
        except Exception:
            pass

    conn.commit()

try:
    init_policy_db()
except Exception:
    pass

enable_docs = os.getenv("ENABLE_API_DOCS", "true").lower() == "true"
app = FastAPI(
    title="LokProcure - NetSuite-Aligned Intelligent Dual-Sided ERP Procurement",
    version="1.0.0",
    docs_url="/docs" if enable_docs else None,
    redoc_url="/redoc" if enable_docs else None,
    openapi_url="/openapi.json" if enable_docs else None,
)

cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    allow_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    allow_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Authentication routes -> /api/auth/login, /api/auth/me
app.include_router(auth.router, prefix="/api", tags=["Authentication"])

# Government routes -> /api/gov/...
app.include_router(gov_pr.router, prefix="/api/gov", tags=["Gov - Purchase Requests"])
app.include_router(gov_vendors.router, prefix="/api/gov", tags=["Gov - Vendors"])
app.include_router(gov_approvals.router, prefix="/api/gov", tags=["Gov - Approvals"])
app.include_router(gov_dashboard.router, prefix="/api/gov", tags=["Gov - Dashboard"])

# Legacy frontend-compatible routes -> /api/...
app.include_router(gov_pr.router, prefix="/api", tags=["Legacy - Purchase Requests"])
app.include_router(gov_vendors.router, prefix="/api", tags=["Legacy - Vendors"])
app.include_router(gov_approvals.router, prefix="/api", tags=["Legacy - Approvals"])
app.include_router(gov_dashboard.router, prefix="/api", tags=["Legacy - Dashboard"])

# Vendor Portal routes -> /api/vendor/...
app.include_router(vendor_bids.router, prefix="/api/vendor/bids", tags=["Vendor - Bids"])
app.include_router(vendor_orders.router, prefix="/api/vendor/orders", tags=["Vendor - Orders"])
app.include_router(vendor_negotiation.router, prefix="/api/vendor/negotiation", tags=["Vendor - Negotiation"])

os.makedirs("generated_pos", exist_ok=True)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "LokProcure Enterprise ERP",
        "database": "sqlite:///procureiq.db",
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }

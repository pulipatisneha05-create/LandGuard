from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.api.health import router as health_router
from app.api.documents import router as documents_router
from app.api.verification import router as verification_router
from app.api.risk import router as risk_router
from app.api.gis import router as gis_router
from app.database import engine, Base
from sqlalchemy import text
import app.models  # noqa: F401

logger = logging.getLogger("landguard.main")

app = FastAPI(
    title="AI-Powered Land Record Validation and Fraud Detection System API",
    description="Backend service providing OCR document ingestion, NLP parsing, land record verification, anomaly detection, explainable risk scoring, and GIS spatial mapping.",
    version="1.0.0",
)

@app.on_event("startup")
def init_db_tables():
    """
    Ensure all application tables (document_records, verification_results,
    risk_assessments, land_records, ownership_history) exist in PostgreSQL.
    Leaves existing data and schemas fully intact.
    """
    try:
        Base.metadata.create_all(bind=engine)
        # Idempotently ensure area normalization columns exist on document_records
        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE document_records ADD COLUMN IF NOT EXISTS extracted_land_area_raw VARCHAR(100);"))
                conn.execute(text("ALTER TABLE document_records ADD COLUMN IF NOT EXISTS extracted_land_area_unit VARCHAR(50);"))
                conn.execute(text("ALTER TABLE document_records ADD COLUMN IF NOT EXISTS extracted_land_area_normalized_acres NUMERIC(12, 4);"))
                conn.commit()
            elif engine.dialect.name == "sqlite":
                res = conn.execute(text("PRAGMA table_info(document_records);")).fetchall()
                existing_cols = [r[1] for r in res]
                if "extracted_land_area_raw" not in existing_cols:
                    conn.execute(text("ALTER TABLE document_records ADD COLUMN extracted_land_area_raw VARCHAR(100);"))
                if "extracted_land_area_unit" not in existing_cols:
                    conn.execute(text("ALTER TABLE document_records ADD COLUMN extracted_land_area_unit VARCHAR(50);"))
                if "extracted_land_area_normalized_acres" not in existing_cols:
                    conn.execute(text("ALTER TABLE document_records ADD COLUMN extracted_land_area_normalized_acres NUMERIC(12, 4);"))
                conn.commit()
        logger.info("Database tables and columns initialized successfully.")
    except Exception as e:
        logger.warning(f"Notice: Database metadata create_all warning: {e}")

# Enable CORS for local and cloud frontend deployments
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(documents_router, prefix="/api/documents", tags=["Document Ingestion & OCR"])
app.include_router(verification_router, prefix="/api/verification", tags=["Land Verification & Anomaly Detection"])
app.include_router(risk_router, prefix="/api/risk", tags=["Explainable Risk Scoring Engine"])
app.include_router(gis_router, prefix="/api/gis", tags=["GIS Spatial Mapping & Parcels"])


@app.get("/")
def read_root():
    return {
        "system": "AI-Powered Land Record Validation and Fraud Detection System",
        "status": "online",
        "health_check": "/api/health",
        "ocr_upload": "/api/documents/upload",
        "verification": "/api/verification/verify/{document_id}",
        "risk_assessment": "/api/risk/assess/{document_id}",
        "gis_parcels": "/api/gis/parcels",
        "docs": "/docs",
    }

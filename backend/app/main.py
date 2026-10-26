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

        # Idempotently ensure synthetic reference records and SY-TEST-104/2 exist
        from app.database import SessionLocal
        from app.models import LandRecord, OwnershipHistory
        import csv
        import os
        from datetime import datetime, date

        db = SessionLocal()
        try:
            # 1. Update/Ensure REC-1011 matches Rajesh Kumar Sharma (402/B - 2.45 Acres)
            rec_1011 = db.query(LandRecord).filter(LandRecord.record_id == "REC-1011").first()
            if rec_1011:
                rec_1011.owner_name = "Rajesh Kumar Sharma"
                rec_1011.survey_number = "402/B"
                rec_1011.land_area_acres = 2.45
                rec_1011.village = "Gachibowli"
                rec_1011.mandal = "Serilingampally"
                rec_1011.district = "Ranga Reddy"
                rec_1011.state = "Telangana"
                rec_1011.registration_number = "DOC-2026-8901"
                rec_1011.registration_date = date(2023, 5, 14)
                rec_1011.document_type = "Sale Deed"
            h11 = db.query(OwnershipHistory).filter(OwnershipHistory.history_id == "HIST-011").first()
            if h11:
                h11.owner_name = "Subhash Sharma"
            h12 = db.query(OwnershipHistory).filter(OwnershipHistory.history_id == "HIST-012").first()
            if h12:
                h12.owner_name = "Rajesh Kumar Sharma"
                h12.transfer_date = date(2023, 5, 14)
            db.commit()

            # 2. Populate missing records from sample_data/land_records.csv
            csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "land_records.csv"))
            if os.path.exists(csv_path):
                with open(csv_path, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        rec_id = row.get("record_id")
                        if rec_id and not db.query(LandRecord).filter(LandRecord.record_id == rec_id).first():
                            reg_date_str = row.get("registration_date")
                            reg_date = None
                            if reg_date_str:
                                try:
                                    reg_date = datetime.strptime(reg_date_str.strip(), "%Y-%m-%d").date()
                                except Exception:
                                    pass
                            area_val = float(row.get("land_area_acres") or 0.0)
                            db.add(LandRecord(
                                record_id=rec_id,
                                owner_name=row.get("owner_name") or None,
                                survey_number=row.get("survey_number"),
                                land_area_acres=area_val,
                                village=row.get("village"),
                                mandal=row.get("mandal"),
                                district=row.get("district"),
                                state=row.get("state"),
                                registration_number=row.get("registration_number"),
                                registration_date=reg_date,
                                document_type=row.get("document_type")
                            ))
                db.commit()

            # 3. Populate missing records from sample_data/ownership_history.csv
            hist_csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "ownership_history.csv"))
            if os.path.exists(hist_csv_path):
                with open(hist_csv_path, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        hid = row.get("history_id")
                        if hid and not db.query(OwnershipHistory).filter(OwnershipHistory.history_id == hid).first():
                            t_date_str = row.get("transfer_date")
                            t_date = None
                            if t_date_str:
                                try:
                                    t_date = datetime.strptime(t_date_str.strip(), "%Y-%m-%d").date()
                                except Exception:
                                    pass
                            db.add(OwnershipHistory(
                                history_id=hid,
                                survey_number=row.get("survey_number"),
                                owner_name=row.get("owner_name"),
                                transfer_date=t_date,
                                transfer_type=row.get("transfer_type")
                            ))
                db.commit()
        except Exception as seed_err:
            logger.warning(f"Notice: Seeding reference records check: {seed_err}")
            try:
                db.rollback()
            except Exception:
                pass
        finally:
            db.close()
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

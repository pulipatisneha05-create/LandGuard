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
            # 1. Ensure REC-TEST-1042 exists in land_records
            test_rec = db.query(LandRecord).filter(
                (LandRecord.record_id == "REC-TEST-1042") | (LandRecord.survey_number == "SY-TEST-104/2")
            ).first()
            if not test_rec:
                test_rec = LandRecord(
                    record_id="REC-TEST-1042",
                    owner_name="Arun Kumar",
                    survey_number="SY-TEST-104/2",
                    land_area_acres=0.0496,
                    village="Green Valley",
                    mandal="Demo Mandal",
                    district="Demo District",
                    state="Telangana",
                    registration_number="DOC-TEST-2026-001",
                    registration_date=date(2026, 9, 15),
                    document_type="Sale Deed"
                )
                db.add(test_rec)
                db.commit()
                logger.info("Idempotently seeded reference record REC-TEST-1042.")

            # 2. Ensure HIST-TEST-1042-1 & 2 exist in ownership_history
            h1 = db.query(OwnershipHistory).filter(OwnershipHistory.history_id == "HIST-TEST-1042-1").first()
            if not h1:
                db.add(OwnershipHistory(
                    history_id="HIST-TEST-1042-1",
                    survey_number="SY-TEST-104/2",
                    owner_name="Ram Kumar",
                    transfer_date=date(2015, 6, 10),
                    transfer_type="Original Grant"
                ))
            h2 = db.query(OwnershipHistory).filter(OwnershipHistory.history_id == "HIST-TEST-1042-2").first()
            if not h2:
                db.add(OwnershipHistory(
                    history_id="HIST-TEST-1042-2",
                    survey_number="SY-TEST-104/2",
                    owner_name="Arun Kumar",
                    transfer_date=date(2026, 9, 15),
                    transfer_type="Sale Deed"
                ))
            db.commit()

            # 3. Populate base records if table has only test record or is empty
            total_records = db.query(LandRecord).count()
            if total_records <= 1:
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

            total_hist = db.query(OwnershipHistory).count()
            if total_hist <= 2:
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

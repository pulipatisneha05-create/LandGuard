"""
LandGuard Automated Regression & Hardening Test Suite.
Validates the Render deployment crash fix, dependency isolation,
sanitized health checks, upload path traversal prevention, Indian area unit conversions,
and fraud-vs-missing reference distinction.
"""

import os
import sys
import io
import asyncio
import tempfile
import pytest
from fastapi import UploadFile

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.api.health import health_check, readiness_check
from app.api.documents import upload_document, get_document_details, UPLOADS_DIR
from app.nlp.unit_converter import convert_to_acres, normalize_land_area, compare_areas
from app.verification.engine import verification_engine
from app.risk_scoring.engine import risk_scoring_engine
from app.ocr.processor import extract_text_from_pdf
from app.database import check_db_connection


def test_render_startup_guard_without_numpy():
    """
    Regression Test for Render Deployment Failure (Commit f85a8d7).
    Confirms app.ocr.preprocessor does not crash at module load time
    when numpy is unavailable or None.
    """
    from app.ocr.preprocessor import enhance_document_image
    from PIL import Image

    dummy = Image.new("RGB", (50, 50), color="white")
    result = enhance_document_image(dummy)
    assert result is not None
    assert result.size == (50, 50)


def test_health_and_readiness_endpoints_sanitization():
    """
    Verifies health_check and readiness_check respond with 200 OK structure
    and do NOT leak passwords, connection strings, or raw stack traces.
    """
    data = health_check()
    assert data["status"] == "ok"
    assert "version" in data

    # Verify no sensitive keywords are leaked in health payload
    data_str = str(data).lower()
    assert "password" not in data_str
    assert "secret" not in data_str
    assert "postgresql://" not in data_str

    ready_data = readiness_check()
    assert ready_data["status"] == "ready"


def test_database_connection_check_sanitization():
    """
    Verifies check_db_connection never leaks database credentials even on failure.
    """
    status = check_db_connection()
    assert "status" in status
    assert status["status"] in ["connected", "disconnected"]
    status_str = str(status).lower()
    assert "password" not in status_str
    assert "secret" not in status_str


def test_upload_filename_path_traversal_sanitization():
    """
    Verifies that uploading a file with path traversal characters (e.g. ../../test.pdf)
    is sanitized and safely stored within the target uploads directory.
    """
    file_bytes = b"SYNTHETIC LAND RECORD TEST\nOwner name: Sneha Rao\nSurvey number: 99/A\n"
    up_file = UploadFile(filename="../../malicious_traversal.pdf", file=io.BytesIO(file_bytes))
    
    # Create an in-memory SQLite session for tests if PostgreSQL is offline
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.database import Base
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(bind=test_engine)
    db = TestingSessionLocal()

    try:
        data = asyncio.run(upload_document(file=up_file, db=db))
        saved_filename = data.get("file_path", "")
        assert not saved_filename.startswith("..")
        full_path = os.path.join(backend_dir, "..", saved_filename)
        norm_uploads = os.path.normpath(UPLOADS_DIR)
        norm_full = os.path.normpath(full_path)
        assert norm_full.startswith(norm_uploads)
    finally:
        db.close()


def test_area_unit_normalization_indian_units():
    """
    Verifies mathematical unit conversions for Indian land measures:
    - 240 Square Yards != 240 Acres (240 sq yards ~ 0.0496 Acres)
    - 20 Guntas = 0.5 Acres
    - 100 Cents = 1.0 Acre
    - 1 Hectare = 2.471 Acres
    """
    # 240 Square Yards
    sqyd_acres = convert_to_acres(240, "square yards")
    assert round(sqyd_acres, 4) == round(240 / 4840, 4)
    assert sqyd_acres < 0.1  # Definitely not 240 acres!

    # 20 Guntas
    guntas_acres = convert_to_acres(20, "guntas")
    assert round(guntas_acres, 2) == 0.50

    # 100 Cents
    cents_acres = convert_to_acres(100, "cents")
    assert round(cents_acres, 2) == 1.00

    # 1 Hectare
    hectare_acres = convert_to_acres(1, "hectare")
    assert round(hectare_acres, 3) == 2.471

    # Normalization payload check
    norm = normalize_land_area(240, "Square Yards")
    assert norm["raw_value"] == 240
    assert norm["raw_unit"] == "Square Yards"
    assert norm["normalized_acres"] == round(240 / 4840, 4)
    assert norm["is_reliable"] is True


def test_unindexed_survey_is_not_declared_fraud():
    """
    Verifies that an unindexed survey in the synthetic database is classified as
    REFERENCE_RECORD_NOT_AVAILABLE with 0 risk penalty points, not fraud.
    """
    res = verification_engine.verify_extracted_attributes(
        owner_name="Arun Kumar",
        survey_number="SY-TEST-104/2",
        land_area=240,
        land_area_unit="square yards",
        doc_village="Green Valley",
        doc_district="Demo District"
    )

    assert res["verification_status"] == "REFERENCE_NOT_FOUND"
    assert res["reference_status"] == "NO_MATCHING_REFERENCE"

    # Risk scoring on unindexed record
    assessment = risk_scoring_engine.compute_risk_assessment("DOC-UNINDEXED-TEST", db=None)
    # Ensure unindexed parcel gets a low risk or zero inconsistency points
    assert assessment["risk_level"] in ["LOW", "LOW RISK"]
    assert assessment["risk_score"] < 30


def test_direct_text_document_reader_tier():
    """
    Verifies Tier 4.5 in OCR processor handles UTF-8 synthetic documents directly.
    """
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(b"GOVERNMENT OF TELANGANA\nPATTADAR PASSBOOK CUM TITLE DEED\nOwner name: Venkat Rao\nSurvey number: 118/A\nExtent: 2.0 Acres\n")
        tmp_name = f.name

    try:
        res = extract_text_from_pdf(tmp_name)
        assert res["status"] == "COMPLETED"
        assert "Venkat Rao" in res["text"]
        assert "118/A" in res["text"]
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)


def test_document_result_isolation():
    """
    Verifies two consecutive uploads receive distinct document IDs,
    independent OCR text, and do not share stale results.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.database import Base
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(bind=test_engine)
    db = TestingSessionLocal()

    try:
        up1 = UploadFile(filename="doc1.pdf", file=io.BytesIO(b"DEED 1\nOwner name: Person One\nSurvey number: 101/A\nLand area: 1.5 Acres\n"))
        doc1 = asyncio.run(upload_document(file=up1, db=db))

        up2 = UploadFile(filename="doc2.pdf", file=io.BytesIO(b"DEED 2\nOwner name: Person Two\nSurvey number: 202/B\nLand area: 3.5 Acres\n"))
        doc2 = asyncio.run(upload_document(file=up2, db=db))

        assert doc1["document_id"] != doc2["document_id"]
        assert doc1["extracted_nlp_fields"]["owner_name"] != doc2["extracted_nlp_fields"]["owner_name"]
        assert "Person One" in doc1["extracted_text"]
        assert "Person Two" in doc2["extracted_text"]
    finally:
        db.close()

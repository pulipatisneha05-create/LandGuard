import os
import sys
import io
import asyncio
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base
from app.models import LandRecord, OwnershipHistory, DocumentRecord
from app.verification.engine import LandVerificationEngine
from app.risk_scoring.engine import ExplainableRiskScoringEngine
from app.api.documents import upload_document
from fastapi import UploadFile


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed reference records for testing
    # Survey 101/A - registered under Anil Kumar Rao, 2.50 acres
    session.add(LandRecord(
        record_id="REC-1001",
        owner_name="Anil Kumar Rao",
        survey_number="101/A",
        land_area_acres=2.50,
        village="Greenvalley",
        mandal="Serilingampally",
        district="Ranga Reddy",
        state="Telangana",
        registration_number="REG-2020-00101",
        document_type="Sale Deed"
    ))

    # Survey 101/A title history (Prior owners: Venkat Rao -> Anil Kumar Rao)
    session.add(OwnershipHistory(
        history_id="HIST-001",
        survey_number="101/A",
        owner_name="Anil Kumar Rao",
        transfer_type="Sale"
    ))
    session.add(OwnershipHistory(
        history_id="HIST-002",
        survey_number="101/A",
        owner_name="Venkat Rao",
        transfer_type="Inheritance"
    ))

    # Survey SY-TEST-104/2 - registered under Arun Kumar, 0.0496 acres (240 sq yds)
    session.add(LandRecord(
        record_id="REC-TEST-104",
        owner_name="Arun Kumar",
        survey_number="SY-TEST-104/2",
        land_area_acres=0.0496,
        village="Green Valley",
        mandal="Demo Mandal",
        district="Demo District",
        state="Telangana",
        registration_number="REG-TEST-104-2026",
        document_type="Sale Deed"
    ))

    # Survey SY-TEST-104/2 title history
    session.add(OwnershipHistory(
        history_id="HIST-TEST-1042-1",
        survey_number="SY-TEST-104/2",
        owner_name="Ram Kumar",
        transfer_type="Original Grant"
    ))
    session.add(OwnershipHistory(
        history_id="HIST-TEST-1042-2",
        survey_number="SY-TEST-104/2",
        owner_name="Arun Kumar",
        transfer_type="Sale Deed"
    ))

    session.commit()
    yield session
    session.close()


def test_normal_matching_document_risk_score(test_db):
    """
    Scenario 1: Normal matching PDF
    Assert: Score is 0 (or justified low), level is LOW, no record inconsistencies.
    """
    verifier = LandVerificationEngine()
    scorer = ExplainableRiskScoringEngine()

    sample_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "LandGuard_Synthetic_Test_Land_Record.pdf"))
    with open(sample_pdf, "rb") as f:
        pdf_bytes = f.read()

    up = UploadFile(filename="LandGuard_Synthetic_Test_Land_Record.pdf", file=io.BytesIO(pdf_bytes))
    upload_res = asyncio.run(upload_document(file=up, db=test_db))
    doc_id = upload_res["document_id"]

    ver_res = verifier.verify_document(doc_id, db=test_db)
    assert ver_res["verification_status"] == "VERIFIED"
    assert ver_res["risk_score"] == 0
    assert ver_res["risk_level"] == "LOW"
    assert len(ver_res["record_inconsistencies"]) == 0

    risk_res = scorer.compute_risk_assessment(doc_id, db=test_db)
    assert risk_res["risk_score"] == 0
    assert risk_res["risk_level"] == "LOW"
    assert risk_res["inconsistency_score"] == 0


def test_unindexed_document_risk_score_is_zero(test_db):
    """
    Scenario 2: Unmatched PDF with survey SY-UNINDEXED-999
    Assert: REFERENCE_NOT_FOUND, risk score is 0, level is LOW, not flagged as fraud.
    """
    verifier = LandVerificationEngine()
    scorer = ExplainableRiskScoringEngine()

    sample_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "test_documents", "LandGuard_Synthetic_Test_Unindexed_Record.pdf"))
    with open(sample_pdf, "rb") as f:
        pdf_bytes = f.read()

    up = UploadFile(filename="LandGuard_Synthetic_Test_Unindexed_Record.pdf", file=io.BytesIO(pdf_bytes))
    upload_res = asyncio.run(upload_document(file=up, db=test_db))
    doc_id = upload_res["document_id"]

    ver_res = verifier.verify_document(doc_id, db=test_db)
    assert ver_res["verification_status"] == "REFERENCE_NOT_FOUND"
    assert ver_res["reference_status"] == "NO_MATCHING_REFERENCE"
    assert ver_res["risk_score"] == 0
    assert ver_res["risk_level"] == "LOW"
    assert len(ver_res["record_inconsistencies"]) == 0

    risk_res = scorer.compute_risk_assessment(doc_id, db=test_db)
    assert risk_res["risk_score"] == 0
    assert risk_res["risk_level"] == "LOW"
    assert "Unindexed" in risk_res["status_summary"]


def test_suspicious_document_elevated_risk_score(test_db):
    """
    Scenario 3: Suspicious PDF (Survey 101/A, Fictional Test Owner, 12.50 acres)
    Assert: Score is 60, level is HIGH, breakdown includes:
      - OWNER_NAME_MISMATCH (+25 pts)
      - LAND_AREA_MISMATCH (+20 pts)
      - UNFOUND_SELLER_IN_HISTORY (+15 pts)
      Total = 60 pts
    """
    verifier = LandVerificationEngine()
    scorer = ExplainableRiskScoringEngine()

    sample_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "test_documents", "LandGuard_Synthetic_Suspicious_Test_Record.pdf"))
    with open(sample_pdf, "rb") as f:
        pdf_bytes = f.read()

    up = UploadFile(filename="LandGuard_Synthetic_Suspicious_Test_Record.pdf", file=io.BytesIO(pdf_bytes))
    upload_res = asyncio.run(upload_document(file=up, db=test_db))
    doc_id = upload_res["document_id"]

    ver_res = verifier.verify_document(doc_id, db=test_db)
    assert ver_res["verification_status"] == "SUSPICIOUS"
    assert ver_res["risk_score"] == 60
    assert ver_res["risk_level"] == "HIGH"

    risk_res = scorer.compute_risk_assessment(doc_id, db=test_db)
    assert risk_res["risk_score"] == 60
    assert risk_res["risk_level"] == "HIGH"
    assert risk_res["inconsistency_score"] == 60

    breakdown_map = {item["issue_type"]: item["points_added"] for item in risk_res["scoring_breakdown"]}
    assert breakdown_map.get("OWNER_NAME_MISMATCH") == 25
    assert breakdown_map.get("LAND_AREA_MISMATCH") == 20
    assert breakdown_map.get("UNFOUND_SELLER_IN_HISTORY") == 15
    assert sum(breakdown_map.values()) == 60


def test_repeated_uploads_state_isolation(test_db):
    """
    Scenario 4: Repeated uploads to verify strict state isolation.
    Sequential uploads must never leak scores or state:
    Suspicious (60) -> Normal (0) -> Suspicious (60) -> Unindexed (0)
    """
    verifier = LandVerificationEngine()
    scorer = ExplainableRiskScoringEngine()

    suspicious_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "test_documents", "LandGuard_Synthetic_Suspicious_Test_Record.pdf"))
    normal_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "LandGuard_Synthetic_Test_Land_Record.pdf"))
    unindexed_pdf = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "test_documents", "LandGuard_Synthetic_Test_Unindexed_Record.pdf"))

    # 1. Upload Suspicious
    with open(suspicious_pdf, "rb") as f:
        up1 = UploadFile(filename="LandGuard_Synthetic_Suspicious_Test_Record.pdf", file=io.BytesIO(f.read()))
    res1 = asyncio.run(upload_document(file=up1, db=test_db))
    risk1 = scorer.compute_risk_assessment(res1["document_id"], db=test_db)
    assert risk1["risk_score"] == 60
    assert risk1["risk_level"] == "HIGH"

    # 2. Upload Normal (Must be 0, no leakage from previous upload)
    with open(normal_pdf, "rb") as f:
        up2 = UploadFile(filename="LandGuard_Synthetic_Test_Land_Record.pdf", file=io.BytesIO(f.read()))
    res2 = asyncio.run(upload_document(file=up2, db=test_db))
    risk2 = scorer.compute_risk_assessment(res2["document_id"], db=test_db)
    assert risk2["risk_score"] == 0
    assert risk2["risk_level"] == "LOW"

    # 3. Upload Suspicious Again (Must be 60)
    with open(suspicious_pdf, "rb") as f:
        up3 = UploadFile(filename="LandGuard_Synthetic_Suspicious_Test_Record.pdf", file=io.BytesIO(f.read()))
    res3 = asyncio.run(upload_document(file=up3, db=test_db))
    risk3 = scorer.compute_risk_assessment(res3["document_id"], db=test_db)
    assert risk3["risk_score"] == 60
    assert risk3["risk_level"] == "HIGH"

    # 4. Upload Unindexed (Must be 0)
    with open(unindexed_pdf, "rb") as f:
        up4 = UploadFile(filename="LandGuard_Synthetic_Test_Unindexed_Record.pdf", file=io.BytesIO(f.read()))
    res4 = asyncio.run(upload_document(file=up4, db=test_db))
    risk4 = scorer.compute_risk_assessment(res4["document_id"], db=test_db)
    assert risk4["risk_score"] == 0
    assert risk4["risk_level"] == "LOW"

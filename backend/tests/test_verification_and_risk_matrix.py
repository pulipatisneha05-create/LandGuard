import pytest
import os
import sys
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import Base
from app.models import LandRecord, OwnershipHistory, DocumentRecord
from app.verification.engine import verification_engine
from app.risk_scoring.engine import risk_scoring_engine


@pytest.fixture(scope="module")
def test_db():
    """
    Creates an isolated in-memory SQLite database populated with standard
    synthetic reference records and test parcels.
    """
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSession()

    # Seed baseline records
    records = [
        LandRecord(
            record_id="REC-1001",
            owner_name="Anil Kumar Rao",
            survey_number="101/A",
            land_area_acres=2.50,
            village="Greenvalley",
            mandal="Serilingampally",
            district="Ranga Reddy",
            state="Telangana",
            registration_number="REG-2020-00101",
            registration_date=date(2020, 3, 15),
            document_type="Sale Deed"
        ),
        LandRecord(
            record_id="REC-1011",
            owner_name="Kiran Mazumdar",
            survey_number="402/B",
            land_area_acres=2.00,
            village="Riverside",
            mandal="Ibrahimpatnam",
            district="Ranga Reddy",
            state="Telangana",
            registration_number="REG-2023-01160",
            registration_date=date(2023, 4, 10),
            document_type="Sale Deed"
        ),
        # Duplicate registration records for 501/A
        LandRecord(
            record_id="REC-1012",
            owner_name="Lokesh Gupta",
            survey_number="501/A",
            land_area_acres=4.00,
            village="Forest Edge",
            mandal="Moinabad",
            district="Ranga Reddy",
            state="Telangana",
            registration_number="REG-2021-01270",
            registration_date=date(2021, 10, 15),
            document_type="Sale Deed"
        ),
        LandRecord(
            record_id="REC-1013",
            owner_name="Madhav Singh",
            survey_number="501/A",
            land_area_acres=4.00,
            village="Forest Edge",
            mandal="Moinabad",
            district="Ranga Reddy",
            state="Telangana",
            registration_number="REG-2023-01380",
            registration_date=date(2023, 11, 20),
            document_type="Sale Deed"
        ),
        # Synthetic Test Record SY-TEST-104/2
        LandRecord(
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
    ]
    db.add_all(records)

    histories = [
        OwnershipHistory(
            history_id="HIST-001",
            survey_number="101/A",
            owner_name="Ramakrishna Rao",
            transfer_date=date(1995, 4, 10),
            transfer_type="Original Grant"
        ),
        OwnershipHistory(
            history_id="HIST-002",
            survey_number="101/A",
            owner_name="Anil Kumar Rao",
            transfer_date=date(2020, 3, 15),
            transfer_type="Sale Deed"
        ),
        OwnershipHistory(
            history_id="HIST-TEST-1042-1",
            survey_number="SY-TEST-104/2",
            owner_name="Ram Kumar",
            transfer_date=date(2015, 6, 10),
            transfer_type="Original Grant"
        ),
        OwnershipHistory(
            history_id="HIST-TEST-1042-2",
            survey_number="SY-TEST-104/2",
            owner_name="Arun Kumar",
            transfer_date=date(2026, 9, 15),
            transfer_type="Sale Deed"
        )
    ]
    db.add_all(histories)
    db.commit()

    yield db
    db.close()


def _insert_test_doc(
    db,
    doc_id: str,
    owner_name: str,
    survey_number: str,
    area_num: float,
    area_raw: str,
    area_unit: str = "Acres",
    norm_acres: float = None,
    text: str = ""
):
    if norm_acres is None:
        norm_acres = area_num
    doc = DocumentRecord(
        document_id=doc_id,
        filename=f"{doc_id}.pdf",
        file_path=f"uploads/{doc_id}.pdf",
        file_type="application/pdf",
        file_size_bytes=1024,
        ocr_status="COMPLETED",
        extracted_text=text or f"Deed for Survey {survey_number} owner {owner_name} area {area_raw}",
        extracted_owner_name=owner_name,
        extracted_survey_number=survey_number,
        extracted_land_area=norm_acres,
        extracted_land_area_raw=area_raw,
        extracted_land_area_unit=area_unit,
        extracted_land_area_normalized_acres=norm_acres
    )
    db.merge(doc)
    db.commit()
    return doc


def test_scenario_a_normal_document_matching_reference(test_db):
    """
    Scenario (a): Normal document with matching reference.
    SY-TEST-104/2 matches owner Arun Kumar, land area 240 sq yards (~0.0496 acres),
    and location Green Valley.
    Status must be VERIFIED, risk score 0, with zero record inconsistencies.
    """
    _insert_test_doc(
        db=test_db,
        doc_id="DOC-TEST-NORMAL-001",
        owner_name="Arun Kumar",
        survey_number="SY-TEST-104/2",
        area_num=240.0,
        area_raw="240 square yards",
        area_unit="square yards",
        norm_acres=0.0496,
        text="Registered Sale Deed for Survey SY-TEST-104/2 by Arun Kumar 240 square yards at Green Valley, Demo District."
    )

    res = verification_engine.verify_extracted_attributes(
        owner_name="Arun Kumar",
        survey_number="SY-TEST-104/2",
        land_area=240.0,
        land_area_unit="square yards",
        land_area_raw="240 square yards",
        doc_village="Green Valley",
        doc_mandal="Demo Mandal",
        doc_district="Demo District",
        document_id="DOC-TEST-NORMAL-001",
        db=test_db
    )

    assert res["verification_status"] == "VERIFIED"
    assert res["verification_outcome"] == "VERIFIED_MATCH"
    assert res["field_matches"]["owner_match"] is True
    assert res["field_matches"]["survey_number_match"] is True
    assert res["field_matches"]["land_area_match"] is True
    assert res["field_matches"]["spatial_match"] is True
    assert len(res["record_inconsistencies"]) == 0

    # Risk Assessment
    risk_assessment = risk_scoring_engine.compute_risk_assessment("DOC-TEST-NORMAL-001", test_db)
    assert risk_assessment["risk_score"] == 0
    assert risk_assessment["risk_level"] == "LOW"
    assert risk_assessment["verification_status"] == "VERIFIED"
    assert "No major inconsistency detected" in risk_assessment["recommendation"]
    assert len(risk_assessment["record_inconsistencies"]) == 0


def test_scenario_b_document_no_matching_reference(test_db):
    """
    Scenario (b): Document with no matching reference record.
    Survey SY-UNINDEXED-999 is not in the database.
    Status must be REFERENCE_NOT_FOUND, not labeled as fraud or invalid title.
    Risk score must be 0 points, with explicit distinction from VERIFIED status.
    """
    _insert_test_doc(
        db=test_db,
        doc_id="DOC-TEST-UNINDEXED-001",
        owner_name="Praveen Reddy",
        survey_number="SY-UNINDEXED-999",
        area_num=1.5,
        area_raw="1.50 Acres",
        area_unit="Acres",
        norm_acres=1.5,
        text="Sale Deed for Survey SY-UNINDEXED-999 by Praveen Reddy"
    )

    res = verification_engine.verify_extracted_attributes(
        owner_name="Praveen Reddy",
        survey_number="SY-UNINDEXED-999",
        land_area=1.5,
        land_area_unit="Acres",
        land_area_raw="1.50 Acres",
        doc_village="Northridge",
        doc_district="Demo District",
        document_id="DOC-TEST-UNINDEXED-001",
        db=test_db
    )

    assert res["verification_status"] == "REFERENCE_NOT_FOUND"
    assert res["verification_outcome"] == "REFERENCE_NOT_FOUND"
    assert res["reference_status"] == "NO_MATCHING_REFERENCE"
    assert len(res["record_inconsistencies"]) == 0  # Missing reference is NOT a record inconsistency
    assert len(res["reference_notices"]) > 0

    risk_assessment = risk_scoring_engine.compute_risk_assessment("DOC-TEST-UNINDEXED-001", test_db)
    # Zero penalty points for unindexed reference
    assert risk_assessment["risk_score"] == 0
    assert risk_assessment["inconsistency_score"] == 0
    assert risk_assessment["verification_status"] == "REFERENCE_NOT_FOUND"
    assert "Unindexed parcel in demonstration registry" in risk_assessment["recommendation"]
    # Explanatory status summary distinguishes 0 score from verified
    assert "Unindexed in Reference Registry" in risk_assessment["status_summary"]
    assert "Not Verified" in risk_assessment["status_summary"]


def test_scenario_c_genuinely_suspicious_document_with_anomalies(test_db):
    """
    Scenario (c): Genuinely suspicious synthetic documents with evidence-supported anomalies.
    1. Owner mismatch & seller absent from title chain (+25 + 15 pts)
    2. Land area discrepancy (+20 pts)
    3. Duplicate registration flag (+30 pts)
    """
    # 1. Owner Mismatch on 101/A (registered to Anil Kumar Rao)
    _insert_test_doc(
        db=test_db,
        doc_id="DOC-TEST-FRAUD-001",
        owner_name="Forged Impersonator",
        survey_number="101/A",
        area_num=2.50,
        area_raw="2.50 Acres",
        area_unit="Acres",
        text="Deed for 101/A by Forged Impersonator"
    )

    res_owner_mismatch = verification_engine.verify_extracted_attributes(
        owner_name="Forged Impersonator",
        survey_number="101/A",
        land_area=2.50,
        land_area_unit="Acres",
        document_id="DOC-TEST-FRAUD-001",
        db=test_db
    )
    assert res_owner_mismatch["verification_status"] == "SUSPICIOUS"
    assert res_owner_mismatch["field_matches"]["owner_match"] is False
    inconsistencies = [a["type"] for a in res_owner_mismatch["record_inconsistencies"]]
    assert "OWNER_NAME_MISMATCH" in inconsistencies
    assert "UNFOUND_SELLER_IN_HISTORY" in inconsistencies

    risk_owner = risk_scoring_engine.compute_risk_assessment("DOC-TEST-FRAUD-001", test_db)
    assert risk_owner["risk_score"] >= 40
    assert risk_owner["risk_level"] in ["MEDIUM", "HIGH", "CRITICAL"]
    reasons = [item.get("reason_for_points") for item in risk_owner["record_inconsistencies"]]
    assert any("Document executant differs" in r for r in reasons if r)

    # 2. Area Discrepancy on 101/A (claiming 25 Acres instead of registered 2.50 Acres)
    res_area_mismatch = verification_engine.verify_extracted_attributes(
        owner_name="Anil Kumar Rao",
        survey_number="101/A",
        land_area=25.0,
        land_area_unit="Acres",
        document_id="DOC-TEST-AREA-001",
        db=test_db
    )
    assert res_area_mismatch["verification_status"] == "SUSPICIOUS"
    assert res_area_mismatch["field_matches"]["land_area_match"] is False
    area_inconsistencies = [a["type"] for a in res_area_mismatch["record_inconsistencies"]]
    assert "LAND_AREA_MISMATCH" in area_inconsistencies

    # 3. Duplicate Registration Flag on 501/A (has two active records)
    res_duplicate = verification_engine.verify_extracted_attributes(
        owner_name="Lokesh Gupta",
        survey_number="501/A",
        land_area=4.0,
        land_area_unit="Acres",
        document_id="DOC-TEST-DUP-001",
        db=test_db
    )
    assert res_duplicate["verification_status"] == "SUSPICIOUS"
    dup_inconsistencies = [a["type"] for a in res_duplicate["record_inconsistencies"]]
    assert "DUPLICATE_REGISTRATION_FLAGGED" in dup_inconsistencies


def test_scenario_d_deterministic_consistency_across_repeated_runs(test_db):
    """
    Scenario (d): Determinism.
    Running risk scoring multiple times for the exact same document
    must produce identical scores, levels, and breakdown structures every time.
    """
    _insert_test_doc(
        db=test_db,
        doc_id="DOC-TEST-REPEAT-001",
        owner_name="Arun Kumar",
        survey_number="SY-TEST-104/2",
        area_num=240.0,
        area_raw="240 square yards",
        area_unit="square yards",
        norm_acres=0.0496,
        text="Document for SY-TEST-104/2 by Arun Kumar 240 square yards at Green Valley"
    )

    runs = [risk_scoring_engine.compute_risk_assessment("DOC-TEST-REPEAT-001", test_db) for _ in range(5)]

    first_score = runs[0]["risk_score"]
    first_level = runs[0]["risk_level"]
    first_status = runs[0]["verification_status"]
    first_breakdown_len = len(runs[0]["scoring_breakdown"])

    for r in runs[1:]:
        assert r["risk_score"] == first_score
        assert r["risk_level"] == first_level
        assert r["verification_status"] == first_status
        assert len(r["scoring_breakdown"]) == first_breakdown_len


def test_scenario_e_multiple_uploads_isolation_no_data_leakage(test_db):
    """
    Scenario (e): Multiple uploads isolation.
    Sequential uploads must not leak state, records, or scores to subsequent uploads.
    """
    _insert_test_doc(
        db=test_db,
        doc_id="DOC-ISO-A",
        owner_name="Arun Kumar",
        survey_number="SY-TEST-104/2",
        area_num=240.0,
        area_raw="240 square yards",
        area_unit="square yards",
        norm_acres=0.0496,
        text="Valid deed for SY-TEST-104/2 Arun Kumar at Green Valley"
    )
    _insert_test_doc(
        db=test_db,
        doc_id="DOC-ISO-B",
        owner_name="Forged Impersonator",
        survey_number="101/A",
        area_num=25.0,
        area_raw="25.0 Acres",
        area_unit="Acres",
        norm_acres=25.0,
        text="Suspicious deed for 101/A Forged Impersonator"
    )

    score_a = risk_scoring_engine.compute_risk_assessment("DOC-ISO-A", test_db)
    score_b = risk_scoring_engine.compute_risk_assessment("DOC-ISO-B", test_db)

    assert score_a["document_id"] == "DOC-ISO-A"
    assert score_a["risk_score"] == 0
    assert score_a["verification_status"] == "VERIFIED"

    assert score_b["document_id"] == "DOC-ISO-B"
    assert score_b["risk_score"] > 30
    assert score_b["verification_status"] == "SUSPICIOUS"

    # Re-verify doc A to ensure doc B did not contaminate state
    score_a_retest = risk_scoring_engine.compute_risk_assessment("DOC-ISO-A", test_db)
    assert score_a_retest["risk_score"] == 0
    assert score_a_retest["verification_status"] == "VERIFIED"
    assert score_a_retest["matched_land_record"]["owner_name"] == "Arun Kumar"

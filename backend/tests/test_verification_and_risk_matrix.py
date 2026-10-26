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
from app.ocr.processor import process_document_ocr
from app.nlp.extractor import nlp_engine


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
            owner_name="Rajesh Kumar Sharma",
            survey_number="402/B",
            land_area_acres=2.45,
            village="Gachibowli",
            mandal="Serilingampally",
            district="Ranga Reddy",
            state="Telangana",
            registration_number="DOC-2026-8901",
            registration_date=date(2023, 5, 14),
            document_type="Sale Deed"
        ),
        LandRecord(
            record_id="REC-118A",
            owner_name="Venkat Swamy Goud",
            survey_number="118/A",
            land_area_acres=0.50,
            village="Gachibowli",
            mandal="Serilingampally",
            district="Ranga Reddy",
            state="Telangana",
            registration_number="DOC-ROR-2024-118A",
            registration_date=date(2024, 5, 12),
            document_type="Patta Passbook"
        ),
        LandRecord(
            record_id="REC-304C",
            owner_name="Anuradha Rao",
            survey_number="304/C",
            land_area_acres=3.50,
            village="Kondapur",
            mandal="Serilingampally",
            district="Ranga Reddy",
            state="Telangana",
            registration_number="EC-2026-8812",
            registration_date=date(2026, 10, 15),
            document_type="Encumbrance Certificate"
        ),
        LandRecord(
            record_id="SYN-REC-001",
            owner_name="Kalyan Varma Dantuluri",
            survey_number="SYN-101/A",
            land_area_acres=2.20,
            village="Narsingi",
            mandal="Gandipet",
            district="Ranga Reddy",
            state="Telangana",
            registration_number="SYN-REG-2016-1001",
            registration_date=date(2017, 2, 2),
            document_type="Gift Deed"
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
        ),
        OwnershipHistory(
            history_id="HIST-011",
            survey_number="402/B",
            owner_name="Subhash Sharma",
            transfer_date=date(2005, 7, 14),
            transfer_type="Original Grant"
        ),
        OwnershipHistory(
            history_id="HIST-012",
            survey_number="402/B",
            owner_name="Rajesh Kumar Sharma",
            transfer_date=date(2023, 5, 14),
            transfer_type="Sale Deed"
        ),
        OwnershipHistory(
            history_id="HIST-118A-1",
            survey_number="118/A",
            owner_name="Mallaiah Goud",
            transfer_date=date(1998, 4, 10),
            transfer_type="Original Grant"
        ),
        OwnershipHistory(
            history_id="HIST-118A-2",
            survey_number="118/A",
            owner_name="Venkat Swamy Goud",
            transfer_date=date(2024, 5, 12),
            transfer_type="Patta Passbook"
        ),
        OwnershipHistory(
            history_id="HIST-304C-1",
            survey_number="304/C",
            owner_name="K. S. Rao",
            transfer_date=date(2010, 1, 5),
            transfer_type="Original Grant"
        ),
        OwnershipHistory(
            history_id="HIST-304C-2",
            survey_number="304/C",
            owner_name="Anuradha Rao",
            transfer_date=date(2026, 10, 15),
            transfer_type="Sale Deed"
        ),
        OwnershipHistory(
            history_id="SYN-HIST-001",
            survey_number="SYN-101/A",
            owner_name="Dantuluri Narayana Rao",
            transfer_date=date(1996, 2, 2),
            transfer_type="Ancestral Partition"
        ),
        OwnershipHistory(
            history_id="SYN-HIST-002",
            survey_number="SYN-101/A",
            owner_name="Kalyan Varma Dantuluri",
            transfer_date=date(2017, 2, 2),
            transfer_type="Gift Deed"
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


def test_unindexed_synthetic_pdf_file_pipeline(test_db):
    """
    Direct end-to-end pipeline test on the actual synthetic PDF file:
    test_documents/LandGuard_Synthetic_Test_Unindexed_Record.pdf.
    Verifies that OCR extracts the text, NLP extracts Praveen Reddy and SY-UNINDEXED-999,
    and verification flags REFERENCE_NOT_FOUND with 0 penalty risk points.
    """
    pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "test_documents", "LandGuard_Synthetic_Test_Unindexed_Record.pdf"))
    assert os.path.exists(pdf_path), f"Sample unindexed synthetic PDF missing at {pdf_path}"

    # 1. OCR Extraction
    ocr_res = process_document_ocr(pdf_path)
    assert ocr_res["status"] == "COMPLETED"
    assert ocr_res["engine"] == "LandGuard Digital PDF Engine"
    assert ocr_res["confidence"] >= 90.0

    raw_text = ocr_res["text"]
    assert "Praveen Reddy" in raw_text
    assert "SY-UNINDEXED-999" in raw_text
    assert "1.50 acres" in raw_text
    assert "Demo Village" in raw_text
    assert "Demo District" in raw_text
    assert "SYNTHETIC TEST DOCUMENT — NOT A REAL LAND RECORD" in raw_text

    # 2. NLP Information Extraction
    nlp_res = nlp_engine.extract_information(raw_text)
    fields = nlp_res["extracted_fields"]
    assert fields.get("owner_name") == "Praveen Reddy"
    assert fields.get("survey_number") == "SY-UNINDEXED-999"
    assert fields.get("land_area_raw") == "1.50 acres"
    assert fields.get("land_area_unit") == "acres"
    assert fields.get("land_area_numeric") == 1.5
    assert fields.get("village") == "Demo Village"
    assert fields.get("district") == "Demo District"

    # 3. Verification Engine
    ver_res = verification_engine.verify_extracted_attributes(
        owner_name=fields.get("owner_name"),
        survey_number=fields.get("survey_number"),
        land_area=fields.get("land_area_numeric"),
        land_area_unit=fields.get("land_area_unit"),
        land_area_raw=fields.get("land_area_raw"),
        doc_village=fields.get("village"),
        doc_district=fields.get("district"),
        document_id="DOC-TEST-FILE-UNINDEXED-001",
        db=test_db
    )
    assert ver_res["verification_status"] == "REFERENCE_NOT_FOUND"
    assert ver_res["verification_outcome"] == "REFERENCE_NOT_FOUND"
    assert ver_res["reference_status"] == "NO_MATCHING_REFERENCE"
    assert len(ver_res["record_inconsistencies"]) == 0
    assert len(ver_res["reference_notices"]) > 0

    # 4. Ingest and Test Risk Assessment
    _insert_test_doc(
        db=test_db,
        doc_id="DOC-TEST-FILE-UNINDEXED-001",
        owner_name=fields.get("owner_name"),
        survey_number=fields.get("survey_number"),
        area_num=fields.get("land_area_numeric"),
        area_raw=fields.get("land_area_raw"),
        area_unit=fields.get("land_area_unit"),
        norm_acres=fields.get("land_area_acres"),
        text=raw_text
    )

    risk_res = risk_scoring_engine.compute_risk_assessment("DOC-TEST-FILE-UNINDEXED-001", test_db)
    assert risk_res["risk_score"] == 0
    assert risk_res["risk_level"] == "LOW"
    assert risk_res["verification_status"] == "REFERENCE_NOT_FOUND"
    assert "Unindexed in Reference Registry" in risk_res["status_summary"]
    assert "Unindexed parcel in demonstration registry" in risk_res["recommendation"]


def test_suspicious_synthetic_pdf_file_pipeline(test_db):
    """
    Direct end-to-end pipeline test on the suspicious synthetic PDF file:
    test_documents/LandGuard_Synthetic_Suspicious_Test_Record.pdf.
    Verifies that OCR extracts the text, NLP extracts Fictional Test Owner and 101/A with 12.50 acres,
    and verification flags SUSPICIOUS with OWNER_NAME_MISMATCH (+25), LAND_AREA_MISMATCH (+20),
    and UNFOUND_SELLER_IN_HISTORY (+15), totaling a risk score of 60 (HIGH).
    """
    pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "test_documents", "LandGuard_Synthetic_Suspicious_Test_Record.pdf"))
    assert os.path.exists(pdf_path), f"Sample suspicious synthetic PDF missing at {pdf_path}"

    # 1. OCR Extraction
    ocr_res = process_document_ocr(pdf_path)
    assert ocr_res["status"] == "COMPLETED"
    assert ocr_res["engine"] == "LandGuard Digital PDF Engine"
    assert ocr_res["confidence"] >= 90.0

    raw_text = ocr_res["text"]
    assert "Fictional Test Owner" in raw_text
    assert "101/A" in raw_text
    assert "12.50 acres" in raw_text
    assert "Greenvalley" in raw_text
    assert "Ranga Reddy" in raw_text
    assert "SYNTHETIC TEST DOCUMENT — NOT A REAL LAND RECORD" in raw_text

    # 2. NLP Extraction
    nlp_res = nlp_engine.extract_information(raw_text)
    fields = nlp_res["extracted_fields"]
    assert fields.get("owner_name") == "Fictional Test Owner"
    assert fields.get("survey_number") == "101/A"
    assert fields.get("land_area_raw") == "12.50 acres"
    assert fields.get("land_area_numeric") == 12.5
    assert fields.get("village") == "Greenvalley"

    # 3. Verification Engine
    ver_res = verification_engine.verify_extracted_attributes(
        owner_name=fields.get("owner_name"),
        survey_number=fields.get("survey_number"),
        land_area=fields.get("land_area_numeric"),
        land_area_unit=fields.get("land_area_unit"),
        land_area_raw=fields.get("land_area_raw"),
        doc_village=fields.get("village"),
        doc_district=fields.get("district"),
        document_id="DOC-TEST-FILE-SUSPICIOUS-001",
        db=test_db
    )

    assert ver_res["verification_status"] == "SUSPICIOUS"
    assert ver_res["verification_outcome"] == "MISMATCH"
    assert ver_res["reference_status"] == "MATCHED"
    assert ver_res["matched_record_id"] == "REC-1001"
    assert ver_res["field_matches"]["owner_match"] is False
    assert ver_res["field_matches"]["land_area_match"] is False
    assert ver_res["field_matches"]["survey_number_match"] is True

    inc_types = [inc["type"] for inc in ver_res["record_inconsistencies"]]
    assert "OWNER_NAME_MISMATCH" in inc_types
    assert "LAND_AREA_MISMATCH" in inc_types
    assert "UNFOUND_SELLER_IN_HISTORY" in inc_types

    # 4. Ingest and Test Risk Assessment
    _insert_test_doc(
        db=test_db,
        doc_id="DOC-TEST-FILE-SUSPICIOUS-001",
        owner_name=fields.get("owner_name"),
        survey_number=fields.get("survey_number"),
        area_num=fields.get("land_area_numeric"),
        area_raw=fields.get("land_area_raw"),
        area_unit=fields.get("land_area_unit"),
        norm_acres=fields.get("land_area_acres"),
        text=raw_text
    )

    risk_res = risk_scoring_engine.compute_risk_assessment("DOC-TEST-FILE-SUSPICIOUS-001", test_db)
    assert risk_res["risk_score"] == 60
    assert risk_res["risk_level"] == "HIGH"
    assert risk_res["verification_status"] == "SUSPICIOUS"
    assert risk_res["inconsistency_score"] == 60
    assert "Flagged with Record Inconsistencies" in risk_res["status_summary"]
    assert "Further verification required" in risk_res["recommendation"]


def test_712_extract_synthetic_pdf_file_pipeline(test_db):
    """
    Direct end-to-end pipeline test on the Patta Passbook / RoR 1-B synthetic PDF:
    sample_data/7_12_Extract_Survey_118.pdf.
    Verifies that OCR extracts the text, NLP extracts Venkat Swamy Goud and 118/A with 20 Guntas (0.50 acres),
    and verification flags VERIFIED (0 risk).
    """
    pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "7_12_Extract_Survey_118.pdf"))
    assert os.path.exists(pdf_path), f"7_12 sample PDF missing at {pdf_path}"

    ocr_res = process_document_ocr(pdf_path)
    assert ocr_res["status"] == "COMPLETED"
    raw_text = ocr_res["text"]
    assert "Venkat Swamy Goud" in raw_text
    assert "118/A" in raw_text
    assert "20 Guntas" in raw_text

    nlp_res = nlp_engine.extract_information(raw_text)
    fields = nlp_res["extracted_fields"]
    assert fields.get("owner_name") == "Venkat Swamy Goud"
    assert fields.get("survey_number") == "118/A"
    assert fields.get("land_area_unit").lower() in ["guntas", "guntha"]
    assert pytest.approx(fields.get("land_area_acres"), 0.01) == 0.50

    ver_res = verification_engine.verify_extracted_attributes(
        owner_name=fields.get("owner_name"),
        survey_number=fields.get("survey_number"),
        land_area=fields.get("land_area_numeric"),
        land_area_unit=fields.get("land_area_unit"),
        land_area_raw=fields.get("land_area_raw"),
        doc_village=fields.get("village"),
        doc_district=fields.get("district"),
        document_id="DOC-TEST-712-001",
        db=test_db
    )
    assert ver_res["verification_status"] == "VERIFIED"
    assert ver_res["verification_outcome"] == "VERIFIED_MATCH"
    assert ver_res["reference_status"] == "MATCHED"
    assert ver_res["matched_record_id"] == "REC-118A"

    _insert_test_doc(
        db=test_db,
        doc_id="DOC-TEST-712-001",
        owner_name=fields.get("owner_name"),
        survey_number=fields.get("survey_number"),
        area_num=fields.get("land_area_numeric"),
        area_raw=fields.get("land_area_raw"),
        area_unit=fields.get("land_area_unit"),
        norm_acres=fields.get("land_area_acres"),
        text=raw_text
    )

    risk_res = risk_scoring_engine.compute_risk_assessment("DOC-TEST-712-001", test_db)
    assert risk_res["risk_score"] == 0
    assert risk_res["risk_level"] == "LOW"
    assert risk_res["verification_status"] == "VERIFIED"


def test_encumbrance_certificate_synthetic_pdf_file_pipeline(test_db):
    """
    Direct end-to-end pipeline test on Encumbrance Certificate synthetic PDF:
    sample_data/Encumbrance_Certificate_304C.pdf.
    Verifies that OCR extracts the text, NLP extracts Anuradha Rao and 304/C with 3.50 Acres,
    and verification flags VERIFIED (0 risk).
    """
    pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "Encumbrance_Certificate_304C.pdf"))
    assert os.path.exists(pdf_path), f"EC sample PDF missing at {pdf_path}"

    ocr_res = process_document_ocr(pdf_path)
    assert ocr_res["status"] == "COMPLETED"
    raw_text = ocr_res["text"]
    assert "Anuradha Rao" in raw_text
    assert "304/C" in raw_text
    assert "3.50 Acres" in raw_text

    nlp_res = nlp_engine.extract_information(raw_text)
    fields = nlp_res["extracted_fields"]
    assert fields.get("owner_name") == "Anuradha Rao"
    assert fields.get("survey_number") == "304/C"
    assert pytest.approx(fields.get("land_area_acres"), 0.01) == 3.50

    ver_res = verification_engine.verify_extracted_attributes(
        owner_name=fields.get("owner_name"),
        survey_number=fields.get("survey_number"),
        land_area=fields.get("land_area_numeric"),
        land_area_unit=fields.get("land_area_unit"),
        land_area_raw=fields.get("land_area_raw"),
        doc_village=fields.get("village"),
        doc_district=fields.get("district"),
        document_id="DOC-TEST-EC-001",
        db=test_db
    )
    assert ver_res["verification_status"] == "VERIFIED"
    assert ver_res["verification_outcome"] == "VERIFIED_MATCH"
    assert ver_res["reference_status"] == "MATCHED"
    assert ver_res["matched_record_id"] == "REC-304C"

    _insert_test_doc(
        db=test_db,
        doc_id="DOC-TEST-EC-001",
        owner_name=fields.get("owner_name"),
        survey_number=fields.get("survey_number"),
        area_num=fields.get("land_area_numeric"),
        area_raw=fields.get("land_area_raw"),
        area_unit=fields.get("land_area_unit"),
        norm_acres=fields.get("land_area_acres"),
        text=raw_text
    )

    risk_res = risk_scoring_engine.compute_risk_assessment("DOC-TEST-EC-001", test_db)
    assert risk_res["risk_score"] == 0
    assert risk_res["risk_level"] == "LOW"
    assert risk_res["verification_status"] == "VERIFIED"


def test_sample_deed_image_pipeline(test_db):
    """
    Direct end-to-end pipeline test on scanned deed image:
    sample_data/sample_deed.png.
    Verifies that OCR extracts the text, NLP extracts Rajesh Kumar Sharma and 402/B with 2.45 Acres,
    and verification flags VERIFIED (0 risk).
    """
    img_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "sample_deed.png"))
    assert os.path.exists(img_path), f"sample_deed.png missing at {img_path}"

    ocr_res = process_document_ocr(img_path)
    assert ocr_res["status"] == "COMPLETED"
    raw_text = ocr_res["text"]

    nlp_res = nlp_engine.extract_information(raw_text)
    fields = nlp_res["extracted_fields"]
    assert fields.get("owner_name") == "Rajesh Kumar Sharma"
    assert fields.get("survey_number") == "402/B"
    assert pytest.approx(fields.get("land_area_acres"), 0.01) == 2.45

    ver_res = verification_engine.verify_extracted_attributes(
        owner_name=fields.get("owner_name"),
        survey_number=fields.get("survey_number"),
        land_area=fields.get("land_area_numeric"),
        land_area_unit=fields.get("land_area_unit"),
        land_area_raw=fields.get("land_area_raw"),
        doc_village=fields.get("village"),
        doc_district=fields.get("district"),
        document_id="DOC-TEST-SAMPLE-DEED-001",
        db=test_db
    )
    assert ver_res["verification_status"] == "VERIFIED"
    assert ver_res["verification_outcome"] == "VERIFIED_MATCH"
    assert ver_res["reference_status"] == "MATCHED"
    assert ver_res["matched_record_id"] == "REC-1011"

    _insert_test_doc(
        db=test_db,
        doc_id="DOC-TEST-SAMPLE-DEED-001",
        owner_name=fields.get("owner_name"),
        survey_number=fields.get("survey_number"),
        area_num=fields.get("land_area_numeric"),
        area_raw=fields.get("land_area_raw"),
        area_unit=fields.get("land_area_unit"),
        norm_acres=fields.get("land_area_acres"),
        text=raw_text
    )

    risk_res = risk_scoring_engine.compute_risk_assessment("DOC-TEST-SAMPLE-DEED-001", test_db)
    assert risk_res["risk_score"] == 0
    assert risk_res["risk_level"] == "LOW"
    assert risk_res["verification_status"] == "VERIFIED"


def test_all_selected_demo_samples_end_to_end(test_db):
    """
    Comprehensive regression test verifying that all demo documents
    process without unhandled exceptions or 500 errors, producing their
    exact expected classification outcome.
    """
    demo_samples = [
        ("LandGuard_Synthetic_Test_Land_Record.pdf", "sample_data", "VERIFIED", 0, "LOW"),
        ("7_12_Extract_Survey_118.pdf", "sample_data", "VERIFIED", 0, "LOW"),
        ("Encumbrance_Certificate_304C.pdf", "sample_data", "VERIFIED", 0, "LOW"),
        ("sample_deed.png", "sample_data", "VERIFIED", 0, "LOW"),
        ("LandGuard_Synthetic_Suspicious_Test_Record.pdf", "test_documents", "SUSPICIOUS", 60, "HIGH"),
        ("LandGuard_Synthetic_Test_Unindexed_Record.pdf", "test_documents", "REFERENCE_NOT_FOUND", 0, "LOW"),
    ]

    for fname, folder, expected_status, expected_risk, expected_risk_level in demo_samples:
        fpath = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", folder, fname))
        assert os.path.exists(fpath), f"Demo sample {fname} not found at {fpath}"

        ocr_res = process_document_ocr(fpath)
        assert ocr_res["status"] == "COMPLETED"
        assert len(ocr_res["text"]) > 20

        nlp_res = nlp_engine.extract_information(ocr_res["text"])
        fields = nlp_res["extracted_fields"]

        ver_res = verification_engine.verify_extracted_attributes(
            owner_name=fields.get("owner_name"),
            survey_number=fields.get("survey_number"),
            land_area=fields.get("land_area_numeric"),
            land_area_unit=fields.get("land_area_unit"),
            land_area_raw=fields.get("land_area_raw"),
            doc_village=fields.get("village"),
            doc_district=fields.get("district"),
            document_id=f"DOC-REGRESS-{fname}",
            db=test_db
        )

        assert ver_res["verification_status"] == expected_status, (
            f"Expected {expected_status} for {fname}, but got {ver_res['verification_status']}"
        )

        _insert_test_doc(
            db=test_db,
            doc_id=f"DOC-REGRESS-{fname}",
            owner_name=fields.get("owner_name"),
            survey_number=fields.get("survey_number"),
            area_num=fields.get("land_area_numeric"),
            area_raw=fields.get("land_area_raw"),
            area_unit=fields.get("land_area_unit"),
            norm_acres=fields.get("land_area_acres"),
            text=ocr_res["text"]
        )

        risk_res = risk_scoring_engine.compute_risk_assessment(f"DOC-REGRESS-{fname}", test_db)
        assert risk_res["risk_score"] == expected_risk, (
            f"Expected risk {expected_risk} for {fname}, got {risk_res['risk_score']}"
        )
        assert risk_res["risk_level"] == expected_risk_level




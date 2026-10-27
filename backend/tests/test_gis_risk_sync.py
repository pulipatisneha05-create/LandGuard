import os
import sys
import pytest
from sqlalchemy.orm import Session

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, init_db
from app.models import DocumentRecord, VerificationResult, RiskAssessment, LandRecord
from app.gis.spatial_engine import gis_spatial_engine


@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    try:
        # Ensure test reference records exist
        ref_101a = db.query(LandRecord).filter(LandRecord.survey_number == "101/A").first()
        if not ref_101a:
            ref_101a = LandRecord(
                survey_number="101/A",
                owner_name="Anil Kumar Rao",
                land_area_acres=2.50,
                village="Greenvalley",
                mandal="Serilingampally",
                district="Ranga Reddy",
                state="Telangana",
                status="Active"
            )
            db.add(ref_101a)

        ref_104 = db.query(LandRecord).filter(LandRecord.survey_number == "SY-TEST-104/2").first()
        if not ref_104:
            ref_104 = LandRecord(
                survey_number="SY-TEST-104/2",
                owner_name="Arun Kumar",
                land_area_acres=0.0496,
                village="Green Valley",
                mandal="Demo Mandal",
                district="Demo District",
                state="Telangana",
                status="Active"
            )
            db.add(ref_104)

        # 1. Normal document test fixture
        doc_normal = db.query(DocumentRecord).filter(DocumentRecord.document_id == "DOC-GIS-TEST-NORMAL").first()
        if not doc_normal:
            doc_normal = DocumentRecord(
                document_id="DOC-GIS-TEST-NORMAL",
                filename="Normal_Record.pdf",
                extracted_owner_name="Arun Kumar",
                extracted_survey_number="SY-TEST-104/2",
                extracted_land_area=0.0496,
                extracted_location="Green Valley, Demo District"
            )
            db.add(doc_normal)

        ver_normal = db.query(VerificationResult).filter(VerificationResult.verification_id == "VER-GIS-TEST-NORMAL").first()
        if not ver_normal:
            ver_normal = VerificationResult(
                verification_id="VER-GIS-TEST-NORMAL",
                document_id="DOC-GIS-TEST-NORMAL",
                verification_status="VERIFIED",
                is_valid=True,
                anomaly_count=0
            )
            db.add(ver_normal)

        risk_normal = db.query(RiskAssessment).filter(RiskAssessment.assessment_id == "RISK-GIS-TEST-NORMAL").first()
        if not risk_normal:
            risk_normal = RiskAssessment(
                assessment_id="RISK-GIS-TEST-NORMAL",
                verification_id="VER-GIS-TEST-NORMAL",
                risk_score=0,
                risk_level="LOW",
                scoring_breakdown=[]
            )
            db.add(risk_normal)

        # 2. Suspicious document test fixture (Survey 101/A, score 60, HIGH)
        doc_suspicious = db.query(DocumentRecord).filter(DocumentRecord.document_id == "DOC-GIS-TEST-SUSPICIOUS").first()
        if not doc_suspicious:
            doc_suspicious = DocumentRecord(
                document_id="DOC-GIS-TEST-SUSPICIOUS",
                filename="Suspicious_101A.pdf",
                extracted_owner_name="Fictional Test Owner",
                extracted_survey_number="101/A",
                extracted_land_area=12.50,
                extracted_location="Greenvalley, Ranga Reddy"
            )
            db.add(doc_suspicious)

        ver_suspicious = db.query(VerificationResult).filter(VerificationResult.verification_id == "VER-GIS-TEST-SUSPICIOUS").first()
        if not ver_suspicious:
            ver_suspicious = VerificationResult(
                verification_id="VER-GIS-TEST-SUSPICIOUS",
                document_id="DOC-GIS-TEST-SUSPICIOUS",
                verification_status="FLAGGED",
                is_valid=False,
                anomaly_count=2
            )
            db.add(ver_suspicious)

        risk_suspicious = db.query(RiskAssessment).filter(RiskAssessment.assessment_id == "RISK-GIS-TEST-SUSPICIOUS").first()
        if not risk_suspicious:
            risk_suspicious = RiskAssessment(
                assessment_id="RISK-GIS-TEST-SUSPICIOUS",
                verification_id="VER-GIS-TEST-SUSPICIOUS",
                risk_score=60,
                risk_level="HIGH",
                scoring_breakdown=[
                    {"code": "OWNER_MISMATCH", "name": "Owner Name Mismatch", "points": 35, "severity": "HIGH"},
                    {"code": "LAND_AREA_INFLATION", "name": "Land Area Discrepancy", "points": 25, "severity": "HIGH"}
                ]
            )
            db.add(risk_suspicious)

        # 3. Unindexed document test fixture (Survey SY-UNINDEXED-999)
        doc_unindexed = db.query(DocumentRecord).filter(DocumentRecord.document_id == "DOC-GIS-TEST-UNINDEXED").first()
        if not doc_unindexed:
            doc_unindexed = DocumentRecord(
                document_id="DOC-GIS-TEST-UNINDEXED",
                filename="Unindexed_999.pdf",
                extracted_owner_name="Praveen Reddy",
                extracted_survey_number="SY-UNINDEXED-999",
                extracted_land_area=1.50,
                extracted_location="Demo Village, Demo District"
            )
            db.add(doc_unindexed)

        ver_unindexed = db.query(VerificationResult).filter(VerificationResult.verification_id == "VER-GIS-TEST-UNINDEXED").first()
        if not ver_unindexed:
            ver_unindexed = VerificationResult(
                verification_id="VER-GIS-TEST-UNINDEXED",
                document_id="DOC-GIS-TEST-UNINDEXED",
                verification_status="REFERENCE_NOT_FOUND",
                is_valid=False,
                anomaly_count=0
            )
            db.add(ver_unindexed)

        risk_unindexed = db.query(RiskAssessment).filter(RiskAssessment.assessment_id == "RISK-GIS-TEST-UNINDEXED").first()
        if not risk_unindexed:
            risk_unindexed = RiskAssessment(
                assessment_id="RISK-GIS-TEST-UNINDEXED",
                verification_id="VER-GIS-TEST-UNINDEXED",
                risk_score=0,
                risk_level="LOW",
                scoring_breakdown=[]
            )
            db.add(risk_unindexed)

        db.commit()
        yield db
    finally:
        db.close()


def test_gis_parcels_without_document(db_session: Session):
    """When no document_id is provided, parcels retain reference risk with no document linkage."""
    result = gis_spatial_engine.get_all_parcels_geojson(db_session, document_id=None)
    features = result.get("features", [])
    assert len(features) > 0

    for feat in features:
        props = feat.get("properties", {})
        assert props.get("linked_document_id") is None
        assert props.get("has_document_conflict") is False
        assert props.get("document_risk_score") is None


def test_gis_parcels_with_suspicious_document(db_session: Session):
    """
    When the suspicious document (Survey 101/A, score 60) is passed, only parcel 101/A
    is linked and flagged with document conflict; reference parcel risk remains LOW.
    """
    result = gis_spatial_engine.get_all_parcels_geojson(db_session, document_id="DOC-GIS-TEST-SUSPICIOUS")
    features = result.get("features", [])

    matched_features = [f for f in features if f.get("properties", {}).get("survey_number") in ("101/A", "SYN-101/A")]
    assert len(matched_features) > 0

    for match in matched_features:
        props = match.get("properties", {})
        assert props.get("linked_document_id") == "DOC-GIS-TEST-SUSPICIOUS"
        assert props.get("document_risk_score") == 60
        assert props.get("document_risk_level") == "HIGH"
        assert props.get("has_document_conflict") is True
        # Crucial: reference parcel risk is separate and remains LOW
        assert props.get("reference_risk_level") == "LOW"

    # Other parcels must NOT be elevated or linked
    unrelated_features = [f for f in features if f.get("properties", {}).get("survey_number") not in ("101/A", "SYN-101/A")]
    for feat in unrelated_features:
        props = feat.get("properties", {})
        assert props.get("linked_document_id") is None
        assert props.get("has_document_conflict") is False
        assert props.get("document_risk_score") is None


def test_gis_parcels_with_normal_document(db_session: Session):
    """
    When normal document SY-TEST-104/2 is passed, matched parcel has document_risk_score: 0,
    has_document_conflict: False, reference_risk_level: LOW.
    """
    result = gis_spatial_engine.get_all_parcels_geojson(db_session, document_id="DOC-GIS-TEST-NORMAL")
    features = result.get("features", [])

    matched_features = [f for f in features if f.get("properties", {}).get("survey_number") == "SY-TEST-104/2"]
    assert len(matched_features) > 0

    for match in matched_features:
        props = match.get("properties", {})
        assert props.get("linked_document_id") == "DOC-GIS-TEST-NORMAL"
        assert props.get("document_risk_score") == 0
        assert props.get("document_risk_level") == "LOW"
        assert props.get("has_document_conflict") is False
        assert props.get("reference_risk_level") == "LOW"


def test_gis_parcels_with_unindexed_document(db_session: Session):
    """
    When an unindexed document (SY-UNINDEXED-999) is passed, NO parcel in GeoJSON is linked
    or marked as conflict.
    """
    result = gis_spatial_engine.get_all_parcels_geojson(db_session, document_id="DOC-GIS-TEST-UNINDEXED")
    features = result.get("features", [])

    for feat in features:
        props = feat.get("properties", {})
        assert props.get("linked_document_id") is None
        assert props.get("has_document_conflict") is False


def test_gis_document_switching_isolation(db_session: Session):
    """
    Switching between documents isolates state completely without stale cross-contamination.
    """
    # 1. Query with suspicious doc
    res_susp = gis_spatial_engine.get_all_parcels_geojson(db_session, document_id="DOC-GIS-TEST-SUSPICIOUS")
    p101_susp = next(f for f in res_susp["features"] if f["properties"].get("survey_number") in ("101/A", "SYN-101/A"))
    assert p101_susp["properties"]["has_document_conflict"] is True
    assert p101_susp["properties"]["document_risk_score"] == 60

    # 2. Query with unindexed doc
    res_unindexed = gis_spatial_engine.get_all_parcels_geojson(db_session, document_id="DOC-GIS-TEST-UNINDEXED")
    p101_unind = next(f for f in res_unindexed["features"] if f["properties"].get("survey_number") in ("101/A", "SYN-101/A"))
    assert p101_unind["properties"]["linked_document_id"] is None
    assert p101_unind["properties"]["has_document_conflict"] is False

    # 3. Query with normal doc
    res_norm = gis_spatial_engine.get_all_parcels_geojson(db_session, document_id="DOC-GIS-TEST-NORMAL")
    p104_norm = next(f for f in res_norm["features"] if f["properties"].get("survey_number") == "SY-TEST-104/2")
    assert p104_norm["properties"]["linked_document_id"] == "DOC-GIS-TEST-NORMAL"
    assert p104_norm["properties"]["has_document_conflict"] is False
    assert p104_norm["properties"]["document_risk_score"] == 0

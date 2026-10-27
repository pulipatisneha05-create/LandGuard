import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.models import RiskAssessment, VerificationResult, DocumentRecord
from app.verification.engine import verification_engine


class ExplainableRiskScoringEngine:
    """
    Transparent, Two-Tier Explainable Risk Scoring Engine for LandGuard.
    Distinguishes potential record inconsistencies (fraud risk) from data-quality
    warnings (legibility/missing data). Never penalizes absent synthetic reference records.
    """

    def __init__(self):
        # Explicit Rule Weights
        # 1. Record Inconsistencies (Potential Title Inconsistencies)
        self.INCONSISTENCY_WEIGHTS = {
            "DUPLICATE_REGISTRATION_FLAGGED": 30,
            "OWNER_NAME_MISMATCH": 25,
            "SURVEY_NUMBER_MISMATCH": 20,
            "LAND_AREA_MISMATCH": 20,
            "SPATIAL_LOCATION_MISMATCH": 20,
            "RAPID_OWNERSHIP_TRANSFER": 15,
            "UNFOUND_SELLER_IN_HISTORY": 15,
            "UNFOUNDED_SELLER_IN_HISTORY": 15,
            "MISSING_HISTORICAL_TITLE_CHAIN": 15
        }

        # 2. Data Quality & Legibility Warnings (Informational, NOT fraud)
        self.DATA_QUALITY_WEIGHTS = {
            "INCOMPLETE_DOCUMENT_DATA": 10,
            "LOW_OCR_CONFIDENCE": 5,
        }

        # 3. Informational / Absent Reference (Explicitly 0 points)
        self.ZERO_POINT_TYPES = {
            "REFERENCE_RECORD_NOT_AVAILABLE",
            "SURVEY_NOT_FOUND",
            "GIS_PARCEL_NOT_FOUND",
            "DOCUMENT_NOT_FOUND"
        }

    def compute_risk_assessment(self, document_id: str, db: Session) -> Dict[str, Any]:
        """
        Computes risk score and level for a given document_id, persists the result
        in risk_assessments table, and returns an explainable breakdown.
        """
        verification_payload = verification_engine.verify_document(document_id, db)
        return self.score_verification_payload(verification_payload, db=db)

    def score_verification_payload(self, verification_payload: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Pure rule-based scoring function that calculates explainable risk metrics
        directly from a verification_payload, optionally persisting to risk_assessments table.
        """
        document_id = verification_payload.get("document_id", "DOC-UNASSIGNED")
        verification_id = verification_payload.get("verification_id", f"VER-{document_id}")
        detected_anomalies = verification_payload.get("detected_anomalies", [])
        ver_status = verification_payload.get("verification_status", "UNVERIFIED")

        # 2. Compute Two-Tier Risk Score
        inconsistency_breakdown = []
        quality_breakdown = []
        info_breakdown = []

        inconsistency_score = 0
        quality_score = 0

        for issue in detected_anomalies:
            issue_type = issue.get("type", "UNKNOWN")
            category = issue.get("category", "")

            # Informational / Reference Status: explicitly 0 points
            if category == "Reference Status" or issue_type in self.ZERO_POINT_TYPES:
                info_breakdown.append({
                    "issue_type": issue_type,
                    "category": "Reference Status",
                    "title": issue.get("title", issue_type),
                    "severity": "Info",
                    "points_added": 0,
                    "reason_for_points": "Informational notice: Parcel unindexed or reference baseline absent in demonstration registry; zero penalty assigned (not an indicator of fraud).",
                    "expected": issue.get("expected", ""),
                    "found": issue.get("found", ""),
                    "description": issue.get("description", "")
                })
            elif issue_type in self.INCONSISTENCY_WEIGHTS:
                pts = self.INCONSISTENCY_WEIGHTS[issue_type]
                inconsistency_score += pts
                reason = self._get_inconsistency_reason(issue_type, pts)
                inconsistency_breakdown.append({
                    "issue_type": issue_type,
                    "category": "Record Inconsistency",
                    "title": issue.get("title", issue_type),
                    "severity": issue.get("severity", "High"),
                    "points_added": pts,
                    "reason_for_points": reason,
                    "expected": issue.get("expected", ""),
                    "found": issue.get("found", ""),
                    "description": issue.get("description", "")
                })
            elif issue_type in self.DATA_QUALITY_WEIGHTS or category == "Data Quality Warning":
                pts = self.DATA_QUALITY_WEIGHTS.get(issue_type, 5)
                quality_score += pts
                quality_breakdown.append({
                    "issue_type": issue_type,
                    "category": "Data Quality Warning",
                    "severity": issue.get("severity", "Medium"),
                    "points_added": pts,
                    "reason_for_points": f"Data quality / legibility observation: {issue.get('title', issue_type)} (+{pts} pts).",
                    "expected": issue.get("expected", ""),
                    "found": issue.get("found", ""),
                    "description": issue.get("description", "")
                })
            else:
                pts = 10
                inconsistency_score += pts
                inconsistency_breakdown.append({
                    "issue_type": issue_type,
                    "category": "Unclassified Warning",
                    "title": issue.get("title", issue_type),
                    "severity": "Medium",
                    "points_added": pts,
                    "reason_for_points": f"Unclassified anomaly (+{pts} pts).",
                    "description": issue.get("description", "")
                })

        raw_total_score = inconsistency_score + quality_score
        final_risk_score = min(raw_total_score, 100)

        # 3. Determine Risk Level Category
        risk_level = self.determine_risk_level(final_risk_score)

        # 4. Generate Recommendation
        recommendation = self.generate_recommendation(
            risk_level=risk_level,
            ver_status=ver_status,
            inconsistencies_count=len(inconsistency_breakdown),
            quality_warnings_count=len(quality_breakdown)
        )

        all_scoring_breakdown = inconsistency_breakdown + quality_breakdown + info_breakdown

        # 5. Persist Assessment in PostgreSQL risk_assessments Table
        assessment_id = f"RSK-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        summary_str = "; ".join([f"{item['title']} (+{item['points_added']} pts)" for item in all_scoring_breakdown]) or "No anomalies detected."

        risk_db = RiskAssessment(
            assessment_id=assessment_id,
            verification_id=verification_id,
            risk_score=final_risk_score,
            risk_level=risk_level,
            ownership_continuity_score=sum(i["points_added"] for i in inconsistency_breakdown if "OWNER" in i["issue_type"] or "HISTORY" in i["issue_type"]),
            area_discrepancy_score=sum(i["points_added"] for i in inconsistency_breakdown if "AREA" in i["issue_type"]),
            encumbrance_score=sum(i["points_added"] for i in inconsistency_breakdown if "DUPLICATE" in i["issue_type"] or "SURVEY" in i["issue_type"]),
            recommendations=f"{recommendation} | Summary: {summary_str}"
        )

        if db:
            try:
                db.query(RiskAssessment).filter(RiskAssessment.verification_id == verification_id).delete()
                db.add(risk_db)
                db.commit()
            except Exception as err:
                try:
                    db.rollback()
                except Exception:
                    pass
                print(f"Notice: Risk assessment DB persistence note: {err}")

        return {
            "assessment_id": assessment_id,
            "document_id": document_id,
            "verification_id": verification_id,
            "verification_status": ver_status,
            "verification_outcome": verification_payload.get("verification_outcome", ver_status),
            "status_summary": self.get_status_summary(ver_status, final_risk_score, risk_level),
            "risk_score": final_risk_score,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "inconsistency_score": inconsistency_score,
            "quality_score": quality_score,
            "record_inconsistencies": inconsistency_breakdown,
            "data_quality_warnings": quality_breakdown,
            "reference_notices": info_breakdown,
            "scoring_breakdown": all_scoring_breakdown,
            "total_anomalies_count": len(all_scoring_breakdown),
            "matched_land_record": verification_payload.get("matched_land_record"),
            "disclaimer": "Student prototype / demonstration risk scoring engine. Not a substitute for authorized legal or government title search."
        }

    def _get_inconsistency_reason(self, issue_type: str, pts: int) -> str:
        reasons = {
            "DUPLICATE_REGISTRATION_FLAGGED": f"Critical title risk: Multiple active registrations found for the same parcel (+{pts} pts).",
            "OWNER_NAME_MISMATCH": f"High risk anomaly: Document executant differs from registered title owner (+{pts} pts).",
            "SURVEY_NUMBER_MISMATCH": f"High risk anomaly: Document survey subdivision differs from registered reference parcel (+{pts} pts).",
            "LAND_AREA_MISMATCH": f"High risk anomaly: Document land area extent deviates from registered reference extent (+{pts} pts).",
            "SPATIAL_LOCATION_MISMATCH": f"High risk anomaly: Document claimed jurisdiction/village conflicts with GIS cadastral boundaries (+{pts} pts).",
            "RAPID_OWNERSHIP_TRANSFER": f"Medium risk anomaly: Rapid successive deed transfer detected (<180 days) (+{pts} pts).",
            "UNFOUND_SELLER_IN_HISTORY": f"High risk anomaly: Executant seller does not appear in recorded title chain (+{pts} pts).",
            "UNFOUNDED_SELLER_IN_HISTORY": f"High risk anomaly: Executant seller does not appear in recorded title chain (+{pts} pts).",
            "MISSING_HISTORICAL_TITLE_CHAIN": f"Medium risk anomaly: Parcel lacks prior transfer history records in database (+{pts} pts).",
        }
        return reasons.get(issue_type, f"Record discrepancy flagged (+{pts} pts).")

    def get_status_summary(self, ver_status: str, score: int, level: str) -> str:
        if ver_status == "REFERENCE_NOT_FOUND":
            return f"Unindexed in Reference Registry (Risk Score: {score}/100 - Not Verified / Unindexed)"
        elif ver_status == "VERIFIED":
            return f"Verified Match against Reference Registry (Risk Score: {score}/100 - Low Risk)"
        elif ver_status == "SUSPICIOUS":
            return f"Flagged with Record Inconsistencies (Risk Score: {score}/100 - {level} Risk)"
        else:
            return f"Unverified / Incomplete Data (Risk Score: {score}/100 - Unverified)"

    def determine_risk_level(self, score: int) -> str:
        """
        Assigns standard risk level category:
        0–29: LOW
        30–59: MEDIUM
        60–79: HIGH
        80–100: CRITICAL
        """
        if score >= 80:
            return "CRITICAL"
        elif score >= 60:
            return "HIGH"
        elif score >= 30:
            return "MEDIUM"
        return "LOW"

    def generate_recommendation(
        self,
        risk_level: str,
        ver_status: str = "VERIFIED",
        inconsistencies_count: int = 0,
        quality_warnings_count: int = 0
    ) -> str:
        """
        Generates responsible, evidence-based recommendations without unsupported claims of fraud.
        """
        if ver_status == "REFERENCE_NOT_FOUND":
            return "Unindexed parcel in demonstration registry: Manual physical inspection and registry verification recommended."
        if ver_status in ["UNVERIFIED", "INCONCLUSIVE"]:
            return "Incomplete document data: Ingestion could not extract sufficient cadastral keys for verification."

        if risk_level == "CRITICAL":
            return "Immediate detailed verification required"
        elif risk_level == "HIGH":
            return "Further verification required"
        elif risk_level == "MEDIUM":
            return "Manual review recommended"
        else:
            return "No major inconsistency detected"


# Singleton export
risk_scoring_engine = ExplainableRiskScoringEngine()

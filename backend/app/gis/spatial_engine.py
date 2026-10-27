import os
import json
import logging
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.models import LandRecord, DocumentRecord, VerificationResult, RiskAssessment

logger = logging.getLogger("landguard.gis")

# Path to sample GeoJSON file
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
GEOJSON_FILE_PATH = os.path.join(PROJECT_ROOT, "sample_data", "parcels.geojson")
SYNTHETIC_GEOJSON_FILE_PATH = os.path.join(PROJECT_ROOT, "sample_data", "parcels_synthetic_100.geojson")


class GISSpatialEngine:
    """
    GIS Spatial Engine for LandGuard.
    Handles GeoJSON parcel boundary mapping, spatial location verification,
    and GIS mismatch anomaly detection.
    """

    def __init__(self):
        self.geojson_data = self._load_sample_geojson()

    def _load_sample_geojson(self) -> Dict[str, Any]:
        combined_features = []
        if os.path.exists(GEOJSON_FILE_PATH):
            try:
                with open(GEOJSON_FILE_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    combined_features.extend(data.get("features", []))
            except Exception as e:
                logger.error(f"Failed to parse GeoJSON at {GEOJSON_FILE_PATH}: {e}")

        if os.path.exists(SYNTHETIC_GEOJSON_FILE_PATH):
            try:
                with open(SYNTHETIC_GEOJSON_FILE_PATH, "r", encoding="utf-8") as f:
                    syn_data = json.load(f)
                    combined_features.extend(syn_data.get("features", []))
            except Exception as e:
                logger.error(f"Failed to parse synthetic GeoJSON at {SYNTHETIC_GEOJSON_FILE_PATH}: {e}")

        return {"type": "FeatureCollection", "features": combined_features}

    @staticmethod
    def is_survey_match(survey_a: Optional[str], survey_b: Optional[str]) -> bool:
        if not survey_a or not survey_b:
            return False
        a = str(survey_a).strip().upper()
        b = str(survey_b).strip().upper()
        if a == b:
            return True

        import re
        clean_a = re.sub(r"^(SYN-|SY-|SURVEY-|TEST-|DEMO-)+", "", a)
        clean_b = re.sub(r"^(SYN-|SY-|SURVEY-|TEST-|DEMO-)+", "", b)
        if clean_a == clean_b:
            return True

        strip_a = re.sub(r"[\s\-_/]", "", clean_a)
        strip_b = re.sub(r"[\s\-_/]", "", clean_b)
        if len(strip_a) >= 2 and strip_a == strip_b:
            return True

        if clean_a.endswith(clean_b) or clean_b.endswith(clean_a):
            if a.endswith("/" + b) or a.endswith("-" + b) or b.endswith("/" + a) or b.endswith("-" + a):
                return True

        return False

    def get_all_parcels_geojson(self, db: Optional[Session] = None, document_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns full GeoJSON FeatureCollection, enriching feature properties
        with live data from land_records database and optional active document assessment.
        """
        features = self.geojson_data.get("features", [])
        enriched_features = []

        # Retrieve document assessment context if document_id provided
        doc_survey = None
        doc_risk_score = None
        doc_risk_level = None
        doc_ver_status = None
        if db and document_id:
            try:
                doc_rec = db.query(DocumentRecord).filter(DocumentRecord.document_id == document_id).first()
                if doc_rec:
                    doc_survey = doc_rec.extracted_survey_number
                ver_rec = db.query(VerificationResult).filter(VerificationResult.document_id == document_id).first()
                if ver_rec:
                    doc_ver_status = ver_rec.verification_status
                    risk_rec = db.query(RiskAssessment).filter(RiskAssessment.verification_id == ver_rec.verification_id).first()
                    if risk_rec:
                        doc_risk_score = risk_rec.risk_score
                        doc_risk_level = risk_rec.risk_level
            except Exception as e:
                logger.warning(f"Error fetching document assessment for GIS enrichment: {e}")

        for feature in features:
            props = feature.get("properties", {}).copy()
            survey_no = props.get("survey_number")

            if db and survey_no:
                try:
                    rec = db.query(LandRecord).filter(LandRecord.survey_number == survey_no).first()
                    if rec:
                        props["owner_name"] = rec.owner_name
                        props["land_area_acres"] = float(rec.land_area_acres)
                        props["village"] = rec.village
                        props["mandal"] = rec.mandal
                        props["district"] = rec.district
                except Exception as e:
                    logger.warning(f"Database enrichment error for survey {survey_no}: {e}")

            # Check if this parcel is associated with the analyzed document
            props["reference_risk_level"] = props.get("risk_level", "LOW")
            if doc_survey and survey_no and self.is_survey_match(survey_no, doc_survey):
                props["linked_document_id"] = document_id
                props["document_risk_score"] = doc_risk_score
                props["document_risk_level"] = doc_risk_level
                props["document_verification_status"] = doc_ver_status
                props["has_document_conflict"] = bool(doc_risk_score is not None and doc_risk_score >= 60)
            else:
                props["linked_document_id"] = None
                props["document_risk_score"] = None
                props["document_risk_level"] = None
                props["document_verification_status"] = None
                props["has_document_conflict"] = False

            feature_copy = feature.copy()
            feature_copy["properties"] = props
            enriched_features.append(feature_copy)

        return {
            "type": "FeatureCollection",
            "name": "LandGuard_Spatial_Parcels",
            "features": enriched_features
        }

    def get_parcel_by_survey(self, survey_number: str, db: Optional[Session] = None, document_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single GeoJSON Feature by survey_number with optional document assessment.
        """
        features = self.geojson_data.get("features", [])
        for feature in features:
            props = feature.get("properties", {})
            if props.get("survey_number") == survey_number:
                feature_copy = feature.copy()
                props_copy = props.copy()
                if db:
                    try:
                        rec = db.query(LandRecord).filter(LandRecord.survey_number == survey_number).first()
                        if rec:
                            props_copy["owner_name"] = rec.owner_name
                            props_copy["land_area_acres"] = float(rec.land_area_acres)
                            props_copy["village"] = rec.village
                            props_copy["mandal"] = rec.mandal
                            props_copy["district"] = rec.district
                    except Exception as e:
                        logger.warning(f"Database lookup error for survey {survey_number}: {e}")

                    if document_id:
                        try:
                            doc_rec = db.query(DocumentRecord).filter(DocumentRecord.document_id == document_id).first()
                            doc_survey = doc_rec.extracted_survey_number if doc_rec else None
                            if doc_survey and self.is_survey_match(survey_number, doc_survey):
                                ver_rec = db.query(VerificationResult).filter(VerificationResult.document_id == document_id).first()
                                if ver_rec:
                                    props_copy["linked_document_id"] = document_id
                                    props_copy["document_verification_status"] = ver_rec.verification_status
                                    risk_rec = db.query(RiskAssessment).filter(RiskAssessment.verification_id == ver_rec.verification_id).first()
                                    if risk_rec:
                                        props_copy["document_risk_score"] = risk_rec.risk_score
                                        props_copy["document_risk_level"] = risk_rec.risk_level
                                        props_copy["has_document_conflict"] = bool(risk_rec.risk_score >= 60)
                        except Exception as e:
                            logger.warning(f"Error checking document for parcel {survey_number}: {e}")

                props_copy["reference_risk_level"] = props_copy.get("risk_level", "LOW")
                feature_copy["properties"] = props_copy
                return feature_copy
        return None

    @staticmethod
    def _clean_geo_name(name: str) -> str:
        if not name:
            return ""
        import re
        n = name.lower().strip()
        n = re.sub(r"\b(district|dist\.?|mandal|village|taluk)\b", "", n)
        return re.sub(r"[^\w\s]", "", n).strip()

    def verify_spatial_location(
        self,
        survey_number: Optional[str],
        doc_village: Optional[str] = None,
        doc_mandal: Optional[str] = None,
        doc_district: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Performs GIS Spatial Verification comparing document location claims
        against CAD polygon GIS boundary records.
        """
        anomalies: List[Dict[str, Any]] = []

        if not survey_number:
            anomalies.append({
                "type": "GIS_PARCEL_NOT_FOUND",
                "severity": "High",
                "title": "Missing Spatial Survey Key",
                "expected": "Valid Survey Number for GIS polygon lookup",
                "found": "Empty survey number",
                "description": "Spatial verification cannot proceed because survey parcel number is missing."
            })
            return {"spatial_match": False, "anomalies": anomalies}

        # 1. Lookup Parcel Geometry
        parcel_feature = self.get_parcel_by_survey(survey_number, db)

        if not parcel_feature:
            anomalies.append({
                "type": "GIS_PARCEL_NOT_FOUND",
                "severity": "High",
                "title": "GIS Map Polygon Missing",
                "expected": f"Registered CAD GIS polygon boundary for Survey '{survey_number}'",
                "found": f"No GeoJSON polygon found for Survey '{survey_number}'",
                "description": f"Survey parcel '{survey_number}' does not have a mapped Cadastral spatial polygon in the OpenStreetMap GIS database."
            })
            return {
                "spatial_match": False,
                "parcel_found": False,
                "anomalies": anomalies
            }

        props = parcel_feature.get("properties", {})
        gis_village = props.get("village", "")
        gis_mandal = props.get("mandal", "")
        gis_district = props.get("district", "")

        # 2. Location Mismatch Check (with entity normalization)
        if doc_village and gis_village:
            c_doc_v = self._clean_geo_name(doc_village)
            c_gis_v = self._clean_geo_name(gis_village)
            if c_doc_v and c_gis_v and c_doc_v != c_gis_v and c_doc_v not in c_gis_v and c_gis_v not in c_doc_v:
                anomalies.append({
                    "type": "SPATIAL_LOCATION_MISMATCH",
                    "severity": "High",
                    "title": "Village Spatial Boundary Mismatch",
                    "expected": f"GIS Boundary Village: '{gis_village}'",
                    "found": f"Document Claimed Village: '{doc_village}'",
                    "description": f"Document claims parcel location in Village '{doc_village}', but GIS boundary coordinates place Survey {survey_number} in Village '{gis_village}'."
                })

        if doc_district and gis_district:
            c_doc_d = self._clean_geo_name(doc_district)
            c_gis_d = self._clean_geo_name(gis_district)
            if c_doc_d and c_gis_d and c_doc_d != c_gis_d and c_doc_d not in c_gis_d and c_gis_d not in c_doc_d:
                anomalies.append({
                    "type": "SPATIAL_LOCATION_MISMATCH",
                    "severity": "High",
                    "title": "District Jurisdiction Mismatch",
                    "expected": f"GIS Parcel District: '{gis_district}'",
                    "found": f"Document Claimed District: '{doc_district}'",
                    "description": f"Document claims District '{doc_district}', which differs from official GIS boundary District '{gis_district}'."
                })

        spatial_match = len(anomalies) == 0

        return {
            "spatial_match": spatial_match,
            "parcel_found": True,
            "survey_number": survey_number,
            "gis_properties": props,
            "geometry": parcel_feature.get("geometry"),
            "anomalies": anomalies
        }


# Singleton export
gis_spatial_engine = GISSpatialEngine()

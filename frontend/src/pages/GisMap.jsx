import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polygon, ScaleControl, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getGisParcelsApi, getRiskAssessmentApi, getVerificationApi } from '../api/config';
import { mockGisParcelData } from '../data/mockData';
import { fallbackGeoJson } from '../data/parcelsGeoJson';
import { evaluateDocumentRisk } from '../utils/verificationEvaluator';
import StatusBadge from '../components/StatusBadge';
import RiskScoreBadge from '../components/RiskScoreBadge';
import {
  MapPin,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Info,
  RotateCcw,
  Compass,
  Wifi,
  WifiOff,
  Crosshair,
  ShieldAlert,
  AlertCircle,
  FileText,
  Upload
} from 'lucide-react';

// Survey number matching utility with prefix and punctuation normalization
export function isSurveyMatch(surveyA, surveyB) {
  if (!surveyA || !surveyB) return false;
  const a = String(surveyA).trim().toUpperCase();
  const b = String(surveyB).trim().toUpperCase();
  if (a === b) return true;

  // Normalize by stripping common prefixes like SYN-, SY-, SURVEY-, TEST-, DEMO-
  const cleanA = a.replace(/^(SYN-|SY-|SURVEY-|TEST-|DEMO-)+/, '');
  const cleanB = b.replace(/^(SYN-|SY-|SURVEY-|TEST-|DEMO-)+/, '');
  if (cleanA === cleanB) return true;

  // Strip slashes, spaces, hyphens
  const stripA = cleanA.replace(/[\s\-_/]/g, '');
  const stripB = cleanB.replace(/[\s\-_/]/g, '');
  if (stripA.length >= 2 && stripA === stripB) return true;

  // Check boundary-aligned suffix match (e.g. 104/2 in SY-TEST-104/2)
  if (cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA)) {
    if (a.endsWith('/' + b) || a.endsWith('-' + b) || b.endsWith('/' + a) || b.endsWith('-' + a)) {
      return true;
    }
  }

  return false;
}

// Map score to standard risk category: LOW (0-29), MEDIUM (30-59), HIGH (60-79), CRITICAL (80-100)
export function getRiskTier(score, explicitLevel) {
  if (explicitLevel && typeof explicitLevel === 'string') {
    const norm = explicitLevel.toUpperCase();
    if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(norm)) return norm;
  }
  if (score !== null && score !== undefined && !isNaN(Number(score))) {
    const num = Number(score);
    if (num >= 80) return 'CRITICAL';
    if (num >= 60) return 'HIGH';
    if (num >= 30) return 'MEDIUM';
    return 'LOW';
  }
  return 'LOW';
}

// Risk palette adhering to specifications:
// LOW: Green, MEDIUM: Yellow/Orange, HIGH: Red, CRITICAL: Purple
export function getRiskColorDef(tier) {
  switch (tier) {
    case 'CRITICAL':
      return {
        tier: 'CRITICAL',
        fill: '#a855f7', // purple-500
        stroke: '#c084fc', // purple-300
        border: 'border-purple-800',
        bg: 'bg-purple-950/80',
        text: 'text-purple-300',
        badge: 'bg-purple-950 text-purple-300 border-purple-800'
      };
    case 'HIGH':
      return {
        tier: 'HIGH',
        fill: '#ef4444', // red-500
        stroke: '#f87171', // red-400
        border: 'border-rose-900',
        bg: 'bg-rose-950/80',
        text: 'text-rose-400',
        badge: 'bg-rose-950 text-rose-300 border-rose-800'
      };
    case 'MEDIUM':
      return {
        tier: 'MEDIUM',
        fill: '#f59e0b', // amber-500
        stroke: '#fbbf24', // amber-300
        border: 'border-amber-800',
        bg: 'bg-amber-950/80',
        text: 'text-amber-400',
        badge: 'bg-amber-950 text-amber-300 border-amber-800'
      };
    case 'LOW':
    default:
      return {
        tier: 'LOW',
        fill: '#10b981', // emerald-500
        stroke: '#34d399', // emerald-400
        border: 'border-emerald-800',
        bg: 'bg-emerald-950/80',
        text: 'text-emerald-400',
        badge: 'bg-emerald-950 text-emerald-300 border-emerald-800'
      };
  }
}

// Generate human-readable explanation of why a risk factor matters
function getReasonExplanation(type, item) {
  const norm = String(type || '').toUpperCase();
  if (norm.includes('OWNER')) {
    return 'The executant or seller named in the document differs from the registered owner in the revenue records, indicating potential title discontinuity.';
  }
  if (norm.includes('SURVEY')) {
    return 'The claimed survey number does not align with official cadastral sub-divisions in the registry.';
  }
  if (norm.includes('AREA') || norm.includes('ACRE')) {
    return 'The deed claims a land extent that differs from the registered cadastral area, signaling potential boundary inflation or encroachment.';
  }
  if (norm.includes('SPATIAL') || norm.includes('LOCATION') || norm.includes('GIS') || norm.includes('BOUNDARY')) {
    return 'Document spatial coordinates or village boundary do not match the registered cadastral polygon boundaries.';
  }
  if (norm.includes('DUPLICATE')) {
    return 'Multiple active deeds or rapid transactions have been registered under this survey number, requiring title integrity verification.';
  }
  if (norm.includes('RAPID')) {
    return 'Multiple transfers in a brief timeframe suggest speculative turnover or irregular mutation.';
  }
  if (norm.includes('HISTORY') || norm.includes('CHAIN') || norm.includes('SELLER')) {
    return 'The title chain lacks historical continuity linking the current vendor to prior registered grant records.';
  }
  if (norm.includes('OCR') || norm.includes('INCOMPLETE') || norm.includes('CONFIDENCE')) {
    return 'Key legal text or declarations could not be extracted with high confidence from the uploaded document.';
  }
  return item?.description || 'Identified as a risk indicator requiring administrative verification with revenue authorities.';
}

// Extract specific reasons from actual verification result, breakdown, and field matches
function extractRiskReasons(assessment, verification) {
  const reasons = [];
  const seenTypes = new Set();

  // 1. From scoring_breakdown
  const breakdown = assessment?.scoring_breakdown || verification?.scoring_breakdown || [];
  for (const item of breakdown) {
    const pts = Number(item.points_added) || 0;
    const type = item.issue_type || item.type || item.title || 'UNKNOWN';
    if (pts > 0 && !seenTypes.has(type)) {
      seenTypes.add(type);
      reasons.push({
        id: `bd-${type}`,
        type,
        title: item.title || type.replace(/_/g, ' '),
        points: pts,
        severity: item.severity || (pts >= 25 ? 'High' : pts >= 15 ? 'Medium' : 'Low'),
        whyItMatters: item.reason_for_points || item.description || getReasonExplanation(type, item)
      });
    }
  }

  // 2. From detected_anomalies
  const anomalies = verification?.detected_anomalies || assessment?.detected_anomalies || [];
  for (const a of anomalies) {
    const type = a.type || a.issue_type || a.title || 'UNKNOWN';
    if (a.category === 'Reference Status' || type === 'REFERENCE_RECORD_NOT_AVAILABLE') {
      continue;
    }
    if (!seenTypes.has(type)) {
      seenTypes.add(type);
      const pts = Number(a.points_added) || 0;
      reasons.push({
        id: `an-${type}`,
        type,
        title: a.title || type.replace(/_/g, ' '),
        points: pts,
        severity: a.severity || 'High',
        whyItMatters: a.reason_for_points || a.description || getReasonExplanation(type, a)
      });
    }
  }

  // 3. From field_matches if present
  const fieldMatches = verification?.field_matches;
  if (fieldMatches) {
    if (fieldMatches.owner_match === false && !seenTypes.has('OWNER_NAME_MISMATCH')) {
      seenTypes.add('OWNER_NAME_MISMATCH');
      reasons.push({
        id: 'fm-owner',
        type: 'OWNER_NAME_MISMATCH',
        title: 'Owner Name Mismatch',
        points: 25,
        severity: 'High',
        whyItMatters: 'The executant or seller named in the deed does not match the registered owner recorded in the revenue registry.'
      });
    }
    if (fieldMatches.survey_number_match === false && !seenTypes.has('SURVEY_NUMBER_MISMATCH')) {
      seenTypes.add('SURVEY_NUMBER_MISMATCH');
      reasons.push({
        id: 'fm-survey',
        type: 'SURVEY_NUMBER_MISMATCH',
        title: 'Survey Number Mismatch',
        points: 20,
        severity: 'High',
        whyItMatters: 'The claimed survey number does not align with the revenue cadastral records.'
      });
    }
    if (fieldMatches.land_area_match === false && !seenTypes.has('LAND_AREA_MISMATCH')) {
      seenTypes.add('LAND_AREA_MISMATCH');
      reasons.push({
        id: 'fm-area',
        type: 'LAND_AREA_MISMATCH',
        title: 'Land Area Discrepancy',
        points: 20,
        severity: 'High',
        whyItMatters: 'Claimed deed acreage deviates from the registered cadastral parcel boundary, indicating possible area inflation or overlap.'
      });
    }
  }

  return reasons;
}

// Subcomponent to handle programmatic map pan/zoom to the active parcel
function MapController({ targetBounds, resetKey, defaultCenter, defaultZoom }) {
  const map = useMap();

  // Invalidate map size after mount and with staggered timeouts so tiles calculate correctly
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 100);
    const t2 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  // Safe fitBounds: verifies bounds are valid and map container has measurable non-zero dimensions
  useEffect(() => {
    if (!targetBounds || typeof targetBounds.isValid !== 'function' || !targetBounds.isValid()) {
      return;
    }

    const fitTimer = setTimeout(() => {
      try {
        const size = map.getSize();
        if (size && size.x > 100 && size.y > 100) {
          map.fitBounds(targetBounds, { padding: [40, 40], maxZoom: 16 });
        } else {
          // If size is still 0 (layout resolving), force invalidateSize and retry
          map.invalidateSize();
          setTimeout(() => {
            try {
              const retrySize = map.getSize();
              if (retrySize && retrySize.x > 100 && retrySize.y > 100) {
                map.fitBounds(targetBounds, { padding: [30, 30], maxZoom: 16 });
              }
            } catch (err) {}
          }, 200);
        }
      } catch (err) {
        console.warn("Map fitBounds notice:", err);
      }
    }, 150);

    return () => clearTimeout(fitTimer);
  }, [targetBounds, map]);

  // Reset view button handler
  useEffect(() => {
    if (resetKey > 0) {
      try {
        map.invalidateSize();
        if (targetBounds && typeof targetBounds.isValid === 'function' && targetBounds.isValid()) {
          const size = map.getSize();
          if (size && size.x > 100 && size.y > 100) {
            map.fitBounds(targetBounds, { padding: [40, 40], maxZoom: 16 });
            return;
          }
        }
        map.flyTo(defaultCenter, defaultZoom, { duration: 1.0 });
      } catch (e) {
        console.warn("Map reset notice:", e);
      }
    }
  }, [resetKey, targetBounds, defaultCenter, defaultZoom, map]);

  return null;
}

export default function GisMap({ activeDocument, verificationResult, onNavigate }) {
  // 1. Resolve active document from props or sessionStorage
  const effectiveDocument = useMemo(() => {
    if (activeDocument) return activeDocument;
    try {
      const saved = sessionStorage.getItem('landguard_active_doc');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, [activeDocument]);

  // 2. Resolve verification from props or sessionStorage
  const storedVerification = useMemo(() => {
    if (verificationResult) return verificationResult;
    try {
      const saved = sessionStorage.getItem('landguard_verification');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }, [verificationResult]);

  // Document fields extraction
  const docFields = effectiveDocument?.extracted_nlp_fields || effectiveDocument?.extracted_fields || {};
  const docId = effectiveDocument?.document_id || effectiveDocument?.id || null;
  const docSurvey = docFields.survey_number || effectiveDocument?.survey_number || null;
  const docOwner = docFields.owner_name || effectiveDocument?.owner_name || null;

  // Land Area resolution
  const docArea = docFields.land_area_raw ||
                  (docFields.land_area_normalized_acres != null ? `${docFields.land_area_normalized_acres} Acres` : null) ||
                  (docFields.land_area_acres != null ? `${docFields.land_area_acres} Acres` : null) ||
                  (docFields.land_area ? `${docFields.land_area} ${docFields.land_area_unit || 'Acres'}` : null) ||
                  (effectiveDocument?.land_area ? `${effectiveDocument.land_area} ${effectiveDocument.land_area_unit || 'Acres'}` : null);

  // Village / Mandal resolution
  const docVillage = docFields.village || effectiveDocument?.village || null;
  const docMandal = docFields.mandal || effectiveDocument?.mandal || null;
  const villageMandalDisplay = (docVillage && docMandal)
    ? `${docVillage}, ${docMandal}`
    : docVillage || docMandal || 'Not available';

  // District resolution
  const docDistrict = docFields.district || effectiveDocument?.district || null;
  const docState = docFields.state || effectiveDocument?.state || null;
  const districtDisplay = docDistrict
    ? (docState ? `${docDistrict}, ${docState}` : docDistrict)
    : 'Not available';

  // 3. Live Assessment & Verification API Fetching (if needed)
  const [fetchedAssessment, setFetchedAssessment] = useState(null);
  const [fetchedVerification, setFetchedVerification] = useState(null);

  useEffect(() => {
    if (docId) {
      if (!storedVerification || storedVerification.risk_score == null) {
        getRiskAssessmentApi(docId)
          .then((data) => setFetchedAssessment(data))
          .catch((err) => console.warn('GIS notice: could not load live risk assessment:', err.message));
      }
      if (!storedVerification || !storedVerification.detected_anomalies) {
        getVerificationApi(docId)
          .then((data) => setFetchedVerification(data))
          .catch((err) => console.warn('GIS notice: could not load live verification:', err.message));
      }
    }
  }, [docId, storedVerification]);

  const evaluatedLocal = useMemo(() => {
    if ((!storedVerification || storedVerification.risk_score == null) &&
        !fetchedAssessment && !fetchedVerification && effectiveDocument) {
      return evaluateDocumentRisk(effectiveDocument);
    }
    return null;
  }, [storedVerification, fetchedAssessment, fetchedVerification, effectiveDocument]);

  const effectiveAssessment = useMemo(() => {
    if (storedVerification && (!storedVerification.document_id || storedVerification.document_id === docId) && storedVerification.risk_score != null) {
      return storedVerification;
    }
    return fetchedAssessment || evaluatedLocal || storedVerification;
  }, [storedVerification, fetchedAssessment, evaluatedLocal, docId]);

  const effectiveVerification = useMemo(() => {
    if (storedVerification && (!storedVerification.document_id || storedVerification.document_id === docId) && storedVerification.risk_score != null) {
      return storedVerification;
    }
    return fetchedVerification || evaluatedLocal || storedVerification;
  }, [storedVerification, fetchedVerification, evaluatedLocal, docId]);

  // Derived Risk Metrics
  const docRiskScore = useMemo(() => {
    if (effectiveAssessment && typeof effectiveAssessment.risk_score === 'number') {
      return effectiveAssessment.risk_score;
    }
    if (effectiveVerification && typeof effectiveVerification.risk_score === 'number') {
      return effectiveVerification.risk_score;
    }
    if (storedVerification && typeof storedVerification.risk_score === 'number') {
      return storedVerification.risk_score;
    }
    if (effectiveDocument && typeof effectiveDocument.risk_score === 'number') {
      return effectiveDocument.risk_score;
    }
    return null;
  }, [effectiveAssessment, effectiveVerification, storedVerification, effectiveDocument]);

  const docRiskLevel = useMemo(() => {
    const rawLevel = effectiveAssessment?.risk_level ||
                     effectiveVerification?.risk_level ||
                     storedVerification?.risk_level ||
                     effectiveDocument?.risk_level;
    return getRiskTier(docRiskScore, rawLevel);
  }, [effectiveAssessment, effectiveVerification, storedVerification, effectiveDocument, docRiskScore]);

  const docVerificationStatus = useMemo(() => {
    return effectiveVerification?.verification_status ||
           effectiveAssessment?.verification_status ||
           storedVerification?.verification_status ||
           effectiveDocument?.verification_status ||
           (effectiveDocument ? 'PENDING VERIFICATION' : null);
  }, [effectiveVerification, effectiveAssessment, storedVerification, effectiveDocument]);

  // Palette colors for active document's risk level
  const riskColors = useMemo(() => getRiskColorDef(docRiskLevel), [docRiskLevel]);

  // Extract risk reasons
  const riskReasons = useMemo(() => {
    return extractRiskReasons(effectiveAssessment, effectiveVerification);
  }, [effectiveAssessment, effectiveVerification]);

  // 4. GIS Parcel Data Loading
  const [geoData, setGeoData] = useState(fallbackGeoJson);
  const [apiSource, setApiSource] = useState('local');
  const [isLoading, setIsLoading] = useState(false);
  const [activeLayer, setActiveLayer] = useState('cadastral'); // 'cadastral' | 'satellite' | 'encumbrance'
  const [resetKey, setResetKey] = useState(0);

  const geoJsonRef = useRef(null);

  // Default coordinate center: Ranga Reddy / Hyderabad cadastral cluster
  const defaultCenter = [17.405, 78.355];
  const defaultZoom = 12;

  useEffect(() => {
    setIsLoading(true);
    getGisParcelsApi(docId)
      .then((data) => {
        if (data && data.features && data.features.length > 0) {
          setGeoData(data);
          setApiSource('live');
        } else {
          setGeoData(fallbackGeoJson);
          setApiSource('local');
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('GIS Backend API notice (using bundled synthetic GeoJSON fallback):', err.message);
        setGeoData(fallbackGeoJson);
        setApiSource('local');
        setIsLoading(false);
      });
  }, [docId]);

  const allFeatures = useMemo(() => geoData?.features || [], [geoData]);

  // 5. Match Active Document to its Parcel Geometry
  const effectiveFeature = useMemo(() => {
    if (!docSurvey && !effectiveDocument?.geometry) return null;

    // Check if matched in cadastral GeoJSON features by survey number
    if (docSurvey && allFeatures.length > 0) {
      const match = allFeatures.find((f) => isSurveyMatch(f.properties?.survey_number, docSurvey));
      if (match) return match;
    }

    // Check if active document itself contains geometry
    if (effectiveDocument?.geometry) {
      return {
        type: 'Feature',
        id: effectiveDocument.document_id || 'DOC-GEO',
        properties: {
          survey_number: docSurvey || 'Document Survey',
          owner_name: docOwner || 'Not available',
          land_area_acres: docArea || 'Not available',
          village: docVillage || 'Not available',
          mandal: docMandal || 'Not available',
          district: docDistrict || 'Not available'
        },
        geometry: effectiveDocument.geometry
      };
    }

    return null;
  }, [allFeatures, docSurvey, effectiveDocument, docOwner, docArea, docVillage, docMandal, docDistrict]);

  const hasGeometry = Boolean(effectiveFeature);

  // Compute selected parcel bounds for map focus
  const targetBounds = useMemo(() => {
    if (!effectiveFeature) return null;
    try {
      const bounds = L.geoJSON(effectiveFeature).getBounds();
      return (bounds && typeof bounds.isValid === 'function' && bounds.isValid()) ? bounds : null;
    } catch (e) {
      return null;
    }
  }, [effectiveFeature]);

  // Centroid calculation for selected parcel
  const centroid = useMemo(() => {
    if (!effectiveFeature) return null;
    try {
      const bounds = L.geoJSON(effectiveFeature).getBounds();
      if (!bounds || typeof bounds.isValid !== 'function' || !bounds.isValid()) return null;
      const c = bounds.getCenter();
      if (!c || isNaN(c.lat) || isNaN(c.lng)) return null;
      return { lat: c.lat.toFixed(5), lng: c.lng.toFixed(5) };
    } catch (e) {
      return null;
    }
  }, [effectiveFeature]);

  // 6. Map Polygon Styling
  const getFeatureStyle = (feature) => {
    const p = feature.properties || {};
    const isUploadedParcel = Boolean(
      (effectiveFeature && effectiveFeature.id && feature.id && effectiveFeature.id === feature.id) ||
      (docSurvey && isSurveyMatch(p.survey_number, docSurvey))
    );

    // Selected / Active Uploaded Parcel Highlighting
    if (isUploadedParcel) {
      return {
        fillColor: riskColors.fill,
        fillOpacity: 0.75,
        color: riskColors.stroke,
        weight: 4,
        dashArray: null
      };
    }

    // Encumbrance mode
    if (activeLayer === 'encumbrance') {
      const isDisputed = p.conflict_status && p.conflict_status !== 'Clean';
      if (isDisputed) {
        return {
          fillColor: '#dc2626',
          fillOpacity: 0.50,
          color: '#ef4444',
          weight: 2,
          dashArray: '5, 5'
        };
      }
      return {
        fillColor: '#64748b',
        fillOpacity: 0.12,
        color: '#475569',
        weight: 1,
        dashArray: null
      };
    }

    // Satellite hybrid mode
    if (activeLayer === 'satellite') {
      return {
        fillColor: '#334155',
        fillOpacity: 0.20,
        color: '#cbd5e1',
        weight: 1.5,
        dashArray: null
      };
    }

    // Cadastral view for other background reference parcels
    return {
      fillColor: '#1e293b',
      fillOpacity: 0.20,
      color: '#475569',
      weight: 1,
      dashArray: null
    };
  };

  // Tooltip & hover behavior
  const onEachFeature = (feature, layer) => {
    const p = feature.properties || {};
    const isUploadedParcel = Boolean(
      (effectiveFeature && effectiveFeature.id && feature.id && effectiveFeature.id === feature.id) ||
      (docSurvey && isSurveyMatch(p.survey_number, docSurvey))
    );

    const tooltipContent = `
      <div class="text-xs space-y-1">
        <div class="font-bold text-white font-mono flex items-center justify-between gap-2">
          <span>Survey ${p.survey_number || 'N/A'}</span>
          ${isUploadedParcel ? '<span class="text-[9px] bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded font-sans font-bold">Active Uploaded Parcel</span>' : ''}
        </div>
        <div class="text-slate-300">Reg. Owner: ${p.owner_name || 'No Owner'}</div>
        <div class="text-slate-400 text-[11px]">${p.land_area_acres || '0'} Acres • ${p.village || 'N/A'}</div>
        ${isUploadedParcel ? `
          <div class="border-t border-slate-700/80 pt-1 mt-1 text-[11px]">
            <div class="font-semibold ${riskColors.text}">Risk Assessment: ${docRiskLevel} (${docRiskScore ?? 0}/100)</div>
          </div>
        ` : ''}
      </div>
    `;

    layer.bindTooltip(tooltipContent, { sticky: true, opacity: 0.95, className: 'leaflet-custom-tooltip' });

    layer.on({
      mouseover: (e) => {
        if (!isUploadedParcel) {
          e.target.setStyle({
            weight: 2.5,
            color: '#38bdf8',
            fillOpacity: 0.40
          });
        }
      },
      mouseout: (e) => {
        try {
          if (geoJsonRef.current && typeof geoJsonRef.current.resetStyle === 'function') {
            geoJsonRef.current.resetStyle(e.target);
          } else if (e.target && typeof e.target.setStyle === 'function') {
            e.target.setStyle(getFeatureStyle(feature));
          }
        } catch (err) {}
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Compass className="w-6 h-6 text-blue-400" />
              GIS Map & Spatial Boundaries
            </h2>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Cadastral Spatial Engine
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border flex items-center gap-1 ${
              apiSource === 'live'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-amber-950/70 text-amber-300 border-amber-800'
            }`}>
              {apiSource === 'live' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {apiSource === 'live' ? 'Live API Synced' : 'Bundled Synthetic GeoJSON'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Spatial polygon boundary analysis aligned with the active uploaded land deed and revenue registry.
          </p>
        </div>

        {/* Map Layer Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveLayer('cadastral')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeLayer === 'cadastral'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cadastral Map
          </button>
          <button
            onClick={() => setActiveLayer('satellite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeLayer === 'satellite'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Satellite Hybrid
          </button>
          <button
            onClick={() => setActiveLayer('encumbrance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeLayer === 'encumbrance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Disputed Overlaps
          </button>
        </div>
      </div>

      {/* Layer Notice Banners */}
      {activeLayer === 'satellite' && (
        <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 text-xs text-blue-200 flex items-start gap-2.5 shadow-sm">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <strong>Satellite Hybrid Mode:</strong> High-resolution global satellite imagery rendered via <em>Esri World Imagery</em>.
            <span className="block text-blue-300/80 mt-0.5">
              Notice: Displayed cadastral parcel boundaries are synthetic benchmark polygons in Ranga Reddy district. Official sub-meter cadastral satellite overlays require Telangana Survey & Land Records ETS/DGPS ground control points.
            </span>
          </div>
        </div>
      )}

      {activeLayer === 'encumbrance' && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <strong>Disputed Overlaps Mode:</strong> Filtering and highlighting synthetic boundary disputes.
            <span className="block text-amber-300/80 mt-0.5">
              Notice: The overlapping red dashed polygon visualizes claimed vs. registered deed coordinates for flagged parcels.
            </span>
          </div>
        </div>
      )}

      {/* Clean Two-Column Layout: Main GIS Map (lg:col-span-8) + Document Parcel Details & Risk Reasons (lg:col-span-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main / Left Area: Interactive Leaflet Map Canvas */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3 shadow-xl min-h-[640px] relative">
          {/* Map Top Bar */}
          <div className="flex items-center justify-between z-20 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                hasGeometry
                  ? 'bg-slate-950/90 text-slate-300 border-slate-800'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800'
              }`}>
                <MapPin className={`w-3.5 h-3.5 ${hasGeometry ? 'text-blue-400' : 'text-amber-400'}`} />
                {hasGeometry ? (
                  <span>Survey {docSurvey} • {villageMandalDisplay}</span>
                ) : (
                  <span>Parcel location unavailable: Survey {docSurvey || 'Unspecified'}</span>
                )}
              </span>

              {hasGeometry && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${riskColors.badge}`}>
                  {docRiskLevel} RISK HIGHLIGHT
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasGeometry && (
                <button
                  onClick={() => setResetKey((k) => k + 1)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
                  title="Center map on uploaded document's parcel"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  Center on Parcel
                </button>
              )}
              <button
                onClick={() => setResetKey((k) => k + 1)}
                className="px-2.5 py-1 bg-slate-950/90 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
                title="Reset view to region center"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                Reset View
              </button>
            </div>
          </div>

          {/* Location Unavailable Warning Banner if parcel geometry is missing */}
          {!hasGeometry && (
            <div className="bg-amber-950/50 border border-amber-800/80 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5 z-20">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <strong>Parcel location unavailable:</strong> The cadastral boundary polygon for Survey{' '}
                <strong className="font-mono text-amber-300">{docSurvey || 'Unspecified'}</strong> is not indexed in the current demonstration GIS dataset.
                <span className="block text-amber-300/80 mt-0.5">
                  The regional cadastral overview is displayed below without selecting or highlighting an unrelated parcel.
                </span>
              </div>
            </div>
          )}

          {/* Leaflet MapContainer Wrapper */}
          <div 
            className="w-full rounded-xl border border-slate-800 overflow-hidden relative z-10 shadow-inner bg-slate-950"
            style={{ height: '560px', minHeight: '560px' }}
          >
            {allFeatures.length === 0 && !isLoading ? (
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <h4 className="text-sm font-bold text-white">No Parcel Geometries Loaded</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Failed to parse GeoJSON polygon records. Check synthetic parcel files or backend connection.
                </p>
                <button
                  onClick={() => setGeoData(fallbackGeoJson)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500"
                >
                  Reload Bundled GeoJSON
                </button>
              </div>
            ) : (
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                scrollWheelZoom={true}
                className="w-full h-full"
                style={{ height: '100%', minHeight: '560px', width: '100%' }}
                attributionControl={true}
              >
                <MapController
                  targetBounds={targetBounds}
                  resetKey={resetKey}
                  defaultCenter={defaultCenter}
                  defaultZoom={defaultZoom}
                />

                <ScaleControl position="bottomleft" metric={true} imperial={false} />

                {/* Base Tile Layer */}
                {activeLayer === 'satellite' ? (
                  <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community"
                    maxZoom={19}
                  />
                ) : (
                  <TileLayer
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                  />
                )}

                {/* Cadastral GeoJSON Polygons Layer */}
                {allFeatures.length > 0 && (
                  <GeoJSON
                    key={`geojson_${activeLayer}_${docSurvey || 'none'}_${docRiskLevel}_${docRiskScore ?? 'none'}_${resetKey}`}
                    ref={geoJsonRef}
                    data={geoData}
                    style={getFeatureStyle}
                    onEachFeature={onEachFeature}
                  />
                )}

                {/* Active Document standalone geometry if not inside allFeatures */}
                {effectiveFeature?.geometry && !allFeatures.some((f) => isSurveyMatch(f.properties?.survey_number, docSurvey)) && (
                  <GeoJSON
                    key={`doc_standalone_${docId}_${docRiskLevel}`}
                    data={effectiveFeature}
                    style={getFeatureStyle}
                    onEachFeature={onEachFeature}
                  />
                )}

                {/* Disputed Overlap Visualizer for Demo Parcels */}
                {activeLayer === 'encumbrance' && mockGisParcelData?.claimedBoundary && (
                  <Polygon
                    positions={mockGisParcelData.claimedBoundary}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#f87171',
                      fillOpacity: 0.55,
                      dashArray: '6, 6',
                      weight: 2.5
                    }}
                  >
                    <Tooltip sticky>
                      <div className="text-xs font-sans">
                        <strong className="text-rose-400">Claimed Deed Boundary</strong>
                        <div>Survey 402/B Claim: 2.45 Acres</div>
                        <div className="text-amber-300">0.65 Acre Spatial Encroachment vs Registered 1.80 Acres</div>
                      </div>
                    </Tooltip>
                  </Polygon>
                )}
              </MapContainer>
            )}

            {/* Embedded Floating Map Legend */}
            <div className="absolute bottom-3 right-3 bg-slate-900/95 backdrop-blur border border-slate-700/80 p-2.5 rounded-xl shadow-xl z-[400] text-[11px] space-y-1.5 max-w-[210px]">
              <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>Map Legend</span>
                <span className="text-[9px] text-slate-400 font-mono">Risk Scoring</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0 border border-emerald-400" />
                  <span className="text-slate-300 text-[10px]">Low (0–29)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0 border border-amber-400" />
                  <span className="text-slate-300 text-[10px]">Medium (30–59)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0 border border-rose-400" />
                  <span className="text-slate-300 text-[10px]">High (60–79)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 shrink-0 border border-purple-400" />
                  <span className="text-slate-300 text-[10px]">Critical (80–100)</span>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-1 flex flex-col gap-1 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0 border-2"
                    style={{ backgroundColor: riskColors.fill, borderColor: riskColors.stroke }}
                  />
                  <span className="font-semibold text-slate-200">
                    Uploaded Parcel ({docRiskLevel})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Area: Selected Uploaded Document's Parcel Details & Risk Explanation */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Selected Parcel Info Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  Selected Parcel Info
                </h3>
                <p className="text-[11px] text-slate-400">Active Uploaded Deed Parameters</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold uppercase shrink-0">
                Active Document
              </span>
            </div>

            {effectiveDocument ? (
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Document ID</span>
                  <span className="font-mono font-bold text-slate-200 truncate max-w-[150px]" title={docId || 'Not available'}>
                    {docId || 'Not available'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Survey Number</span>
                  <span className="font-mono font-bold text-blue-300">
                    {docSurvey || 'Not available'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Claimed Owner</span>
                  <span className="font-bold text-white truncate max-w-[150px]" title={docOwner || 'Not available'}>
                    {docOwner || 'Not available'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Claimed Land Area</span>
                  <span className="font-bold text-white">
                    {docArea || 'Not available'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Village / Mandal</span>
                  <span className="font-bold text-white truncate max-w-[150px]" title={villageMandalDisplay}>
                    {villageMandalDisplay}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">District & State</span>
                  <span className="font-bold text-white truncate max-w-[150px]" title={districtDisplay}>
                    {districtDisplay}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Boundary Status</span>
                  {hasGeometry ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Cadastral Linked
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Parcel location unavailable
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center font-mono">
                  <span className="text-slate-400 font-sans font-semibold text-[11px]">Centroid Coordinates</span>
                  <span className="text-[11px] text-slate-300">
                    {centroid ? `${centroid.lat}, ${centroid.lng}` : 'Parcel location unavailable'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-300 font-semibold">No active document selected</p>
                <p className="text-[11px] text-slate-500">
                  Upload or select a document in the verification workflow to view its spatial parcel details.
                </p>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('upload')}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                  >
                    <Upload className="w-3 h-3" />
                    Go to Upload
                  </button>
                )}
              </div>
            )}

            {/* Action Button */}
            {hasGeometry && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => setResetKey((k) => k + 1)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  Center on Uploaded Parcel
                </button>
              </div>
            )}
          </div>

          {/* Card 2: Risk Assessment & Reasons Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Risk Assessment & Reasons
                </h3>
                <p className="text-[11px] text-slate-400">Automated Audit & Verification Findings</p>
              </div>
            </div>

            {/* Risk Metrics Summary Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-3 rounded-xl border text-center ${riskColors.bg} ${riskColors.border}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk Score</div>
                <div className={`text-base font-black font-mono mt-0.5 ${riskColors.text}`}>
                  {docRiskScore !== null && !isNaN(docRiskScore) ? `${docRiskScore} / 100` : 'Not available'}
                </div>
              </div>

              <div className={`p-3 rounded-xl border text-center ${riskColors.bg} ${riskColors.border}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk Category</div>
                <div className={`text-base font-black font-mono mt-0.5 ${riskColors.text}`}>
                  {docRiskLevel || 'Not available'}
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">Verification Status</span>
              {docVerificationStatus ? (
                <StatusBadge status={docVerificationStatus} />
              ) : (
                <span className="text-slate-400">Not available</span>
              )}
            </div>

            {/* Specific Reasons Section */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Audit Reasons & Discrepancies
              </div>

              {riskReasons.length > 0 ? (
                <div className="space-y-2">
                  {riskReasons.map((reason) => (
                    <div
                      key={reason.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{reason.title}</span>
                        </div>
                        {reason.points > 0 && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-900 shrink-0">
                            +{reason.points} pts
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {reason.whyItMatters}
                      </p>
                    </div>
                  ))}
                </div>
              ) : docRiskScore !== null && docRiskScore <= 20 ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/60 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No major inconsistencies detected.</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Cross-verification against official land revenue registry records did not detect any title discontinuities, area inflations, or encumbrance anomalies.
                  </p>
                </div>
              ) : docRiskScore !== null ? (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Elevated risk indicators were assigned during automated analysis. Detailed breakdown records are not available.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  Risk assessment details are currently unavailable for this document.
                </div>
              )}
            </div>

            {/* Non-defamatory Disclaimer Note */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[10px] text-slate-500 leading-relaxed">
              <strong className="text-slate-400 block mb-0.5">Administrative Notice:</strong>
              Risk indicators identify discrepancies requiring verification by revenue authorities and do not constitute an official determination of fraud. Synthetic demonstration data.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

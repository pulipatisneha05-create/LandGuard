import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polygon, ScaleControl, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getGisParcelsApi, getRiskAssessmentApi } from '../api/config';
import { mockGisParcelData } from '../data/mockData';
import { fallbackGeoJson } from '../data/parcelsGeoJson';
import {
  MapPin,
  Layers,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  RotateCcw,
  Compass,
  Wifi,
  WifiOff,
  Crosshair,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';

// Survey number matching utility with prefix normalization
export function isSurveyMatch(surveyA, surveyB) {
  if (!surveyA || !surveyB) return false;
  const a = String(surveyA).trim().toUpperCase();
  const b = String(surveyB).trim().toUpperCase();
  if (a === b) return true;

  // Normalize by stripping common prefixes like SYN-, SY-, SURVEY-, TEST-, DEMO-
  const cleanA = a.replace(/^(SYN-|SY-|SURVEY-)/, '').replace(/^(TEST-|DEMO-)/, '');
  const cleanB = b.replace(/^(SYN-|SY-|SURVEY-)/, '').replace(/^(TEST-|DEMO-)/, '');
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

// Subcomponent to handle programmatic map pan/zoom animations
function MapController({ targetBounds, resetKey, defaultCenter, defaultZoom }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (targetBounds && typeof targetBounds.isValid === 'function' && targetBounds.isValid()) {
      map.fitBounds(targetBounds, { padding: [60, 60], maxZoom: 16 });
    }
  }, [targetBounds, map]);

  useEffect(() => {
    if (resetKey > 0) {
      map.flyTo(defaultCenter, defaultZoom, { duration: 1.2 });
    }
  }, [resetKey, defaultCenter, defaultZoom, map]);

  return null;
}

export default function GisMap({ activeDocument, verificationResult }) {
  // Use fallback bundled synthetic GeoJSON as instant baseline data
  const [geoData, setGeoData] = useState(fallbackGeoJson);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [activeLayer, setActiveLayer] = useState('cadastral'); // 'cadastral' | 'satellite' | 'encumbrance'
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL'); // 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'DISPUTED'
  const [resetKey, setResetKey] = useState(0);
  const [apiSource, setApiSource] = useState('local'); // 'live' | 'local'
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedAssessment, setFetchedAssessment] = useState(null);

  const geoJsonRef = useRef(null);

  // Default coordinate center: Ranga Reddy / Hyderabad cadastral cluster
  const defaultCenter = [17.405, 78.355];
  const defaultZoom = 12;

  // Document metadata resolution
  const docId = activeDocument?.document_id || activeDocument?.id || activeDocument?.documentId || null;
  const docSurvey = activeDocument?.extracted_fields?.survey_number ||
                    activeDocument?.extracted_survey_number ||
                    activeDocument?.survey_number || null;
  const docOwner = activeDocument?.extracted_fields?.owner_name ||
                   activeDocument?.extracted_owner_name ||
                   activeDocument?.owner_name || null;
  const docArea = activeDocument?.extracted_fields?.land_area ??
                  activeDocument?.extracted_fields?.land_area_numeric ??
                  activeDocument?.extracted_land_area ??
                  activeDocument?.land_area ?? null;
  const docAreaUnit = activeDocument?.extracted_fields?.land_area_unit || 'Acres';

  // Fetch live risk assessment if not passed in props or if document changed
  useEffect(() => {
    if (docId && (!verificationResult || (verificationResult.document_id && verificationResult.document_id !== docId))) {
      getRiskAssessmentApi(docId)
        .then((data) => setFetchedAssessment(data))
        .catch((err) => console.warn("GIS notice: could not load live risk assessment:", err.message));
    }
  }, [docId, verificationResult]);

  const effectiveAssessment = useMemo(() => {
    if (verificationResult && (!verificationResult.document_id || verificationResult.document_id === docId)) {
      return verificationResult;
    }
    return fetchedAssessment;
  }, [verificationResult, fetchedAssessment, docId]);

  // Derived document risk metrics
  const docRiskScore = useMemo(() => {
    if (effectiveAssessment && typeof effectiveAssessment.risk_score === 'number') {
      return effectiveAssessment.risk_score;
    }
    if (activeDocument && typeof activeDocument.risk_score === 'number') {
      return activeDocument.risk_score;
    }
    return null;
  }, [effectiveAssessment, activeDocument]);

  const docRiskLevel = useMemo(() => {
    if (effectiveAssessment?.risk_level) return effectiveAssessment.risk_level.toUpperCase();
    if (activeDocument?.risk_level) return activeDocument.risk_level.toUpperCase();
    if (docRiskScore !== null) {
      if (docRiskScore >= 80) return 'CRITICAL';
      if (docRiskScore >= 60) return 'HIGH';
      if (docRiskScore >= 30) return 'MEDIUM';
      return 'LOW';
    }
    return null;
  }, [effectiveAssessment, activeDocument, docRiskScore]);

  const docVerificationStatus = useMemo(() => {
    return effectiveAssessment?.verification_status ||
           activeDocument?.verification_status ||
           effectiveAssessment?.status_summary?.overall_status ||
           '';
  }, [effectiveAssessment, activeDocument]);

  const isUnindexedDoc = useMemo(() => {
    if (docVerificationStatus === 'REFERENCE_NOT_FOUND' || docVerificationStatus === 'UNINDEXED') return true;
    if (docSurvey && String(docSurvey).toUpperCase().includes('UNINDEXED')) return true;
    return false;
  }, [docVerificationStatus, docSurvey]);

  // Load live GIS parcels from backend if available, keeping fallback resilient
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
        console.warn("GIS Backend API notice (using bundled synthetic GeoJSON fallback):", err.message);
        setGeoData(fallbackGeoJson);
        setApiSource('local');
        setIsLoading(false);
      });
  }, [docId]);

  // Features list
  const allFeatures = useMemo(() => geoData?.features || [], [geoData]);

  // Initial selection on mount or when activeDocument changes
  useEffect(() => {
    if (!allFeatures || allFeatures.length === 0) return;

    if (activeDocument && docSurvey) {
      const match = allFeatures.find((f) => isSurveyMatch(f.properties?.survey_number, docSurvey));
      if (match) {
        setSelectedParcel(match.properties);
        setSelectedFeature(match);
      } else {
        // Document is unindexed / reference not found: DO NOT fallback to allFeatures[0]
        setSelectedParcel(null);
        setSelectedFeature(null);
      }
    } else if (!activeDocument) {
      // Normal browse mode when no document is active
      if (!selectedParcel) {
        setSelectedParcel(allFeatures[0]?.properties || null);
        setSelectedFeature(allFeatures[0] || null);
      }
    }
  }, [allFeatures, activeDocument, docSurvey]);

  // Helper to resolve effective feature risk, separating document risk from reference risk
  const getEffectiveFeatureRisk = (feature) => {
    const p = feature?.properties || {};
    const refRisk = (p.reference_risk_level || p.risk_level || 'LOW').toUpperCase();

    // Check if this parcel is associated with the active analyzed document
    const isDocLinked = Boolean(activeDocument && docSurvey && isSurveyMatch(p.survey_number, docSurvey));

    if (isDocLinked) {
      const isElevated = Boolean(
        (docRiskScore !== null && docRiskScore >= 60) ||
        (docRiskLevel === 'HIGH' || docRiskLevel === 'CRITICAL') ||
        p.has_document_conflict
      );

      return {
        isDocLinked: true,
        riskLevel: isElevated ? (docRiskLevel || 'HIGH') : refRisk,
        isElevatedByDoc: isElevated,
        referenceRiskLevel: refRisk,
        docRiskScore: docRiskScore ?? (isElevated ? 60 : 0),
        docRiskLevel: docRiskLevel || (isElevated ? 'HIGH' : 'LOW')
      };
    }

    // Unlinked parcel: strictly reference parcel risk
    return {
      isDocLinked: false,
      riskLevel: refRisk,
      isElevatedByDoc: false,
      referenceRiskLevel: refRisk,
      docRiskScore: null,
      docRiskLevel: null
    };
  };

  // Dynamic search and filter logic
  const filteredFeatures = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    const queryClean = rawQuery.replace(/[\\/\-\s]/g, '');

    return allFeatures.filter((feat) => {
      const p = feat.properties || {};
      const effective = getEffectiveFeatureRisk(feat);

      // 1. Risk Tier Filter (respects elevated document risk when linked)
      let matchesRisk = true;
      if (riskFilter === 'DISPUTED') {
        matchesRisk = (p.conflict_status && p.conflict_status !== 'Clean') || effective.isElevatedByDoc;
      } else if (riskFilter !== 'ALL') {
        matchesRisk = effective.riskLevel === riskFilter;
      }
      if (!matchesRisk) return false;

      // 2. Search Query Filter (dynamic, case-insensitive, partial matching)
      if (!rawQuery) return true;

      const survey = String(p.survey_number || '').toLowerCase();
      const surveyClean = survey.replace(/[\\/\-\s]/g, '');
      const owner = String(p.owner_name || '').toLowerCase();
      const village = String(p.village || '').toLowerCase();
      const mandal = String(p.mandal || '').toLowerCase();
      const district = String(p.district || '').toLowerCase();
      const state = String(p.state || '').toLowerCase();
      const locationFull = `${village} ${mandal} ${district} ${state}`.toLowerCase();
      const locationClean = locationFull.replace(/[\\/\-\s]/g, '');

      if (
        survey.includes(rawQuery) ||
        owner.includes(rawQuery) ||
        village.includes(rawQuery) ||
        mandal.includes(rawQuery) ||
        district.includes(rawQuery) ||
        locationFull.includes(rawQuery)
      ) {
        return true;
      }

      if (queryClean.length >= 2) {
        if (surveyClean.includes(queryClean) || locationClean.includes(queryClean)) {
          return true;
        }
      }

      return false;
    });
  }, [allFeatures, searchQuery, riskFilter, activeDocument, docSurvey, docRiskScore, docRiskLevel]);

  // Handle selecting a parcel from list or search results
  const handleSelectParcel = (feat) => {
    if (!feat) return;
    setSelectedParcel(feat.properties);
    setSelectedFeature(feat);
  };

  // Compute selected parcel bounds for map zoom
  const targetBounds = useMemo(() => {
    if (!selectedFeature) return null;
    try {
      return L.geoJSON(selectedFeature).getBounds();
    } catch (e) {
      return null;
    }
  }, [selectedFeature]);

  // Centroid calculation for selected parcel
  const centroid = useMemo(() => {
    if (!selectedFeature) return null;
    try {
      const bounds = L.geoJSON(selectedFeature).getBounds();
      const c = bounds.getCenter();
      return { lat: c.lat.toFixed(5), lng: c.lng.toFixed(5) };
    } catch (e) {
      return null;
    }
  }, [selectedFeature]);

  // Risk styling palette
  const getRiskColor = (riskLevel) => {
    switch (riskLevel?.toUpperCase()) {
      case 'CRITICAL':
        return { fill: '#a855f7', stroke: '#7e22ce', text: 'text-purple-300', bg: 'bg-purple-950', border: 'border-purple-800' };
      case 'HIGH':
        return { fill: '#f43f5e', stroke: '#be123c', text: 'text-rose-400', bg: 'bg-rose-950', border: 'border-rose-900' };
      case 'MEDIUM':
        return { fill: '#f59e0b', stroke: '#b45309', text: 'text-amber-300', bg: 'bg-amber-950', border: 'border-amber-800' };
      case 'LOW':
      default:
        return { fill: '#10b981', stroke: '#047857', text: 'text-emerald-300', bg: 'bg-emerald-950', border: 'border-emerald-800' };
    }
  };

  // GeoJSON style callback
  const getFeatureStyle = (feature) => {
    const p = feature.properties || {};
    const effective = getEffectiveFeatureRisk(feature);
    const risk = getRiskColor(effective.riskLevel);

    const isSelected = selectedParcel && (
      (selectedFeature && selectedFeature.id && feature.id && selectedFeature.id === feature.id) ||
      (selectedParcel.survey_number === p.survey_number && selectedParcel.owner_name === p.owner_name) ||
      (selectedParcel.survey_number === p.survey_number)
    );
    const isDisputed = (p.conflict_status && p.conflict_status !== 'Clean') || effective.isElevatedByDoc;

    if (activeLayer === 'encumbrance') {
      if (isDisputed) {
        return {
          fillColor: '#dc2626',
          fillOpacity: isSelected ? 0.80 : 0.55,
          color: isSelected ? '#38bdf8' : '#ef4444',
          weight: isSelected ? 4 : 2.5,
          dashArray: isSelected ? null : '5, 5'
        };
      }
      return {
        fillColor: risk.fill,
        fillOpacity: 0.15,
        color: '#64748b',
        weight: 1,
        dashArray: null
      };
    }

    if (isSelected) {
      return {
        fillColor: risk.fill,
        fillOpacity: 0.75,
        color: '#38bdf8', // high-visibility sky-400 cyan selection border
        weight: 4,
        dashArray: null
      };
    }

    if (effective.isElevatedByDoc) {
      // Highlight parcel associated with suspicious / high-risk document
      return {
        fillColor: '#f43f5e',
        fillOpacity: 0.65,
        color: '#be123c',
        weight: 3,
        dashArray: null
      };
    }

    if (activeLayer === 'satellite') {
      return {
        fillColor: risk.fill,
        fillOpacity: 0.35,
        color: '#ffffff',
        weight: 2,
        dashArray: null
      };
    }

    return {
      fillColor: risk.fill,
      fillOpacity: 0.40,
      color: risk.stroke,
      weight: 1.5,
      dashArray: null
    };
  };

  // GeoJSON event callback
  const onEachFeature = (feature, layer) => {
    const p = feature.properties || {};
    const effective = getEffectiveFeatureRisk(feature);

    const tooltipContent = `
      <div class="text-xs space-y-1">
        <div class="font-bold text-white font-mono flex items-center justify-between gap-2">
          <span>Survey ${p.survey_number || 'N/A'}</span>
          ${effective.isDocLinked ? '<span class="text-[9px] bg-blue-900 text-blue-200 px-1 py-0.2 rounded font-sans">Active Doc Match</span>' : ''}
        </div>
        <div class="text-slate-300">Reg. Owner: ${p.owner_name || 'No Owner'}</div>
        <div class="text-slate-400 text-[11px]">${p.land_area_acres || '0'} Acres • ${p.village || 'N/A'}</div>
        <div class="border-t border-slate-700/80 pt-1 mt-1 text-[11px] flex flex-col gap-0.5">
          <div class="text-slate-400">Reference Parcel Risk: <span class="font-semibold ${
            effective.referenceRiskLevel === 'CRITICAL' ? 'text-purple-400' :
            effective.referenceRiskLevel === 'HIGH' ? 'text-rose-400' :
            effective.referenceRiskLevel === 'MEDIUM' ? 'text-amber-400' :
            'text-emerald-400'
          }">${effective.referenceRiskLevel}</span></div>
          ${effective.isDocLinked ? `
            <div class="font-semibold ${
              effective.docRiskLevel === 'HIGH' || effective.docRiskLevel === 'CRITICAL' ? 'text-rose-400' : 'text-emerald-400'
            }">Document Risk: ${effective.docRiskLevel || 'LOW'} (${effective.docRiskScore}/100)</div>
            ${effective.isElevatedByDoc ? '<div class="text-rose-300 font-bold text-[10px]">⚠️ Document Title / Extent Anomaly</div>' : ''}
          ` : ''}
        </div>
      </div>
    `;

    layer.bindTooltip(tooltipContent, { sticky: true, opacity: 0.95, className: 'leaflet-custom-tooltip' });

    layer.on({
      click: () => {
        handleSelectParcel(feature);
      },
      mouseover: (e) => {
        e.target.setStyle({
          weight: 3.5,
          color: '#38bdf8',
          fillOpacity: 0.75
        });
      },
      mouseout: (e) => {
        if (geoJsonRef.current) {
          geoJsonRef.current.resetStyle(e.target);
        }
      }
    });
  };

  // Determine linkage status of selected parcel
  const isLinkedToActiveDoc = Boolean(
    activeDocument &&
    docSurvey &&
    selectedParcel &&
    isSurveyMatch(selectedParcel.survey_number, docSurvey)
  );

  const selectedRefRisk = (selectedParcel?.reference_risk_level || selectedParcel?.risk_level || 'LOW').toUpperCase();
  const selectedRefRiskColor = getRiskColor(selectedRefRisk);
  const selectedEffective = selectedFeature
    ? getEffectiveFeatureRisk(selectedFeature)
    : selectedParcel
    ? getEffectiveFeatureRisk({ properties: selectedParcel })
    : null;

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
              Interactive React Leaflet Engine
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
            Real-time interactive Cadastral polygon boundaries mapped to Ranga Reddy district, Telangana revenue registries.
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

      {/* Active Document Context Banner */}
      {activeDocument && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              isUnindexedDoc
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                : docRiskScore >= 60
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
            }`}>
              {isUnindexedDoc ? (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              ) : docRiskScore >= 60 ? (
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-400">Active Document:</span>
                <span className="text-sm font-bold text-white font-mono">{docId || 'Uploaded Deed'}</span>
                <span className="text-xs text-slate-400">• Survey <strong className="text-blue-300 font-mono">{docSurvey || 'N/A'}</strong></span>
                {docOwner && <span className="text-xs text-slate-400">• Executant: <strong className="text-slate-200">{docOwner}</strong></span>}
                {docArea && <span className="text-xs text-slate-400">• Claimed: <strong className="text-slate-200">{docArea} {docAreaUnit}</strong></span>}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isUnindexedDoc
                  ? 'Reference Not Found / Unindexed — No cadastral polygon match in registry. Missing reference alone does not imply fraud.'
                  : docRiskScore >= 60
                  ? `High-risk title conflict detected on Survey ${docSurvey}. Cadastral reference polygon highlighted with elevated risk.`
                  : `Document claims verified against Cadastral Parcel ${docSurvey}. Clean title concordance.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={`px-3 py-1.5 rounded-xl border text-center ${
              isUnindexedDoc
                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                : docRiskScore >= 60
                ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
            }`}>
              <div className="text-[10px] font-bold uppercase tracking-wider">Document Risk</div>
              <div className="text-sm font-black font-mono">
                {isUnindexedDoc ? 'UNINDEXED' : `${docRiskLevel || 'LOW'} (${docRiskScore ?? 0}/100)`}
              </div>
            </div>

            {selectedParcel && (
              <div className="px-3 py-1.5 rounded-xl border bg-slate-950 border-slate-800 text-slate-300 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Linked Parcel</div>
                <div className="text-sm font-bold font-mono text-blue-400">
                  Survey {selectedParcel.survey_number}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Layer Honest Notice Banner */}
      {activeLayer === 'satellite' && (
        <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 text-xs text-blue-200 flex items-start gap-2.5 shadow-sm">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <strong>Satellite Hybrid Mode:</strong> High-resolution global satellite imagery rendered via <em>Esri World Imagery</em>.
            <span className="block text-blue-300/80 mt-0.5">
              Notice: Displayed cadastral parcel boundaries are synthetic benchmark polygons in Ranga Reddy district. Official sub-meter government cadastral satellite overlays require Telangana Survey & Land Records ETS/DGPS ground control points.
            </span>
          </div>
        </div>
      )}

      {activeLayer === 'encumbrance' && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <strong>Disputed Overlaps Mode:</strong> Filtering and highlighting synthetic boundary disputes (Survey 501/A duplicate sale, Survey 402/B 0.65-acre encroachment, Survey 601/A rapid flipping, Survey 201/A identity mismatch).
            <span className="block text-amber-300/80 mt-0.5">
              Notice: The overlapping red dashed polygon visualizes claimed vs. registered deed coordinates for flagged parcels. Automated geometric polygonal intersection calculation requires PostGIS geometry extensions.
            </span>
          </div>
        </div>
      )}

      {/* Main 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parcel Search & Selector List */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg flex flex-col h-[580px]">
          <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">GeoJSON Parcels</h3>
            </div>
            <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
              {filteredFeatures.length} / {allFeatures.length}
            </span>
          </div>

          {/* Search Input with Clear Button */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search survey, owner, or village..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Risk Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-semibold">
            {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'DISPUTED'].map((tier) => (
              <button
                key={tier}
                onClick={() => setRiskFilter(tier)}
                className={`px-2 py-0.5 rounded transition-all shrink-0 ${
                  riskFilter === tier
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Scrollable Parcel List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredFeatures.length === 0 ? (
              <div className="text-center py-10 px-3 space-y-3 bg-slate-950/40 rounded-xl border border-slate-800/80 my-2">
                <div className="w-9 h-9 rounded-full bg-slate-800/60 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-200">No matching parcels found</h4>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                    No parcels match <span className="text-blue-300 font-mono font-semibold">"{searchQuery}"</span>
                    {riskFilter !== 'ALL' && <span> with <span className="text-amber-300 font-semibold">{riskFilter}</span> filter</span>}.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setRiskFilter('ALL');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  Reset Search & Filters
                </button>
              </div>
            ) : (
              filteredFeatures.map((feat) => {
                const p = feat.properties || {};
                const effective = getEffectiveFeatureRisk(feat);
                const isSelected = selectedParcel && (
                  (selectedFeature && selectedFeature.id && feat.id && selectedFeature.id === feat.id) ||
                  (selectedParcel.survey_number === p.survey_number && selectedParcel.owner_name === p.owner_name) ||
                  (selectedParcel.survey_number === p.survey_number)
                );
                const risk = getRiskColor(effective.riskLevel);
                const hasConflict = (p.conflict_status && p.conflict_status !== 'Clean') || effective.isElevatedByDoc;

                return (
                  <button
                    key={feat.id || p.survey_number}
                    onClick={() => handleSelectParcel(feat)}
                    className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 text-blue-200 ring-1 ring-blue-500/40 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                        <span>Survey {p.survey_number}</span>
                        {hasConflict && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Disputed or title conflict parcel" />
                        )}
                        {effective.isDocLinked && (
                          <span className="text-[8px] bg-blue-900 text-blue-200 px-1 rounded">MATCH</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{p.owner_name || 'Unspecified'}</div>
                      <div className="text-[10px] text-slate-500">{p.land_area_acres} Acres • {p.village}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${risk.bg} ${risk.text} ${risk.border}`}>
                      {effective.riskLevel}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Center: Interactive Leaflet Map Canvas */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3 shadow-xl h-[580px] relative">
          {/* Map Top Bar */}
          <div className="flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-300 bg-slate-950/90 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                {selectedParcel ? (
                  <span>Survey {selectedParcel.survey_number} • {selectedParcel.village || 'Ranga Reddy'}</span>
                ) : (
                  <span>No Parcel Selected • Cadastral View</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
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

          {/* Leaflet MapContainer */}
          <div className="flex-1 rounded-xl border border-slate-800 overflow-hidden relative z-10 shadow-inner">
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
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                  />
                )}

                {/* Cadastral GeoJSON Polygons Layer: Key reflects active selection and document risk */}
                {allFeatures.length > 0 && (
                  <GeoJSON
                    key={`geojson_${activeLayer}_${selectedParcel?.survey_number || 'none'}_${selectedFeature?.id || 'none'}_${riskFilter}_${docId || 'none'}_${docRiskScore ?? 'none'}`}
                    ref={geoJsonRef}
                    data={geoData}
                    style={getFeatureStyle}
                    onEachFeature={onEachFeature}
                  />
                )}

                {/* Disputed Overlap Visualizer: Render Claimed Boundary for Survey 402/B when in disputed mode */}
                {activeLayer === 'encumbrance' && (
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
            <div className="absolute bottom-3 right-3 bg-slate-900/95 backdrop-blur border border-slate-700/80 p-2.5 rounded-xl shadow-xl z-[400] text-[11px] space-y-1.5 max-w-[190px]">
              <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>Map Legend</span>
                <span className="text-[9px] text-slate-400">Risk & CAD</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0 border border-emerald-400" />
                  <span className="text-slate-300 text-[10px]">Low (0-29)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0 border border-amber-400" />
                  <span className="text-slate-300 text-[10px]">Med (30-59)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0 border border-rose-400" />
                  <span className="text-slate-300 text-[10px]">High (60-79)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 shrink-0 border border-purple-400" />
                  <span className="text-slate-300 text-[10px]">Critical (80+)</span>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-1 flex flex-col gap-1 text-[10px]">
                <div className="flex items-center gap-1.5 text-sky-300">
                  <span className="w-2.5 h-2.5 rounded-sm border-2 border-sky-400 bg-transparent shrink-0" />
                  <span>Selected Parcel</span>
                </div>
                {activeDocument && docRiskScore >= 60 && (
                  <div className="flex items-center gap-1.5 text-rose-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 border border-rose-400 shrink-0" />
                    <span>Doc Risk Conflict</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Parcel Information Panel */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between h-[580px]">
          {!selectedParcel ? (
            /* Unindexed / No Linked Parcel State */
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-400" />
                      Cadastral Linkage
                    </h3>
                    <p className="text-[11px] text-slate-400">Spatial Polygon Resolution</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-950 text-amber-300 border-amber-800">
                    NO LINKED PARCEL
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Unindexed Survey Number</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Survey <strong className="text-amber-200 font-mono">{docSurvey || 'N/A'}</strong> has no corresponding cadastral boundary polygon in the current GIS registry dataset.
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Document Survey</span>
                    <span className="font-mono font-bold text-amber-300">{docSurvey || 'N/A'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Claimed Executant</span>
                    <span className="font-bold text-white truncate max-w-[130px]">{docOwner || 'N/A'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Claimed Acreage</span>
                    <span className="font-bold text-white">{docArea ? `${docArea} ${docAreaUnit}` : 'N/A'}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Document Risk</span>
                    <span className="font-mono font-bold text-emerald-400">LOW (0/100)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-slate-200 block mb-1">LandGuard Policy:</strong>
                  Missing reference records alone are never scored as fraud. No unrelated parcel is selected or recolored.
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    if (allFeatures.length > 0) {
                      handleSelectParcel(allFeatures[0]);
                    }
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Search className="w-3.5 h-3.5 text-blue-400" />
                  Browse Cadastral Parcels
                </button>
              </div>
            </div>
          ) : isLinkedToActiveDoc ? (
            /* Linked Parcel with Dual-Track Risk Assessment */
            <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
              <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Selected Parcel Info
                  </h3>
                  <p className="text-[11px] text-slate-400">Survey {selectedParcel.survey_number} • {selectedParcel.village || 'Ranga Reddy'}</p>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  ACTIVE DOC LINK
                </span>
              </div>

              {/* Dual-Track Risk Assessment Display */}
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded-xl border text-center ${
                  selectedEffective?.isElevatedByDoc
                    ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                    : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                }`}>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Document Risk</div>
                  <div className="text-xs font-extrabold font-mono mt-0.5">
                    {selectedEffective?.docRiskLevel || 'LOW'} ({selectedEffective?.docRiskScore ?? 0}/100)
                  </div>
                </div>

                <div className={`p-2 rounded-xl border text-center ${selectedRefRiskColor.bg} ${selectedRefRiskColor.border} ${selectedRefRiskColor.text}`}>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Reference Parcel</div>
                  <div className="text-xs font-extrabold font-mono mt-0.5">
                    {selectedRefRisk}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Survey Sub-division</span>
                  <span className="font-mono font-bold text-blue-300">{selectedParcel.survey_number}</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Registered Owner</span>
                  <span className="font-bold text-white truncate max-w-[130px]" title={selectedParcel.owner_name}>
                    {selectedParcel.owner_name || 'N/A'}
                  </span>
                </div>

                {docOwner && docOwner !== selectedParcel.owner_name && (
                  <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/60 flex justify-between items-center text-rose-300">
                    <span className="text-[11px] font-semibold">Claimed Executant</span>
                    <span className="font-bold text-xs truncate max-w-[130px]" title={docOwner}>{docOwner}</span>
                  </div>
                )}

                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Parcel Acreage</span>
                  <span className="font-bold text-white">{selectedParcel.land_area_acres} Acres</span>
                </div>

                {docArea && (
                  <div className={`p-2 rounded-lg border flex justify-between items-center ${
                    selectedEffective?.isElevatedByDoc
                      ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}>
                    <span className="text-[11px] font-semibold">Claimed Acreage</span>
                    <span className="font-bold text-xs">{docArea} {docAreaUnit}</span>
                  </div>
                )}

                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Location</span>
                  <span className="font-bold text-white truncate max-w-[130px]">
                    {selectedParcel.village}, {selectedParcel.district || 'Demo District'}
                  </span>
                </div>

                {centroid && (
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center font-mono">
                    <span className="text-slate-400 font-sans font-semibold text-[11px]">Centroid (Lat, Lng)</span>
                    <span className="text-[10px] text-slate-300">{centroid.lat}, {centroid.lng}</span>
                  </div>
                )}
              </div>

              {/* Conflict / Anomaly Status */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Anomaly / Conflict Status</span>
                {selectedEffective?.isElevatedByDoc || (selectedParcel.conflict_status && selectedParcel.conflict_status !== 'Clean') ? (
                  <div className="flex items-start gap-1.5 text-xs text-rose-300 font-semibold leading-snug">
                    <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <span>
                      {selectedParcel.conflict_status && selectedParcel.conflict_status !== 'Clean'
                        ? selectedParcel.conflict_status
                        : `Title / extent conflict: Claimed ${docArea || '12.50'} ${docAreaUnit} vs ${selectedParcel.land_area_acres} Registered Acres`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Clean Cadastral Title — Verified Match</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Unlinked parcel selection (browsing) */
            <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
              <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Selected Parcel Info
                  </h3>
                  <p className="text-[11px] text-slate-400">GIS Cadastral Properties</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${selectedRefRiskColor.bg} ${selectedRefRiskColor.text} ${selectedRefRiskColor.border}`}>
                  {selectedRefRisk}
                </span>
              </div>

              {activeDocument && (
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Unlinked to active document</span>
                  <button
                    onClick={() => {
                      if (docSurvey) {
                        const match = allFeatures.find((f) => isSurveyMatch(f.properties?.survey_number, docSurvey));
                        if (match) handleSelectParcel(match);
                      }
                    }}
                    className="text-blue-400 hover:text-blue-300 font-semibold underline text-[11px]"
                  >
                    Back to Survey {docSurvey}
                  </button>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Survey Sub-division</span>
                  <span className="font-mono font-bold text-blue-300">{selectedParcel.survey_number}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Registered Owner</span>
                  <span className="font-bold text-white truncate max-w-[140px]">{selectedParcel.owner_name || 'N/A'}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Parcel Acreage</span>
                  <span className="font-bold text-white">{selectedParcel.land_area_acres} Acres</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Village / Mandal</span>
                  <span className="font-bold text-white truncate max-w-[140px]">
                    {selectedParcel.village}, {selectedParcel.mandal || 'RR'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">District & State</span>
                  <span className="font-bold text-white">{selectedParcel.district || 'Ranga Reddy'}, {selectedParcel.state || 'Telangana'}</span>
                </div>
                {centroid && (
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center font-mono">
                    <span className="text-slate-400 font-sans font-semibold text-[11px]">Centroid (Lat, Lng)</span>
                    <span className="text-[10px] text-slate-300">{centroid.lat}, {centroid.lng}</span>
                  </div>
                )}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Conflict Status</span>
                  {selectedParcel.conflict_status && selectedParcel.conflict_status !== 'Clean' ? (
                    <div className="flex items-start gap-1.5 text-xs text-rose-300 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                      <span>{selectedParcel.conflict_status}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Clean Cadastral Title</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons (only when a parcel is selected) */}
          {selectedParcel && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  if (targetBounds) {
                    setSelectedFeature({ ...selectedFeature });
                  }
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Crosshair className="w-3.5 h-3.5" />
                Center on Selected Parcel
              </button>
              <p className="text-[10px] text-center text-slate-500">
                Cadastral boundaries derived from synthetic test fixtures.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

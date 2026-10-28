import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import RiskScoreBadge from '../components/RiskScoreBadge';
import { getVerificationApi } from '../api/config';
import { mockSelectedRecord } from '../data/mockData';
import { evaluateDocumentRisk } from '../utils/verificationEvaluator';

export default function VerificationResults({ activeDocument, verificationResult, onVerificationComplete, onNavigate }) {
  const [verData, setVerData] = useState(verificationResult);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (verificationResult && verificationResult.risk_score != null) {
      setVerData(verificationResult);
      return;
    }

    const docId = activeDocument?.document_id || "DOC-2026-8901";
    setIsLoading(true);
    getVerificationApi(docId)
      .then((data) => {
        setVerData(data);
        if (onVerificationComplete) {
          onVerificationComplete(data);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Verification API notice, evaluating rule baseline:", err.message);
        if (activeDocument) {
          const evaluated = evaluateDocumentRisk(activeDocument);
          if (evaluated) {
            setVerData(evaluated);
            if (onVerificationComplete) {
              onVerificationComplete(evaluated);
            }
          }
        }
        setIsLoading(false);
      });
  }, [activeDocument, verificationResult, onVerificationComplete]);

  const docId = activeDocument?.document_id || verData?.document_id || "DOC-UNASSIGNED";
  const verStatus = verData?.verification_status || (activeDocument ? "PENDING" : "UNVERIFIED");
  const isReferenceNotFound = verStatus === "REFERENCE_NOT_FOUND" || verData?.reference_status === "NO_MATCHING_REFERENCE";
  const riskScore = verData?.risk_score != null ? verData.risk_score : (isReferenceNotFound ? 0 : null);
  const riskLevel = verData?.risk_level || (riskScore != null ? (riskScore >= 80 ? "CRITICAL" : riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW") : null);

  const docFields = activeDocument?.extracted_nlp_fields || activeDocument?.extracted_fields || {};
  const docRawArea = docFields.land_area_raw || (docFields.land_area_unit ? `${docFields.land_area_numeric} ${docFields.land_area_unit}` : (docFields.land_area_acres ? `${docFields.land_area_acres} Acres` : null));
  const docNormAcres = docFields.land_area_normalized_acres != null ? docFields.land_area_normalized_acres : docFields.land_area_acres;

  const matchedRec = verData?.matched_land_record || {
    owner_name: activeDocument ? (isReferenceNotFound ? "Unindexed in Demo Layer" : "Checking registry...") : "No Record",
    survey_number: docFields.survey_number || "N/A",
    land_area_acres: docNormAcres || 0.0,
    village: docFields.village || "N/A",
    district: docFields.district || "N/A"
  };

  const fieldMatches = verData?.field_matches || {
    owner_match: false,
    survey_number_match: false,
    land_area_match: false
  };

  const detectedAnomalies = verData?.detected_anomalies || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Verification Results</h2>
            <StatusBadge status={verStatus} />
            {riskScore != null ? (
              <RiskScoreBadge score={riskScore} size="sm" />
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                Risk Score: Not available
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Automated cross-matching of deed attributes against official Government Land Revenue Registry databases ({docId}).
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs md:text-sm rounded-lg transition-all shadow-md"
            title="Print or Save Verification Audit as PDF"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print / PDF Report</span>
          </button>
          <button 
            onClick={() => onNavigate('risk')}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-xs md:text-sm rounded-lg transition-all shadow-md cursor-pointer"
          >
            <span>Risk Score Audit</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Informational banner when parcel is not in synthetic demonstration registry */}
      {isReferenceNotFound && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800 text-blue-200 text-xs flex items-start gap-3 shadow-md">
          <span className="text-lg">ℹ️</span>
          <div>
            <strong className="block text-sm text-blue-300 font-bold mb-1">
              No Matching Reference Record Available in Demo Dataset (Synthetic Registry)
            </strong>
            <p className="text-slate-300 leading-relaxed">
              The survey number extracted from this document is not currently indexed in the synthetic demonstration database.
              This represents an unindexed parcel in the prototype layer, not fraud, title invalidity, or fake ownership.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 text-sm animate-pulse">
          Cross-matching deed details against land registry database...
        </div>
      ) : (
        <>
          {/* Key Attributes Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] font-bold uppercase text-slate-500 block">Fraud Risk Index</span>
              <span className="text-base font-bold text-white mt-1 block">
                {riskScore != null ? `${riskScore} / 100` : (isReferenceNotFound ? "0 / 100" : "Assessing...")}
              </span>
              <span className={`text-xs font-semibold ${
                riskLevel === 'CRITICAL' ? 'text-purple-400' :
                riskLevel === 'HIGH' ? 'text-rose-400' :
                riskLevel === 'MEDIUM' ? 'text-amber-400' :
                'text-emerald-400'
              }`}>
                {riskLevel ? `${riskLevel} Risk` : (isReferenceNotFound ? "Unindexed (0 pts)" : "Normal")}
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] font-bold uppercase text-slate-500 block">Owner Name Match</span>
              <span className="text-base font-bold text-white mt-1 block">
                {isReferenceNotFound ? "Unindexed" : fieldMatches.owner_match ? "Matched" : "Mismatch"}
              </span>
              <span className={`text-xs font-medium ${isReferenceNotFound ? 'text-blue-400' : fieldMatches.owner_match ? 'text-emerald-400' : 'text-rose-400'}`}>
                Govt: {matchedRec.owner_name}
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] font-bold uppercase text-slate-500 block">Survey Number</span>
              <span className="text-base font-bold text-blue-300 font-mono mt-1 block">
                {matchedRec.survey_number}
              </span>
              <span className={`text-xs font-medium ${isReferenceNotFound ? 'text-blue-400' : fieldMatches.survey_number_match ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isReferenceNotFound ? "Not in Demo Layer" : fieldMatches.survey_number_match ? "Cadastral Matched" : "Unmatched"}
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] font-bold uppercase text-slate-500 block">Land Area Comparison</span>
              <span className="text-sm font-bold text-white mt-1 block">
                Govt: {isReferenceNotFound ? "N/A" : `${matchedRec.land_area_acres} Acres`}
              </span>
              <div className="text-xs text-slate-300 mt-0.5">
                <span className="text-slate-400">Doc: </span>
                {docRawArea ? (
                  !docRawArea.toLowerCase().includes("acre") && docNormAcres != null
                    ? <span><strong className="text-blue-300 font-bold">{docRawArea}</strong> <span className="text-[11px] font-mono text-slate-400">(≈ {Number(docNormAcres).toFixed(4)} Ac)</span></span>
                    : <strong className="text-blue-300 font-bold">{docRawArea}</strong>
                ) : (
                  <span className="text-slate-500">Not specified</span>
                )}
              </div>
              <span className={`text-[11px] font-medium mt-1 block ${isReferenceNotFound ? 'text-slate-400' : fieldMatches.land_area_match ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isReferenceNotFound ? "No registry baseline" : fieldMatches.land_area_match ? "✓ Area Matched" : "⚠ Discrepancy Flagged"}
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] font-bold uppercase text-slate-500 block">Location & District</span>
              <span className="text-base font-bold text-white mt-1 block truncate">
                {matchedRec.village !== "N/A" ? `${matchedRec.village}, ${matchedRec.district}` : "Not Specified"}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {fieldMatches.spatial_match ? "GIS Boundary Verified" : "Cadastral Layer"}
              </span>
            </div>
          </div>

          {/* Explanation of Detected Issues Box */}
          {detectedAnomalies.length > 0 ? (
            <div className="bg-slate-900 border border-rose-900/50 rounded-xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-rose-950 text-rose-400 border border-rose-800">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">Explanation of Detected Issues & Anomalies</h3>
                    <p className="text-xs text-rose-300">
                      Rule verification engine flagged {detectedAnomalies.length} anomaly issues.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {detectedAnomalies.map((issue, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{idx + 1}. {issue.title || issue.type}</span>
                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${
                          issue.severity === 'Critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                          issue.severity === 'High' ? 'bg-rose-950/80 text-rose-400 border border-rose-900' :
                          issue.severity === 'Medium' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}>
                          {issue.severity || 'High'} Priority
                        </span>
                        {issue.points_added != null && Number(issue.points_added) > 0 && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-900">
                            +{issue.points_added} pts
                          </span>
                        )}
                      </div>
                    </div>

                    {issue.expected && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Expected (Government Record)</span>
                          {issue.expected}
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Found (Uploaded Document)</span>
                          {issue.found}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-300 leading-relaxed pt-1">
                      {issue.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-6 space-y-2 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Clean Verification: No Inconsistencies Detected</h3>
                  <p className="text-xs text-emerald-300">
                    Cross-verification against official land revenue registry records did not detect any title discontinuities, area discrepancies, or encumbrance anomalies.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommended Next Steps & Protocol */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="text-blue-400">📋</span>
              <span>Recommended Revenue Actions & Verification Protocol</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">1. Revenue Registry Validation</span>
                <p className="text-slate-400">
                  {verStatus === 'VERIFIED_MATCH'
                    ? "Title holder and survey number align with digital registry. No manual deed cross-checking required."
                    : isReferenceNotFound
                    ? "Survey is unindexed in synthetic test dataset. Ingest official cadastral records to verify record history."
                    : "Obtain certified copy of title deed from SRO to reconcile identified ownership/area conflicts."}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">2. Field Boundary Survey</span>
                <p className="text-slate-400">
                  {fieldMatches.land_area_match
                    ? "Cadastral extent confirmed within tolerance boundaries. No boundary encroachment detected."
                    : "Conduct differential GPS (DGPS) or total station field survey to verify claimed boundaries on ground."}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200 block">3. Legal Encumbrance Audit</span>
                <p className="text-slate-400">
                  Verify EC Search Certificate for 30-year period across local sub-registrar office to ensure non-alienation and clear title.
                </p>
              </div>
            </div>
          </div>

          {/* Formal Audit Report Footer & Limitations Notice */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-blue-400 font-bold">LandGuard Audit Ref: {verData?.verification_id || `VER-${docId}`}</span>
              <span>•</span>
              <span>Algorithm: Deterministic Rule Matrix v2.1</span>
            </div>
            <div className="text-slate-500 text-center md:text-right">
              Educational Demonstration Prototype — Uses Synthetic Data — Not an Official Government Certification.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

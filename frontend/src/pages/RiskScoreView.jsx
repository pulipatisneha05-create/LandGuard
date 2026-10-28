import React, { useEffect, useState } from 'react';
import RiskScoreBadge from '../components/RiskScoreBadge';
import { getRiskAssessmentApi } from '../api/config';
import { mockRiskBreakdown } from '../data/mockData';
import { evaluateDocumentRisk, ANOMALY_WEIGHTS } from '../utils/verificationEvaluator';

const DEFAULT_FALLBACK_ANOMALIES = [
  {
    anomaly_type: "OWNER_NAME_MISMATCH",
    title: "Ownership Identity Mismatch",
    severity: "High",
    points_added: 25,
    description: "Document claims ownership under an executant differing from official Revenue Registry."
  },
  {
    anomaly_type: "LAND_AREA_MISMATCH",
    title: "Land Area Inflation Anomaly",
    severity: "High",
    points_added: 20,
    description: "Document claims land extent exceeding the official Cadastral map parcel boundary."
  }
];

export default function RiskScoreView({ activeDocument, verificationResult, onNavigate, onProceedToHistory }) {
  const [riskData, setRiskData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoToHistory = onProceedToHistory || (() => onNavigate && onNavigate('history'));
  const docId = activeDocument?.document_id || verificationResult?.document_id || "DOC-2026-8901";

  useEffect(() => {
    setIsLoading(true);
    getRiskAssessmentApi(docId)
      .then((data) => {
        setRiskData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Risk API notice, using local evaluation:", err.message);
        if (!verificationResult && activeDocument) {
          const evaluated = evaluateDocumentRisk(activeDocument);
          if (evaluated) {
            setRiskData(evaluated);
          }
        }
        setIsLoading(false);
      });
  }, [docId, activeDocument, verificationResult]);

  const effectiveResult =
    riskData ||
    verificationResult ||
    (activeDocument ? evaluateDocumentRisk(activeDocument) : null);

  const verStatus =
    effectiveResult?.verification_status ||
    (activeDocument ? "PENDING" : "UNVERIFIED");

  const isReferenceNotFound =
    verStatus === "REFERENCE_NOT_FOUND" ||
    effectiveResult?.reference_status === "NO_MATCHING_REFERENCE";

  // Derive breakdown from live risk data, shared verification result, or evaluated result
  const breakdown =
    effectiveResult?.scoring_breakdown && effectiveResult.scoring_breakdown.length > 0
      ? effectiveResult.scoring_breakdown
      : effectiveResult?.detected_anomalies && effectiveResult.detected_anomalies.length > 0
      ? effectiveResult.detected_anomalies
      : [];

  const score =
    effectiveResult?.risk_score != null
      ? effectiveResult.risk_score
      : breakdown.length > 0
      ? Math.min(
          breakdown.reduce((sum, item) => sum + (Number(item.points_added) || 0), 0),
          100
        )
      : null;

  // Normalize risk level category for consistent UI threshold highlights
  const rawLevel =
    effectiveResult?.risk_level ||
    (score != null
      ? score >= 80
        ? 'CRITICAL'
        : score >= 60
        ? 'HIGH'
        : score >= 30
        ? 'MEDIUM'
        : 'LOW'
      : null);
  const normalizedLevel = rawLevel
    ? (rawLevel || '').toUpperCase().replace(' RISK', '').trim()
    : 'NOT AVAILABLE';

  const recommendation =
    effectiveResult?.recommendation ||
    (score != null
      ? normalizedLevel === 'LOW'
        ? "No major inconsistency detected across registry records."
        : normalizedLevel === 'MEDIUM'
        ? "Manual administrative review recommended."
        : normalizedLevel === 'HIGH'
        ? "Further verification required: Multiple significant discrepancies found."
        : "Immediate detailed verification required."
      : "Not available");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Risk Score & Fraud Audit</h2>
          <p className="text-sm text-slate-400 mt-1">
            Explainable risk scoring breakdown for document ({docId}) calculated by summing weights of detected anomalies.
          </p>
        </div>

        <div className="flex items-center gap-2 no-print flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs md:text-sm rounded-lg transition-all shadow-md"
            title="Print or Save Risk Audit as PDF"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print / PDF Audit</span>
          </button>
          <button
            onClick={handleGoToHistory}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs md:text-sm rounded-lg transition-all shadow-md cursor-pointer"
          >
            <span>View Ownership History</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 text-sm animate-pulse">
          Computing explainable risk assessment score...
        </div>
      ) : (
        <>
          {/* Informational banner distinguishing 0-point risk score from unverified reference status */}
          {isReferenceNotFound && (
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800 text-blue-200 text-xs flex items-start gap-3 shadow-md">
              <span className="text-lg">ℹ️</span>
              <div>
                <strong className="block text-sm text-blue-300 font-bold mb-1">
                  Verification Status: Reference Not Found / Unindexed (Risk Score: 0/100)
                </strong>
                <p className="text-slate-300 leading-relaxed">
                  No fraud or forged attribute anomalies were identified in the document text, resulting in 0 risk penalty points.
                  However, because this parcel is not indexed in the synthetic demonstration registry, it remains <strong>UNVERIFIED</strong>.
                  A 0-point risk score does not imply official government verification.
                </p>
              </div>
            </div>
          )}

          {/* Visual Risk Gauge & Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5">
              <RiskScoreBadge score={score} />
            </div>

            {/* Risk Categories Visual Meter */}
            <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Risk Level Category Thresholds
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className={`p-2.5 rounded-lg border text-center space-y-0.5 ${normalizedLevel === 'LOW' ? 'ring-2 ring-emerald-500 bg-emerald-950/60' : 'bg-slate-950 border-slate-800'}`}>
                    <span className="text-[11px] font-bold text-emerald-400 block">LOW</span>
                    <span className="text-sm font-black text-emerald-300">0 - 29</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border text-center space-y-0.5 ${normalizedLevel === 'MEDIUM' ? 'ring-2 ring-amber-500 bg-amber-950/60' : 'bg-slate-950 border-slate-800'}`}>
                    <span className="text-[11px] font-bold text-amber-400 block">MEDIUM</span>
                    <span className="text-sm font-black text-amber-300">30 - 59</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border text-center space-y-0.5 ${normalizedLevel === 'HIGH' ? 'ring-2 ring-rose-500 bg-rose-950/60' : 'bg-slate-950 border-slate-800'}`}>
                    <span className="text-[11px] font-bold text-rose-400 block">HIGH</span>
                    <span className="text-sm font-black text-rose-300">60 - 79</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border text-center space-y-0.5 ${normalizedLevel === 'CRITICAL' ? 'ring-2 ring-purple-500 bg-purple-950/60' : 'bg-slate-950 border-slate-800'}`}>
                    <span className="text-[11px] font-bold text-purple-400 block">CRITICAL</span>
                    <span className="text-sm font-black text-purple-300">80 - 100</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                {riskData?.status_summary && (
                  <div className="text-[11px] font-bold text-slate-400">
                    Status: <span className="text-slate-200">{riskData.status_summary}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-400 block">Verification Recommendation:</span>
                    <span className="text-sm font-bold text-white">{recommendation}</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-800 rounded border border-slate-700 text-slate-300">
                    {score != null ? `${score} / 100 Pts` : 'Not available'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Point Breakdown Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Transparent Anomaly Point Breakdown</h3>

            <div className="space-y-3">
              {breakdown.length > 0 ? (
                breakdown.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{item.title || item.issue_type || item.anomaly_type}</span>
                        {Number(item.points_added) > 0 ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                            +{item.points_added} Points Added
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                            0 Points (Informational)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {item.severity ? `${item.severity} Severity` : "Info"}
                      </span>
                    </div>
                    {item.reason_for_points && (
                      <div className="text-xs text-blue-300/90 font-medium">
                        ↳ {item.reason_for_points}
                      </div>
                    )}
                    {item.expected && item.found && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Expected</span>
                          {item.expected}
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Found</span>
                          {item.found}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 leading-relaxed pt-1">
                      {item.description}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/40 text-emerald-300 text-xs flex items-center gap-2">
                  <span>✓</span>
                  <span>No record inconsistencies or fraud anomalies detected for this document.</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

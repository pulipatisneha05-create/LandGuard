import React from 'react';
import StatusBadge from '../components/StatusBadge';
import RiskScoreBadge from '../components/RiskScoreBadge';
import { mockStats, mockRecentRecords } from '../data/mockData';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Building2,
  FileSearch,
  Layers,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  Compass,
  Activity,
  SlidersHorizontal,
  FileCheck
} from 'lucide-react';

export default function AdminDashboard({ onNavigate, onSelectRecord, onLogout }) {
  // Flagged high-risk records for administrative triage
  const triageQueue = [
    {
      id: "DOC-2026-8901",
      documentName: "Sale_Deed_Plot_402B.pdf",
      ownerName: "Rajesh Kumar Sharma",
      surveyNumber: "402/B",
      district: "Ranga Reddy, Telangana",
      area: "2.45 Acres",
      status: "Suspicious",
      riskScore: 78,
      riskLevel: "HIGH",
      primaryAnomaly: "Ownership Identity Mismatch (Deceased Ancestor)",
      secondaryAnomaly: "Active SBI Bank Mortgage Undisclosed",
      priority: "CRITICAL"
    },
    {
      id: "DOC-2026-8870",
      documentName: "Patta_Passbook_Ext_55.png",
      ownerName: "Venkata Ramanappa",
      surveyNumber: "55/3C",
      district: "Anantapur, Andhra Pradesh",
      area: "3.10 Acres",
      status: "Review Needed",
      riskScore: 45,
      riskLevel: "MEDIUM",
      primaryAnomaly: "Claimed Extent Exceeds Cadastral RoR (0.45 Ac delta)",
      secondaryAnomaly: "Stamp Duty Calculation Discrepancy",
      priority: "ELEVATED"
    },
    {
      id: "DOC-2026-8922",
      documentName: "Gift_Deed_Survey_103C.pdf",
      ownerName: "Chandra Shekhar Verma",
      surveyNumber: "103/C",
      district: "Ranga Reddy, Telangana",
      area: "4.20 Acres",
      status: "Verified",
      riskScore: 16,
      riskLevel: "LOW",
      primaryAnomaly: "Minor OCR stamp date noise",
      secondaryAnomaly: "None",
      priority: "ROUTINE"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Admin Hero Header */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-800/40 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Revenue Authority • Chief Land Auditor Console</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Cadastral Fraud Triage & Registry Audit Console
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl mt-1.5 leading-relaxed">
              Supervise jurisdictional title integrity, review AI fraud triage flags, investigate multi-party survey overlaps, and audit sub-registrar records.
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-indigo-300/80 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                Active Auditor Session: Jurisdiction RR-Central
              </span>
              <span>•</span>
              <span>Account: admin.auditor@landguard.gov</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate && onNavigate('risk')}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-950/60 transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Risk & Audit Engine</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                title="Sign out of Auditor view"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Synthetic Demo Disclaimer Notice */}
      <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-indigo-200/90 text-xs flex items-start gap-3 shadow-sm">
        <span className="text-lg leading-none mt-0.5">⚠️</span>
        <div className="space-y-0.5">
          <p className="font-bold text-indigo-300">Administrative Client-Side Prototype Mode</p>
          <p className="text-slate-300">
            This Admin Dashboard provides an administrative inspection interface over synthetic registry records. Role switching is handled client-side for evaluation and testing. No actual government credentials or classified records are stored.
          </p>
        </div>
      </div>

      {/* Admin KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Flagged Anomaly Count */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">High-Risk Triage</span>
            <div className="p-2 rounded-lg bg-rose-950 text-rose-400 border border-rose-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-rose-400">{mockStats.highRiskAlerts || 24} Alerts</div>
            <p className="text-xs text-rose-500/80 mt-1">Requires official auditor sign-off</p>
          </div>
        </div>

        {/* Suspicious Documents */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Suspicious Deeds</span>
            <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-400">{mockStats.suspiciousRecords.toLocaleString()}</div>
            <p className="text-xs text-amber-500/80 mt-1">11.1% of processed records</p>
          </div>
        </div>

        {/* Clean Registry Ratio */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Clean Match Ratio</span>
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-400">{mockStats.verifiedRecords.toLocaleString()}</div>
            <p className="text-xs text-emerald-500/80 mt-1">Validated against State RoR</p>
          </div>
        </div>

        {/* Average Jurisdiction Risk */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Avg Risk Index</span>
            <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-indigo-300">{mockStats.averageRiskScore} <span className="text-sm font-normal text-slate-400">/ 100</span></div>
            <p className="text-xs text-indigo-400/80 mt-1">Jurisdiction RR Baseline</p>
          </div>
        </div>
      </div>

      {/* Admin Operational Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate && onNavigate('risk')}
          className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h4 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
            Risk Scoring & Anomaly Matrix
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Audit rule penalty breakdown: spatial variance, ownership mismatches, duplicate extent claims, and stamp duty deficits.
          </p>
        </div>

        <div
          onClick={() => onNavigate && onNavigate('gis')}
          className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
          </div>
          <h4 className="font-bold text-white text-sm group-hover:text-teal-300 transition-colors">
            Spatial Parcel GIS Audit
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Detect survey boundary collisions, multi-party encroachment, and cadastral coordinate shifts.
          </p>
        </div>

        <div
          onClick={() => onNavigate && onNavigate('verification')}
          className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <FileSearch className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </div>
          <h4 className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
            Full Verification Log
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Review detailed field-by-field extracted OCR comparisons against official revenue records.
          </p>
        </div>
      </div>

      {/* Anomaly Triage Review Queue */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Priority Anomaly Triage Queue</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                Action Required
              </span>
            </div>
            <p className="text-xs text-slate-400">High and medium risk land records flagged by AI heuristic & spatial engines</p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('verification')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>View All Records ({mockStats.totalChecked})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Record ID / Deed</th>
                <th className="p-4">Survey Plot</th>
                <th className="p-4">Claimed Party</th>
                <th className="p-4">Primary Anomaly Flag</th>
                <th className="p-4">Risk Level</th>
                <th className="p-4">Priority</th>
                <th className="p-4 text-right">Triage Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {triageQueue.map((record) => (
                <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-white">{record.id}</div>
                    <div className="text-xs text-slate-500 font-mono">{record.documentName}</div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-800 border border-slate-700 text-indigo-300">
                      {record.surveyNumber}
                    </span>
                  </td>
                  <td className="p-4">{record.ownerName}</td>
                  <td className="p-4">
                    <div className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{record.primaryAnomaly}</span>
                    </div>
                    {record.secondaryAnomaly && record.secondaryAnomaly !== 'None' && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {record.secondaryAnomaly}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <RiskScoreBadge score={record.riskScore} size="sm" />
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      record.priority === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : record.priority === 'ELEVATED'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {record.priority}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        if (onSelectRecord) {
                          onSelectRecord(record, 'verification');
                        } else if (onNavigate) {
                          onNavigate('verification');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      Audit Anomaly
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Telemetry & Registry Health */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200 font-semibold">AI Anomaly Engine: Active (v2.4)</span>
        </div>
        <div>
          <span>Registry Sync: </span>
          <span className="text-slate-200 font-semibold">CCLA Dharani & IGR Maharashtra</span>
        </div>
        <div>
          <span>Cadastral Ledger: </span>
          <span className="text-slate-200 font-mono font-semibold">0x48A...F19 (Verified)</span>
        </div>
      </div>

    </div>
  );
}
import React from 'react';
import StatusBadge from '../components/StatusBadge';
import RiskScoreBadge from '../components/RiskScoreBadge';
import { mockRecentRecords } from '../data/mockData';
import { allSearchableRecords } from '../data/allLandRecords';
import {
  User,
  ShieldCheck,
  FileText,
  Upload,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  Compass,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export default function UserDashboard({ onNavigate, onSelectRecord, onLogout }) {
  // Synthesize citizen/landholder portfolio from available mock data
  const myHoldings = [
    {
      id: "REC-1002",
      documentName: "Registered_Sale_Deed_102B.pdf",
      surveyNumber: "102/B",
      ownerName: "Bhavana Sharma (Self)",
      landArea: "1.80 Acres",
      location: "Village Greenvalley, Serilingampally, Ranga Reddy",
      registrationDate: "2021-06-20",
      status: "Verified",
      riskScore: 12,
      riskLevel: "LOW",
      mutationStatus: "Approved & Mutated",
      encumbrance: "Nil / Clear Title"
    },
    {
      id: "DOC-2026-8895",
      documentName: "7_12_Extract_Survey_118.pdf",
      surveyNumber: "118/A",
      ownerName: "Sunita Devi Patel (Co-Applicant)",
      landArea: "1.20 Hectares",
      location: "Haveli Mandal, Pune, Maharashtra",
      registrationDate: "2023-09-03",
      status: "Verified",
      riskScore: 12,
      riskLevel: "LOW",
      mutationStatus: "Sub-division Survey Verified",
      encumbrance: "Nil / Clear Title"
    },
    {
      id: "DOC-2026-8854",
      documentName: "Partition_Deed_89.pdf",
      surveyNumber: "89/1",
      ownerName: "Mahesh Chandra Verma (Family Title)",
      landArea: "0.85 Acres",
      location: "Huzur, Bhopal, Madhya Pradesh",
      registrationDate: "2022-09-01",
      status: "Verified",
      riskScore: 8,
      riskLevel: "LOW",
      mutationStatus: "RoR Title Active",
      encumbrance: "Agricultural Clear Title"
    }
  ];

  return (
    <div className="space-y-6">
      {/* User Hero Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950/80 to-slate-900 border border-teal-800/40 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-3">
              <User className="w-3.5 h-3.5 text-teal-400" />
              <span>Citizen / Landholder Portal</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              My Land Holdings & Title Verification Hub
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl mt-1.5 leading-relaxed">
              Track your registered property deeds, cadastral survey boundaries, mutation progress, and automated AI title verification reports.
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-teal-300/80 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Active Session: Landholder Portfolio (Demo)
              </span>
              <span>•</span>
              <span>Account: landholder@landguard.gov</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate && onNavigate('upload')}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-teal-950/60 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Verify New Deed</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                title="Sign out of Citizen view"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Synthetic Demo Disclaimer Notice */}
      <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-800/40 text-teal-200/90 text-xs flex items-start gap-3 shadow-sm">
        <span className="text-lg leading-none mt-0.5">ℹ️</span>
        <div className="space-y-0.5">
          <p className="font-bold text-teal-300">Client-Side Role Demonstration Mode</p>
          <p className="text-slate-300">
            This User Dashboard is a dedicated frontend prototype illustrating property-owner features. Role selection is managed client-side for demonstration purposes and does not replace official state registry authentication.
          </p>
        </div>
      </div>

      {/* User Portfolio KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Land */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Registered Holdings</span>
            <div className="p-2 rounded-lg bg-teal-950 text-teal-400 border border-teal-800">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">3 Parcels</div>
            <p className="text-xs text-teal-400 mt-1">3.85 Acres total extent</p>
          </div>
        </div>

        {/* Verification Status */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Title Health</span>
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-400">100% Clear</div>
            <p className="text-xs text-emerald-500/80 mt-1">No boundary overlap detected</p>
          </div>
        </div>

        {/* Encumbrances & Liens */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Encumbrance Status</span>
            <div className="p-2 rounded-lg bg-blue-950 text-blue-400 border border-blue-800">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-blue-400">0 Liens</div>
            <p className="text-xs text-slate-400 mt-1">Clean Encumbrance Certificate</p>
          </div>
        </div>

        {/* Cadastral Sync */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Cadastral Sync</span>
            <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-indigo-400">Active</div>
            <p className="text-xs text-indigo-400/80 mt-1">Survey boundaries aligned</p>
          </div>
        </div>
      </div>

      {/* Citizen Quick Action Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate && onNavigate('upload')}
          className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
          </div>
          <h4 className="font-bold text-white text-sm group-hover:text-teal-300 transition-colors">
            Upload Deed for Instant AI Audit
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Scan sale deeds, passbooks, or 7/12 extracts to verify registration numbers and detect discrepancies.
          </p>
        </div>

        <div
          onClick={() => onNavigate && onNavigate('gis')}
          className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h4 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
            Cadastral GIS Map Inspector
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Visualize your surveyed parcel boundaries, neighbor extents, and spatial polygon coordinates.
          </p>
        </div>

        <div
          onClick={() => onNavigate && onNavigate('history')}
          className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <h4 className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
            Ownership Chain of Title
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Review genealogical succession, previous mutations, and historical conveyance registrations.
          </p>
        </div>
      </div>

      {/* User Registered Holdings Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">My Registered Land Holdings</h3>
            <p className="text-xs text-slate-400">Validated cadastral records linked to your Landholder portfolio</p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('gis')}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            <span>Open GIS Parcel Map</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Record / Deed</th>
                <th className="p-4">Survey No.</th>
                <th className="p-4">Claimed Area</th>
                <th className="p-4">Location</th>
                <th className="p-4">Title Health</th>
                <th className="p-4">Risk Score</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {myHoldings.map((record) => (
                <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-white">{record.id}</div>
                    <div className="text-xs text-slate-500 font-mono">{record.documentName}</div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-800 border border-slate-700 text-teal-300">
                      {record.surveyNumber}
                    </span>
                  </td>
                  <td className="p-4">{record.landArea}</td>
                  <td className="p-4 text-slate-400">
                    <div className="flex items-center gap-1 truncate max-w-xs">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{record.location}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="p-4">
                    <RiskScoreBadge score={record.riskScore} size="sm" />
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
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
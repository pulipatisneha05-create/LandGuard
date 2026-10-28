import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Building2,
  UserCheck,
  Compass,
  AlertCircle,
  KeyRound,
  Layers,
  Sparkles
} from 'lucide-react';

export default function Login({ onLoginSuccess, onNavigateHome }) {
  const [role, setRole] = useState('user'); // 'user' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // Guarantee email and password are empty by default on initial mount and prevent browser cache prefill
  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setErrorMessage('');
    setEmail('');
    setPassword('');
  };

  const handleQuickFill = (targetRole) => {
    setRole(targetRole);
    setErrorMessage('');
    if (targetRole === 'admin') {
      setEmail('admin.auditor@landguard.gov');
      setPassword('admin2026');
    } else {
      setEmail('landholder@landguard.gov');
      setPassword('demo1234');
    }
    setNotification(`Filled ${targetRole === 'admin' ? 'Administrator' : 'Citizen'} demo credentials`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (isLoading) return;

    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    const selectedRole = role === 'admin' ? 'admin' : 'user';

    // Simulate fast authentication delay for smooth response
    setTimeout(() => {
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess({
          role: selectedRole,
          email,
          name: selectedRole === 'admin' ? 'Chief Land Auditor' : 'Verified Property Holder'
        });
      } else if (onNavigateHome) {
        onNavigateHome();
      }
    }, 200);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white relative overflow-hidden">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-teal-900 border border-teal-500/50 text-teal-100 px-4 py-2.5 rounded-xl shadow-xl shadow-black/40 flex items-center gap-2 text-xs md:text-sm animate-fade-in">
          <Sparkles className="w-4 h-4 text-teal-300" />
          <span>{notification}</span>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative text-left">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Reset Password</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              In this synthetic demonstration environment, password resets are simulated. In production, an official OTP link is dispatched to your registered Aadhaar / Registry mobile number.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LEFT PANEL: LandGuard Branding & Property Illustration */}
      {/* ======================================================== */}
      <div className="relative w-full lg:w-[52%] xl:w-[54%] bg-gradient-to-br from-slate-950 via-teal-950/70 to-emerald-950 p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-teal-900/30">
        
        {/* Background Ambient Glows & Grid Pattern */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Subtle Cadastral Coordinate Grid Background */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#14b8a6 1px, transparent 1px), linear-gradient(to right, #14b8a6 1px, transparent 1px), linear-gradient(to bottom, #14b8a6 1px, transparent 1px)`,
            backgroundSize: '40px 40px, 80px 80px, 80px 80px'
          }}
        />

        {/* Top Header: Logo & Platform Identity */}
        <div className="relative z-10 flex items-center justify-between">
          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-3.5 cursor-pointer group"
            title="Go to LandGuard Platform"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-900/40 group-hover:scale-105 transition-transform duration-300">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white group-hover:text-teal-200 transition-colors">
                  Land<span className="text-teal-400">Guard</span>
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  Cadastral AI
                </span>
              </div>
              <p className="text-[11px] font-medium text-teal-200/60 uppercase tracking-wider">
                Land Records Validation Authority
              </p>
            </div>
          </div>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="text-xs font-semibold text-teal-300/80 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-teal-800/40 transition-colors flex items-center gap-1.5"
            >
              <span>Explore Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Land / Property Landscape Vector Illustration */}
        <div className="relative z-10 my-8 lg:my-auto flex flex-col items-center">
          
          {/* Main Title & Tagline */}
          <div className="text-center lg:text-left w-full mb-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/20 text-teal-300 text-xs font-semibold mb-3">
              <Compass className="w-3.5 h-3.5 text-teal-400" />
              <span>Spatial Deed Forensics & Title Security</span>
            </div>
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Intelligent Land Record Validation & Fraud Detection
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300/80 leading-relaxed">
              Verify cadastral boundaries, detect title double-pledging, and audit deed authenticity against high-resolution survey registries.
            </p>
          </div>

          {/* SVG Illustration Container */}
          <div className="w-full max-w-xl relative mt-2">
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-teal-500/20 p-5 shadow-2xl backdrop-blur-sm overflow-hidden">
              
              {/* Telemetry Header */}
              <div className="flex items-center justify-between border-b border-teal-900/40 pb-3 mb-4 text-[11px] font-mono">
                <div className="flex items-center gap-2 text-teal-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-semibold">CAD-GIS LIVE INSPECTOR</span>
                </div>
                <div className="text-slate-400">SURVEY REGION: RR-402</div>
              </div>

              {/* Landscape & Cadastral Illustration (SVG) */}
              <div className="w-full h-56 sm:h-64 flex items-center justify-center relative">
                <svg
                  viewBox="0 0 600 320"
                  className="w-full h-full drop-shadow-lg"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    {/* Gradients */}
                    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#042f2e" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#022c22" stopOpacity="0.1" />
                    </linearGradient>
                    <linearGradient id="parcelGreen" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
                    </linearGradient>
                    <linearGradient id="parcelTeal" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity="0.25" />
                    </linearGradient>
                    <linearGradient id="parcelEmerald" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#047857" stopOpacity="0.25" />
                    </linearGradient>
                    <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#134e4a" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#064e3b" stopOpacity="0.1" />
                    </linearGradient>
                    <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Backdrop contours */}
                  <rect width="600" height="320" rx="16" fill="url(#skyGrad)" />

                  {/* Topographic Hills Background */}
                  <path
                    d="M0 180 C 120 140, 240 190, 360 160 C 460 135, 540 150, 600 130 L 600 320 L 0 320 Z"
                    fill="url(#hillBack)"
                  />
                  <path
                    d="M0 210 C 140 175, 290 220, 420 190 C 510 170, 560 185, 600 170 L 600 320 L 0 320 Z"
                    fill="#064e3b"
                    fillOpacity="0.2"
                  />

                  {/* Cadastral Topo Contour Lines */}
                  <path
                    d="M10 145 Q 160 120 310 140 T 590 125"
                    stroke="#14b8a6"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M20 175 Q 190 150 350 170 T 580 155"
                    stroke="#10b981"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M0 220 Q 210 190 390 215 T 600 200"
                    stroke="#2dd4bf"
                    strokeWidth="1.2"
                    strokeOpacity="0.3"
                  />

                  {/* Cadastral Land Parcel Polygons (3D Isometric / Cadastral Map View) */}
                  
                  {/* Parcel A (West / Left) */}
                  <polygon
                    points="50,230 190,205 240,250 80,285"
                    fill="url(#parcelGreen)"
                    stroke="#2dd4bf"
                    strokeWidth="1.8"
                  />
                  
                  {/* Parcel B (Center - Primary Audited Parcel 402/B) */}
                  <polygon
                    points="200,202 390,185 450,238 250,260"
                    fill="url(#parcelEmerald)"
                    stroke="#10b981"
                    strokeWidth="2.5"
                  />

                  {/* Parcel C (East / Right) */}
                  <polygon
                    points="400,183 550,172 570,225 460,235"
                    fill="url(#parcelTeal)"
                    stroke="#14b8a6"
                    strokeWidth="1.8"
                  />

                  {/* Sub-divided Survey Boundaries */}
                  <line x1="290" y1="194" x2="330" y2="252" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" />
                  <line x1="120" y1="217" x2="155" y2="267" stroke="#2dd4bf" strokeWidth="1.2" strokeDasharray="3 3" />

                  {/* Coordinate Node Pins on Parcel Corners */}
                  <circle cx="200" cy="202" r="4" fill="#34d399" stroke="#064e3b" strokeWidth="1.5" />
                  <circle cx="390" cy="185" r="4" fill="#34d399" stroke="#064e3b" strokeWidth="1.5" />
                  <circle cx="450" cy="238" r="4" fill="#34d399" stroke="#064e3b" strokeWidth="1.5" />
                  <circle cx="250" cy="260" r="4" fill="#34d399" stroke="#064e3b" strokeWidth="1.5" />

                  {/* Stylized Modern Trees on Plot Boundaries */}
                  <g transform="translate(100, 245)">
                    <circle cx="0" cy="0" r="7" fill="#059669" fillOpacity="0.8" />
                    <circle cx="-3" cy="-3" r="5" fill="#10b981" fillOpacity="0.9" />
                  </g>
                  <g transform="translate(160, 220)">
                    <circle cx="0" cy="0" r="6" fill="#047857" fillOpacity="0.8" />
                    <circle cx="-2" cy="-2" r="4" fill="#34d399" fillOpacity="0.9" />
                  </g>
                  <g transform="translate(480, 200)">
                    <circle cx="0" cy="0" r="8" fill="#059669" fillOpacity="0.8" />
                    <circle cx="-3" cy="-3" r="5" fill="#10b981" fillOpacity="0.9" />
                  </g>
                  <g transform="translate(520, 190)">
                    <circle cx="0" cy="0" r="6" fill="#047857" fillOpacity="0.8" />
                  </g>

                  {/* Radar Scanning Line over Primary Plot */}
                  <line x1="200" y1="215" x2="450" y2="215" stroke="#5eead4" strokeWidth="2" strokeOpacity="0.7">
                    <animate attributeName="y1" values="188;255;188" dur="4s" repeatCount="indefinite" />
                    <animate attributeName="y2" values="188;255;188" dur="4s" repeatCount="indefinite" />
                  </line>

                  {/* Floating Holographic Badge: Plot 402/B Verified */}
                  <g transform="translate(300, 120)">
                    {/* Shadow / Glow */}
                    <rect x="-85" y="-22" width="170" height="44" rx="10" fill="#042f2e" stroke="#14b8a6" strokeWidth="1.5" />
                    
                    {/* Shield Icon Inside Badge */}
                    <circle cx="-58" cy="0" r="12" fill="#0f766e" />
                    <path
                      d="M -62 -4 L -58 -7 L -54 -4 L -54 2 C -54 5 -58 8 -58 8 C -58 8 -62 5 -62 2 Z"
                      fill="#5eead4"
                    />
                    <path d="M -60 0 L -58 2 L -55 -2" stroke="#042f2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Badge Text */}
                    <text x="-40" y="-3" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                      SURVEY #402/B
                    </text>
                    <text x="-40" y="10" fill="#34d399" fontSize="8.5" fontWeight="600" fontFamily="sans-serif">
                      EXTENT: 2.40 AC • VALIDATED
                    </text>

                    {/* Connecting Pin Line down to Parcel */}
                    <line x1="0" y1="22" x2="0" y2="70" stroke="#14b8a6" strokeWidth="1.5" strokeDasharray="3 3" />
                    <circle cx="0" cy="70" r="4" fill="#2dd4bf" />
                  </g>

                  {/* Adjacent Parcel Tag: 402/A */}
                  <g transform="translate(130, 260)">
                    <rect x="-35" y="-10" width="70" height="20" rx="5" fill="#0f172a" fillOpacity="0.85" stroke="#334155" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600" fontFamily="sans-serif">
                      PLOT 402/A
                    </text>
                  </g>

                  {/* Adjacent Parcel Tag: 403 */}
                  <g transform="translate(500, 225)">
                    <rect x="-30" y="-10" width="60" height="20" rx="5" fill="#0f172a" fillOpacity="0.85" stroke="#334155" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600" fontFamily="sans-serif">
                      PLOT 403
                    </text>
                  </g>

                </svg>
              </div>

              {/* Lower Inspection Status */}
              <div className="mt-3 pt-3 border-t border-teal-900/40 flex items-center justify-between text-xs text-teal-200/80">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Cadastral Polygon Alignment 99.8% Match
                </span>
                <span className="font-mono text-[10px] bg-teal-950/80 text-teal-300 px-2 py-0.5 rounded border border-teal-800">
                  DEED_HASH: 0x98A...F4
                </span>
              </div>

            </div>
          </div>

          {/* Three Feature Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mt-6">
            <div className="bg-slate-900/60 border border-teal-900/40 rounded-xl p-3 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Cadastral GIS</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Boundary conflict and overlap verification.</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-teal-900/40 rounded-xl p-3 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Fraud Shield</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Detects duplicate deeds and title pledge anomalies.</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-teal-900/40 rounded-xl p-3 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">OCR Forensics</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Automated deed transcription and legal cross-check.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-4 flex flex-wrap items-center justify-between text-[11px] text-slate-400/80 border-t border-teal-900/30 gap-2">
          <span>Official Land Records Authority Portal</span>
          <span>End-to-End Encrypted System • v2.4 Enterprise</span>
        </div>

      </div>

      {/* ======================================================== */}
      {/* RIGHT PANEL: Clean White / Light Login Card */}
      {/* ======================================================== */}
      <div className="w-full lg:w-[48%] xl:w-[46%] bg-slate-100 flex items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16 text-slate-800">
        
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-900/10 border border-slate-200/80 p-8 sm:p-10 transition-all">
          
          {/* Card Header */}
          <div className="mb-8 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold mb-3 border border-teal-200/60">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>Secure Access Portal</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome to LandGuard
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to continue to your land records workspace.
            </p>
          </div>

          {/* Role Selection: User Login vs Admin Login */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select Login Role
            </label>
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              
              {/* User Login Option */}
              <button
                type="button"
                onClick={() => handleRoleChange('user')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  role === 'user'
                    ? 'bg-white text-teal-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                <UserCheck className={`w-4 h-4 ${role === 'user' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>User Login</span>
              </button>

              {/* Admin Login Option */}
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  role === 'admin'
                    ? 'bg-white text-teal-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                <Building2 className={`w-4 h-4 ${role === 'admin' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>Admin Login</span>
              </button>

            </div>

            {/* Role Helper Info Pill */}
            <div className="mt-2.5 px-3 py-2 rounded-xl bg-teal-50/70 border border-teal-100 flex items-start gap-2 text-[12px] text-teal-900 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
              <span>
                {role === 'user'
                  ? 'Access title searches, verify deed documents, and monitor ownership history.'
                  : 'Auditor console: Full registry risk index, spatial conflict alerts, and document triage.'}
              </span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                />
              </div>
            </div>

            {/* Password Field with Show/Hide */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                />
                <span>Remember me on this workstation</span>
              </label>
            </div>

            {/* Prominent Sign In Button */}
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-teal-900/15 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-sm disabled:opacity-75 disabled:pointer-events-none cursor-pointer group"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {role === 'admin' ? 'Administrator' : 'User'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>

          {/* Quick Demo Credential Pills */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2.5">
              Quick Demo Autofill
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('user')}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 border border-slate-200 transition-colors font-medium flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Fill User</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 border border-slate-200 transition-colors font-medium flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Fill Admin</span>
              </button>
            </div>
          </div>

          {/* Subtle Security Message */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500 text-center">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>256-Bit SSL Encrypted • ISO 27001 Land Records Standard</span>
          </div>

          {/* Return to Dashboard link */}
          {onNavigateHome && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onNavigateHome}
                className="text-xs font-semibold text-slate-500 hover:text-teal-700 transition-colors inline-flex items-center gap-1"
              >
                <span>← Back to LandGuard Platform</span>
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
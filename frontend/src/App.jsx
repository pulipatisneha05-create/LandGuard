import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import UploadDocument from './pages/UploadDocument';
import DocumentAnalysis from './pages/DocumentAnalysis';
import VerificationResults from './pages/VerificationResults';
import RiskScoreView from './pages/RiskScoreView';
import OwnershipHistory from './pages/OwnershipHistory';
import GisMap from './pages/GisMap';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';

function parseCurrentRoute() {
  if (typeof window === 'undefined') {
    return { path: '/login', route: 'login', role: null, tab: 'login' };
  }
  const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const rawHash = window.location.hash.toLowerCase().replace(/\/+$/, '');

  let savedRole = null;
  try {
    savedRole = sessionStorage.getItem('landguard_role');
    if (savedRole !== 'admin' && savedRole !== 'user') {
      savedRole = null;
    }
  } catch (e) {}

  // 1. Check Login
  if (
    rawPath === '/login' ||
    rawPath.endsWith('/login') ||
    rawHash === '#/login' ||
    rawHash === '#login'
  ) {
    return { path: '/login', route: 'login', role: null, tab: 'login' };
  }

  // 2. Check Admin Dashboard
  if (
    rawPath === '/admin-dashboard' ||
    rawPath.endsWith('/admin-dashboard') ||
    rawHash === '#/admin-dashboard' ||
    rawHash === '#admin-dashboard'
  ) {
    return { path: '/admin-dashboard', route: 'admin-dashboard', role: 'admin', tab: 'dashboard' };
  }

  // 3. Check User Dashboard
  if (
    rawPath === '/user-dashboard' ||
    rawPath.endsWith('/user-dashboard') ||
    rawHash === '#/user-dashboard' ||
    rawHash === '#user-dashboard'
  ) {
    return { path: '/user-dashboard', route: 'user-dashboard', role: 'user', tab: 'dashboard' };
  }

  // 4. Check Sub-modules (Upload, Analysis, Verification, Risk, History, GIS)
  const tabNames = ['upload', 'analysis', 'verification', 'risk', 'history', 'gis'];
  for (const tab of tabNames) {
    if (rawPath === `/${tab}` || rawPath.endsWith(`/${tab}`) || rawHash === `#/${tab}` || rawHash === `#${tab}`) {
      return { path: `/${tab}`, route: tab, role: savedRole, tab };
    }
  }

  // 5. Website root `/` or fallback
  if (savedRole === 'admin') {
    return { path: '/admin-dashboard', route: 'admin-dashboard', role: 'admin', tab: 'dashboard' };
  }
  if (savedRole === 'user') {
    return { path: '/user-dashboard', route: 'user-dashboard', role: 'user', tab: 'dashboard' };
  }

  // For a new unauthenticated visitor visiting `/`, default to login entry page
  return { path: '/login', route: 'login', role: null, tab: 'login' };
}

export default function App() {
  const initialRouteInfo = parseCurrentRoute();
  const [currentRoute, setCurrentRoute] = useState(initialRouteInfo.route);
  const [isLoginRoute, setIsLoginRoute] = useState(initialRouteInfo.route === 'login');
  const [activeRole, setActiveRole] = useState(initialRouteInfo.role); // null | 'user' | 'admin'
  const [activeTab, setActiveTab] = useState(initialRouteInfo.tab || (initialRouteInfo.route === 'login' ? 'login' : 'dashboard'));
  const [activeDocument, setActiveDocument] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    // If an unauthenticated visitor enters on root '/' or empty, synchronize address bar to /login
    if (typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '')) {
      let savedRole = null;
      try {
        savedRole = sessionStorage.getItem('landguard_role');
      } catch (e) {}
      if (savedRole === 'admin') {
        window.history.replaceState({}, '', '/admin-dashboard');
      } else if (savedRole === 'user') {
        window.history.replaceState({}, '', '/user-dashboard');
      } else {
        window.history.replaceState({}, '', '/login');
      }
    }

    const handleLocationChange = () => {
      const routeInfo = parseCurrentRoute();
      setCurrentRoute(routeInfo.route);
      setIsLoginRoute(routeInfo.route === 'login');

      if (routeInfo.role) {
        setActiveRole(routeInfo.role);
        try {
          sessionStorage.setItem('landguard_role', routeInfo.role);
        } catch (e) {}
      } else if (routeInfo.route === 'login') {
        setActiveRole(null);
        try {
          sessionStorage.removeItem('landguard_role');
        } catch (e) {}
      } else {
        let savedRole = null;
        try {
          savedRole = sessionStorage.getItem('landguard_role');
        } catch (e) {}
        if (savedRole) setActiveRole(savedRole);
      }

      if (routeInfo.tab) {
        setActiveTab(routeInfo.tab);
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleNavigate = (targetTab, explicitRole = undefined) => {
    let newPath = '/login';
    let newRoute = targetTab;
    let newTab = targetTab;

    if (targetTab === 'dashboard') {
      const effectiveRole = explicitRole !== undefined ? explicitRole : activeRole;
      if (effectiveRole === 'admin') {
        newPath = '/admin-dashboard';
        newRoute = 'admin-dashboard';
        newTab = 'dashboard';
      } else if (effectiveRole === 'user') {
        newPath = '/user-dashboard';
        newRoute = 'user-dashboard';
        newTab = 'dashboard';
      } else {
        newPath = '/login';
        newRoute = 'login';
        newTab = 'login';
      }
    } else if (targetTab === 'user-dashboard') {
      newPath = '/user-dashboard';
      newRoute = 'user-dashboard';
      newTab = 'dashboard';
      setActiveRole('user');
      try {
        sessionStorage.setItem('landguard_role', 'user');
      } catch (e) {}
    } else if (targetTab === 'admin-dashboard') {
      newPath = '/admin-dashboard';
      newRoute = 'admin-dashboard';
      newTab = 'dashboard';
      setActiveRole('admin');
      try {
        sessionStorage.setItem('landguard_role', 'admin');
      } catch (e) {}
    } else if (targetTab === 'login') {
      newPath = '/login';
      newRoute = 'login';
      newTab = 'login';
      setActiveRole(null);
      try {
        sessionStorage.removeItem('landguard_role');
      } catch (e) {}
    } else {
      newPath = `/${targetTab}`;
      newRoute = targetTab;
      newTab = targetTab;
    }

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', newPath);
    }
    setCurrentRoute(newRoute);
    setActiveTab(newTab);
    setIsLoginRoute(newRoute === 'login');
    if (explicitRole !== undefined) {
      setActiveRole(explicitRole);
      try {
        if (explicitRole) {
          sessionStorage.setItem('landguard_role', explicitRole);
        } else {
          sessionStorage.removeItem('landguard_role');
        }
      } catch (e) {}
    }
  };

  const navigateToHome = () => {
    if (activeRole === 'admin') {
      handleNavigate('admin-dashboard', 'admin');
    } else if (activeRole === 'user') {
      handleNavigate('user-dashboard', 'user');
    } else {
      handleNavigate('login', null);
    }
  };

  const handleLoginSuccess = (authPayload) => {
    const selectedRole = authPayload?.role === 'admin' ? 'admin' : 'user';
    try {
      sessionStorage.setItem('landguard_role', selectedRole);
    } catch (e) {}
    setActiveRole(selectedRole);
    const targetDashboard = selectedRole === 'admin' ? 'admin-dashboard' : 'user-dashboard';
    handleNavigate(targetDashboard, selectedRole);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('landguard_role');
    } catch (e) {}
    setActiveRole(null);
    handleNavigate('login', null);
  };

  const handleUploadSuccess = (uploadedDocPayload) => {
    setActiveDocument(uploadedDocPayload);
    setVerificationResult(null);
    handleNavigate('analysis');
  };

  const handleSelectRecord = (record, targetTab = 'analysis') => {
    const docId = record.document_id || record.id || record.record_id || `REC-${record.survey_number}`;
    const surveyNo = record.survey_number || record.surveyNumber || "402/B";
    const owner = record.owner_name || record.ownerName || "Unspecified";
    const area = parseFloat(record.land_area_acres || record.landArea || record.area) || 2.0;
    const village = record.village || "Riverside";
    const mandal = record.mandal || "Ibrahimpatnam";
    const district = record.district || "Ranga Reddy";
    const state = record.state || "Telangana";
    const regDate = record.registration_date || record.registrationDate || "2023-04-10";
    const docType = record.document_type || record.documentType || "Sale Deed";

    const docPayload = {
      document_id: docId,
      filename: record.filename || record.documentName || `${docId}_${surveyNo.replace(/[\\/\\s]/g, '_')}.pdf`,
      ocr_status: "COMPLETED",
      ocr_confidence_score: record.ocr_confidence_score || 96.4,
      extracted_text: record.extracted_text || `GOVERNMENT OF TELANGANA\nREGISTRATION AND STAMPS DEPARTMENT\n\nRECORD ID: ${docId}\nEXECUTANT (SELLER): ${owner}\nCLAIMED SURVEY NO: ${surveyNo}\nCLAIMED EXTENT: ${area} Acres\nLOCATION: Village ${village}, Mandal ${mandal}, District ${district}\nREGISTRATION DATE: ${regDate}\nINSTRUMENT: ${docType}`,
      extracted_nlp_fields: {
        owner_name: owner,
        survey_number: surveyNo,
        land_area_raw: record.extracted_land_area_raw || record.land_area_raw || (record.area ? `${record.area}` : `${area} Acres`),
        land_area_unit: record.extracted_land_area_unit || record.land_area_unit || "Acres",
        land_area_normalized_acres: record.extracted_land_area_normalized_acres != null ? record.extracted_land_area_normalized_acres : area,
        land_area_acres: record.extracted_land_area_normalized_acres != null ? record.extracted_land_area_normalized_acres : area,
        village: village,
        mandal: mandal,
        district: district,
        state: state,
        registration_number: record.registration_number || docId,
        registration_date: regDate,
        document_type: docType
      },
      extracted_fields: {
        owner_name: owner,
        survey_number: surveyNo,
        land_area_raw: record.extracted_land_area_raw || record.land_area_raw || (record.area ? `${record.area}` : `${area} Acres`),
        land_area_unit: record.extracted_land_area_unit || record.land_area_unit || "Acres",
        land_area_normalized_acres: record.extracted_land_area_normalized_acres != null ? record.extracted_land_area_normalized_acres : area,
        land_area_acres: record.extracted_land_area_normalized_acres != null ? record.extracted_land_area_normalized_acres : area,
        village: village,
        mandal: mandal,
        district: district,
        state: state
      }
    };

    setActiveDocument(docPayload);
    if (record.riskScore != null) {
      setVerificationResult({
        document_id: docId,
        verification_status: record.status ? record.status.toUpperCase() : "VERIFIED",
        risk_score: record.riskScore,
        risk_level: record.riskLevel || (record.riskScore >= 60 ? "HIGH" : record.riskScore >= 30 ? "MEDIUM" : "LOW"),
        detected_anomalies: record.primaryAnomaly
          ? [
              {
                id: 1,
                title: record.primaryAnomaly,
                category: "Audit Anomaly Flag",
                severity: record.priority || "High",
                description: record.secondaryAnomaly || "Flagged in automated registry verification triage queue."
              }
            ]
          : [],
        scoring_breakdown: []
      });
    } else {
      setVerificationResult(null);
    }
    handleNavigate(targetTab);
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'upload':
        return <UploadDocument onUploadSuccess={handleUploadSuccess} />;
      case 'analysis':
        return <DocumentAnalysis activeDocument={activeDocument} onProceedToResults={() => handleNavigate('verification')} />;
      case 'verification':
        return (
          <VerificationResults
            activeDocument={activeDocument}
            verificationResult={verificationResult}
            onVerificationComplete={setVerificationResult}
            onNavigate={handleNavigate}
          />
        );
      case 'risk':
        return (
          <RiskScoreView
            activeDocument={activeDocument}
            verificationResult={verificationResult}
          />
        );
      case 'history':
        return <OwnershipHistory activeDocument={activeDocument} />;
      case 'gis':
        return (
          <GisMap
            activeDocument={activeDocument}
            verificationResult={verificationResult}
          />
        );
      case 'user-dashboard':
        return (
          <UserDashboard
            onNavigate={handleNavigate}
            onSelectRecord={handleSelectRecord}
            onLogout={handleLogout}
          />
        );
      case 'admin-dashboard':
        return (
          <AdminDashboard
            onNavigate={handleNavigate}
            onSelectRecord={handleSelectRecord}
            onLogout={handleLogout}
          />
        );
      case 'login':
        return <Login onLoginSuccess={handleLoginSuccess} />;
      case 'dashboard':
      default:
        // When on dashboard tab:
        if (activeRole === 'admin') {
          return (
            <AdminDashboard
              onNavigate={handleNavigate}
              onSelectRecord={handleSelectRecord}
              onLogout={handleLogout}
            />
          );
        }
        if (activeRole === 'user') {
          return (
            <UserDashboard
              onNavigate={handleNavigate}
              onSelectRecord={handleSelectRecord}
              onLogout={handleLogout}
            />
          );
        }

        // Public Homepage
        return <Dashboard onNavigate={handleNavigate} onSelectRecord={handleSelectRecord} />;
    }
  };

  if (isLoginRoute || currentRoute === 'login') {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <div className="no-print">
        <Navbar
          onUploadClick={() => handleNavigate('upload')}
          onSelectRecord={handleSelectRecord}
          activeTab={activeTab}
        />
      </div>

      {/* Active Role Session Banner (Only rendered when logged in via role) */}
      {activeRole && (
        <div className={`px-4 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-2 no-print ${
          activeRole === 'admin' 
            ? 'bg-indigo-950/80 border-indigo-800/80 text-indigo-200' 
            : 'bg-teal-950/80 border-teal-800/80 text-teal-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${activeRole === 'admin' ? 'bg-indigo-400' : 'bg-teal-400'} animate-pulse`} />
            <span>
              Active Session: <strong className="text-white">{activeRole === 'admin' ? 'Administrator (Chief Land Auditor)' : 'Citizen (Landholder)'}</strong>
              <span className="opacity-75 ml-1.5 hidden sm:inline">(Frontend Prototype Mode)</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                handleNavigate('dashboard');
              }}
              className="text-[11px] font-semibold underline hover:text-white transition-colors cursor-pointer"
            >
              View {activeRole === 'admin' ? 'Admin' : 'User'} Dashboard
            </button>
            <span className="opacity-40">•</span>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-[11px] border border-slate-700 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Persistent Synthetic / Demo Disclaimer Banner */}
      <div className="bg-amber-950/40 border-b border-amber-800/50 px-4 py-2 text-center text-xs text-amber-300/90 flex items-center justify-center gap-2 no-print">
        <span className="text-sm">⚠️</span>
        <span>
          <strong>Notice:</strong> This application operates on a <strong>synthetic demonstration dataset</strong>. Verification outcomes, risk indices, and anomaly alerts are generated for algorithmic testing and <strong>do not constitute official government verification</strong>.
        </span>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="no-print h-full">
          <Sidebar activeTab={activeTab} setActiveTab={handleNavigate} />
        </div>

        {/* Mobile Navigation Pills for Small Screens */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 p-2 flex items-center justify-around overflow-x-auto no-print">
          {[
            { id: 'dashboard', label: 'Dash' },
            { id: 'upload', label: 'Upload' },
            { id: 'analysis', label: 'OCR' },
            { id: 'verification', label: 'Results' },
            { id: 'risk', label: 'Risk' },
            { id: 'history', label: 'History' },
            { id: 'gis', label: 'GIS' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${
                activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 lg:pb-8">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

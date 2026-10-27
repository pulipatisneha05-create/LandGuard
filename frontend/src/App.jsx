import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import UploadDocument from './pages/UploadDocument';
import DocumentAnalysis from './pages/DocumentAnalysis';
import VerificationResults from './pages/VerificationResults';
import RiskScoreView from './pages/RiskScoreView';
import OwnershipHistory from './pages/OwnershipHistory';
import GisMap from './pages/GisMap';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeDocument, setActiveDocument] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  const handleUploadSuccess = (uploadedDocPayload) => {
    setActiveDocument(uploadedDocPayload);
    setVerificationResult(null);
    setActiveTab('analysis');
  };

  const handleSelectRecord = (record, targetTab = 'analysis') => {
    const docId = record.document_id || record.id || record.record_id || `REC-${record.survey_number}`;
    const surveyNo = record.survey_number || record.surveyNumber || "402/B";
    const owner = record.owner_name || record.ownerName || "Unspecified";
    const area = parseFloat(record.land_area_acres || record.area) || 2.0;
    const village = record.village || "Riverside";
    const mandal = record.mandal || "Ibrahimpatnam";
    const district = record.district || "Ranga Reddy";
    const state = record.state || "Telangana";
    const regDate = record.registration_date || "2023-04-10";
    const docType = record.document_type || "Sale Deed";

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
        detected_anomalies: [],
        scoring_breakdown: []
      });
    } else {
      setVerificationResult(null);
    }
    setActiveTab(targetTab);
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} onSelectRecord={handleSelectRecord} />;
      case 'upload':
        return <UploadDocument onUploadSuccess={handleUploadSuccess} />;
      case 'analysis':
        return <DocumentAnalysis activeDocument={activeDocument} onProceedToResults={() => setActiveTab('verification')} />;
      case 'verification':
        return (
          <VerificationResults
            activeDocument={activeDocument}
            verificationResult={verificationResult}
            onVerificationComplete={setVerificationResult}
            onNavigate={(tab) => setActiveTab(tab)}
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
      default:
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <div className="no-print">
        <Navbar
          onUploadClick={() => setActiveTab('upload')}
          onSelectRecord={handleSelectRecord}
          activeTab={activeTab}
        />
      </div>

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
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
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
              onClick={() => setActiveTab(item.id)}
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

import React, { useState } from 'react';
import { uploadDocumentApi } from '../api/config';

export default function UploadDocument({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('Sale Deed');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const sampleDeeds = [
    {
      name: "LandGuard_Synthetic_Test_Land_Record.pdf",
      size: "28 KB",
      type: "Sale Deed",
      category: "Normal Match",
      badgeColor: "emerald",
      status: "Arun Kumar • SY-TEST-104/2 • 240 Sq Yds (0.05 Ac)",
      staticFile: "LandGuard_Synthetic_Test_Land_Record.pdf"
    },
    {
      name: "7_12_Extract_Survey_118.pdf",
      size: "3.5 KB",
      type: "Patta Passbook",
      category: "Normal Match",
      badgeColor: "emerald",
      status: "Venkat Swamy • Survey 118/A • 20 Guntas (0.50 Ac)",
      staticFile: "7_12_Extract_Survey_118.pdf"
    },
    {
      name: "Encumbrance_Certificate_304C.pdf",
      size: "3.6 KB",
      type: "Encumbrance Certificate",
      category: "Normal Match",
      badgeColor: "emerald",
      status: "Anuradha Rao • Survey 304/C • 3.50 Acres",
      staticFile: "Encumbrance_Certificate_304C.pdf"
    },
    {
      name: "sample_deed.png",
      size: "28 KB",
      type: "Sale Deed (Image)",
      category: "Normal Match",
      badgeColor: "emerald",
      status: "Rajesh Kumar • Survey 402/B • 2.45 Acres",
      staticFile: "sample_deed.png"
    },
    {
      name: "LandGuard_Synthetic_Suspicious_Test_Record.pdf",
      size: "4.5 KB",
      type: "Sale Deed",
      category: "Suspicious Anomaly Test",
      badgeColor: "rose",
      status: "Fictional Owner • 101/A • 12.50 Ac (Mismatch vs 2.50 Ac)",
      staticFile: "LandGuard_Synthetic_Suspicious_Test_Record.pdf"
    },
    {
      name: "LandGuard_Synthetic_Test_Unindexed_Record.pdf",
      size: "4.2 KB",
      type: "Sale Deed",
      category: "Unmatched / Unindexed Test",
      badgeColor: "sky",
      status: "Praveen Reddy • SY-UNINDEXED-999 • Reference Not Found",
      staticFile: "LandGuard_Synthetic_Test_Unindexed_Record.pdf"
    }
  ];

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMessage(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSelectSample = async (sample) => {
    setErrorMessage(null);

    // Fetch the actual static sample file from public/samples
    if (sample.staticFile) {
      try {
        const resp = await fetch(`/samples/${sample.staticFile}`);
        if (resp.ok) {
          const blob = await resp.blob();
          const mimeType = sample.staticFile.endsWith('.png') ? 'image/png' : 'application/pdf';
          const file = new File([blob], sample.name, { type: mimeType });
          setSelectedFile(file);
          const mappedType = sample.type.includes('Passbook')
            ? 'Patta Passbook'
            : sample.type.includes('Encumbrance')
            ? 'Encumbrance Certificate'
            : 'Sale Deed';
          setDocumentType(mappedType);
          return;
        }
      } catch (err) {
        console.warn("Static sample fetch notice, falling back:", err);
      }
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const data = await uploadDocumentApi(selectedFile);
      setIsUploading(false);
      onUploadSuccess(data);
    } catch (err) {
      setIsUploading(false);
      console.error("Backend OCR upload error:", err.message);
      setErrorMessage(
        err.message || "Failed to process document upload and OCR extraction. Please ensure the backend server is running and the file is a valid PDF or image."
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">Upload Land Document</h2>
        <p className="text-sm text-slate-400 mt-1">
          Upload land title deeds, 7/12 extracts, patta passbooks, or survey maps (PDF, PNG, JPG, JPEG, TIFF, BMP) for automated OCR and fraud analysis.
        </p>
      </div>

      {/* Synthetic Demo Reminder */}
      <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200/90 text-xs flex items-center gap-2.5">
        <span>⚠️</span>
        <span>
          <strong>Demo Notice:</strong> Uploaded documents are cross-referenced against the synthetic land records test database. Results are simulated for validation and do not constitute official government verification.
        </span>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="font-bold text-rose-400">✕</button>
        </div>
      )}

      {/* Main Drag & Drop Card */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        className={`p-8 md:p-12 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center space-y-4 ${
          isDragging 
            ? 'border-blue-500 bg-blue-950/40 scale-[1.01]' 
            : selectedFile 
            ? 'border-emerald-600/70 bg-emerald-950/20' 
            : 'border-slate-700 bg-slate-900/80 hover:border-slate-600'
        }`}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
          selectedFile ? 'bg-emerald-900/60 text-emerald-400' : 'bg-slate-800 text-blue-400'
        }`}>
          {selectedFile ? (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
        </div>

        {selectedFile ? (
          <div className="space-y-1">
            <div className="text-lg font-bold text-emerald-300">{selectedFile.name}</div>
            <div className="text-xs text-slate-400">
              Size: {selectedFile.size ? `${(selectedFile.size/(1024*1024)).toFixed(2)} MB` : '2.4 MB'} • Status: Ready for OCR Extraction
            </div>
            <button 
              onClick={() => setSelectedFile(null)} 
              className="text-xs text-rose-400 hover:text-rose-300 underline font-medium mt-2"
            >
              Remove & Select Another
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-w-md">
            <div className="text-base font-bold text-white">
              Drag & Drop your land document here
            </div>
            <p className="text-xs text-slate-400">
              Supports high-resolution document scans (PDF, PNG, JPG, JPEG, TIFF, BMP) up to 25MB.
            </p>
            <div className="pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors">
                <span>Browse Local File</span>
                <input type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp" />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Quick Select Sample Deed */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Select Prototype Demonstration Sample</h3>
          <span className="text-[11px] text-slate-400">All 6 pre-verified academic demo documents</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sampleDeeds.map((sample, idx) => {
            const isSelected = selectedFile?.name === sample.name;
            const badgeClasses = 
              sample.badgeColor === 'emerald'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                : sample.badgeColor === 'rose'
                ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                : 'bg-sky-950/80 text-sky-300 border-sky-700/60';

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all gap-2 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/50 shadow-md shadow-blue-950/50'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClasses}`}>
                      {sample.category}
                    </span>
                    <span className="text-[10px] text-slate-500">{sample.size}</span>
                  </div>
                  <div className="text-xs font-bold text-white truncate" title={sample.name}>
                    {sample.name}
                  </div>
                  <div className="text-[11px] text-slate-400">{sample.type}</div>
                </div>
                <div className="text-[10px] font-medium text-slate-400 pt-1.5 border-t border-slate-800/80">
                  {sample.status}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Document Settings & Action Button */}
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-1/2">
          <label className="block text-xs font-semibold text-slate-300 mb-1">Select Document Category</label>
          <select 
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="Sale Deed">Registered Sale Deed</option>
            <option value="7/12 Extract">7/12 Revenue Extract / RoR</option>
            <option value="Patta Passbook">Patta Passbook / Title Certificate</option>
            <option value="Encumbrance Certificate">Encumbrance Certificate (EC)</option>
            <option value="Gift Deed">Gift / Partition Deed</option>
          </select>
        </div>

        <button
          disabled={!selectedFile || isUploading}
          onClick={handleStartAnalysis}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
            !selectedFile || isUploading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-950'
          }`}
        >
          {isUploading ? (
            <>
              <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Uploading & Processing OCR...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Analyze Document</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

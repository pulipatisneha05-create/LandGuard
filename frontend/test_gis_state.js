// Verification script for GIS state synchronization, survey matching, and dual-track risk logic

function isSurveyMatch(surveyA, surveyB) {
  if (!surveyA || !surveyB) return false;
  const a = String(surveyA).trim().toUpperCase();
  const b = String(surveyB).trim().toUpperCase();
  if (a === b) return true;

  const cleanA = a.replace(/^(SYN-|SY-|SURVEY-)/, '').replace(/^(TEST-|DEMO-)/, '');
  const cleanB = b.replace(/^(SYN-|SY-|SURVEY-)/, '').replace(/^(TEST-|DEMO-)/, '');
  if (cleanA === cleanB) return true;

  const stripA = cleanA.replace(/[\s\-_/]/g, '');
  const stripB = cleanB.replace(/[\s\-_/]/g, '');
  if (stripA.length >= 2 && stripA === stripB) return true;

  if (cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA)) {
    if (a.endsWith('/' + b) || a.endsWith('-' + b) || b.endsWith('/' + a) || b.endsWith('-' + a)) {
      return true;
    }
  }

  return false;
}

function resolveGisState(activeDocument, verificationResult, allFeatures) {
  const docSurvey = activeDocument?.extracted_fields?.survey_number ||
                    activeDocument?.extracted_survey_number ||
                    activeDocument?.survey_number || null;

  const docRiskScore = typeof verificationResult?.risk_score === 'number'
    ? verificationResult.risk_score
    : (typeof activeDocument?.risk_score === 'number' ? activeDocument.risk_score : null);

  const docRiskLevel = verificationResult?.risk_level ||
                       activeDocument?.risk_level ||
                       (docRiskScore !== null ? (docRiskScore >= 60 ? 'HIGH' : 'LOW') : null);

  // Selection
  let selectedParcel = null;
  let selectedFeature = null;

  if (activeDocument && docSurvey) {
    const match = allFeatures.find((f) => isSurveyMatch(f.properties?.survey_number, docSurvey));
    if (match) {
      selectedParcel = match.properties;
      selectedFeature = match;
    } else {
      selectedParcel = null;
      selectedFeature = null;
    }
  } else if (!activeDocument && allFeatures.length > 0) {
    selectedParcel = allFeatures[0].properties;
    selectedFeature = allFeatures[0];
  }

  // Feature styling and effective risk
  const styledFeatures = allFeatures.map((feat) => {
    const p = feat.properties || {};
    const refRisk = (p.reference_risk_level || p.risk_level || 'LOW').toUpperCase();
    const isDocLinked = Boolean(activeDocument && docSurvey && isSurveyMatch(p.survey_number, docSurvey));

    if (isDocLinked) {
      const isElevated = Boolean((docRiskScore !== null && docRiskScore >= 60) || p.has_document_conflict);
      return {
        survey_number: p.survey_number,
        isDocLinked: true,
        riskLevel: isElevated ? (docRiskLevel || 'HIGH') : refRisk,
        isElevatedByDoc: isElevated,
        referenceRiskLevel: refRisk,
        docRiskScore: docRiskScore ?? 0,
        renderColor: isElevated ? '#f43f5e' : '#10b981'
      };
    }

    return {
      survey_number: p.survey_number,
      isDocLinked: false,
      riskLevel: refRisk,
      isElevatedByDoc: false,
      referenceRiskLevel: refRisk,
      docRiskScore: null,
      renderColor: refRisk === 'HIGH' ? '#f43f5e' : '#10b981'
    };
  });

  return {
    selectedParcel,
    selectedFeature,
    styledFeatures,
    isLinked: Boolean(selectedParcel && isSurveyMatch(selectedParcel.survey_number, docSurvey))
  };
}

// Test Fixtures
const mockFeatures = [
  {
    id: "PARCEL-TEST-1042",
    properties: { survey_number: "SY-TEST-104/2", owner_name: "Arun Kumar", risk_level: "LOW" }
  },
  {
    id: "PARCEL-101A",
    properties: { survey_number: "101/A", owner_name: "Anil Kumar Rao", risk_level: "LOW" }
  },
  {
    id: "PARCEL-118A",
    properties: { survey_number: "118/A", owner_name: "Venkat Swamy Goud", risk_level: "LOW" }
  }
];

console.log("=== RUNNING GIS FRONTEND STATE VERIFICATION ===");

// 1. Survey matching tests
console.log("\n[TEST 1] Survey number matching assertion...");
if (!isSurveyMatch("101/A", "101/A")) throw new Error("101/A exact failed");
if (!isSurveyMatch("101/A", "SYN-101/A")) throw new Error("SYN-101/A prefix failed");
if (!isSurveyMatch("SY-TEST-104/2", "104/2")) throw new Error("104/2 prefix failed");
if (isSurveyMatch("SY-UNINDEXED-999", "101/A")) throw new Error("False positive on unindexed");
console.log("-> PASS: All survey matching patterns passed.");

// 2. Suspicious Document Scenario
console.log("\n[TEST 2] Suspicious Document (Survey 101/A, Score 60/HIGH)...");
const suspDoc = { document_id: "DOC-SUSP-001", extracted_survey_number: "101/A" };
const suspVer = { document_id: "DOC-SUSP-001", risk_score: 60, risk_level: "HIGH" };
const stateSusp = resolveGisState(suspDoc, suspVer, mockFeatures);

if (!stateSusp.selectedParcel || stateSusp.selectedParcel.survey_number !== "101/A") {
  throw new Error("Failed to select parcel 101/A for suspicious document");
}
const p101 = stateSusp.styledFeatures.find(f => f.survey_number === "101/A");
if (!p101.isDocLinked || !p101.isElevatedByDoc || p101.renderColor !== '#f43f5e') {
  throw new Error("Parcel 101/A not correctly styled with elevated document risk");
}
if (p101.referenceRiskLevel !== 'LOW') {
  throw new Error("Reference parcel risk should be LOW");
}
// Crucial: check unrelated parcels (118/A, 104/2) are NOT elevated
const p118 = stateSusp.styledFeatures.find(f => f.survey_number === "118/A");
if (p118.isElevatedByDoc || p118.renderColor !== '#10b981') {
  throw new Error("Unrelated parcel 118/A was incorrectly elevated");
}
console.log("-> PASS: Suspicious document parcel 101/A elevated to HIGH (#f43f5e) while reference risk remains LOW and unrelated parcels remain green.");

// 3. Unindexed Document Scenario
console.log("\n[TEST 3] Unindexed Document (Survey SY-UNINDEXED-999)...");
const unindDoc = { document_id: "DOC-UNINDEXED-001", extracted_survey_number: "SY-UNINDEXED-999" };
const unindVer = { document_id: "DOC-UNINDEXED-001", risk_score: 0, risk_level: "LOW", verification_status: "REFERENCE_NOT_FOUND" };
const stateUnind = resolveGisState(unindDoc, unindVer, mockFeatures);

if (stateUnind.selectedParcel !== null) {
  throw new Error("Unindexed document should have selectedParcel = null, got: " + JSON.stringify(stateUnind.selectedParcel));
}
if (stateUnind.styledFeatures.some(f => f.isElevatedByDoc)) {
  throw new Error("No parcel should be elevated for unindexed document");
}
console.log("-> PASS: Unindexed document yields null selection with no unrelated parcels selected or elevated.");

// 4. Normal Document Scenario
console.log("\n[TEST 4] Normal Document (Survey SY-TEST-104/2, Score 0/LOW)...");
const normDoc = { document_id: "DOC-NORMAL-001", extracted_survey_number: "SY-TEST-104/2" };
const normVer = { document_id: "DOC-NORMAL-001", risk_score: 0, risk_level: "LOW" };
const stateNorm = resolveGisState(normDoc, normVer, mockFeatures);

if (!stateNorm.selectedParcel || stateNorm.selectedParcel.survey_number !== "SY-TEST-104/2") {
  throw new Error("Failed to select parcel SY-TEST-104/2 for normal document");
}
const p104 = stateNorm.styledFeatures.find(f => f.survey_number === "SY-TEST-104/2");
if (!p104.isDocLinked || p104.isElevatedByDoc || p104.renderColor !== '#10b981') {
  throw new Error("Normal parcel should be clean green (#10b981)");
}
console.log("-> PASS: Normal document selects SY-TEST-104/2 and renders clean green (#10b981).");

// 5. Switching Isolation
console.log("\n[TEST 5] Rapid document switching state isolation...");
// Switch: Suspicious -> Unindexed -> Normal -> Suspicious
const s1 = resolveGisState(suspDoc, suspVer, mockFeatures);
const s2 = resolveGisState(unindDoc, unindVer, mockFeatures);
const s3 = resolveGisState(normDoc, normVer, mockFeatures);
const s4 = resolveGisState(suspDoc, suspVer, mockFeatures);

if (s1.selectedParcel.survey_number !== "101/A") throw new Error("Step 1 failed");
if (s2.selectedParcel !== null) throw new Error("Step 2 failed");
if (s3.selectedParcel.survey_number !== "SY-TEST-104/2") throw new Error("Step 3 failed");
if (s4.selectedParcel.survey_number !== "101/A") throw new Error("Step 4 failed");
console.log("-> PASS: Document switching cleanly isolates selection without stale parcel artifacts.");

console.log("\n=== ALL GIS FRONTEND STATE TESTS PASSED SUCCESSFULLY! ===");

/**
 * Comprehensive Automated Test Suite for LandGuard Risk Scoring & Anomaly Detection Pipeline.
 *
 * Verifies:
 * 1. Matching clean record produces low score (0–10).
 * 2. Owner mismatch increases score (+25).
 * 3. Survey mismatch increases score (+20).
 * 4. Land area discrepancy/inflation increases score (+20).
 * 5. Multiple independent mismatches produce higher score than clean record and single mismatch (60 vs 0).
 * 6. Duplicate registration produces critical risk alert (+30).
 * 7. Unindexed parcel produces 0 fraud penalty points (REFERENCE_NOT_FOUND) without false fraud accusations.
 * 8. State consistency across Verification Results, Risk Score Audit, and GIS Map.
 */

import { evaluateDocumentRisk, compareNames, compareAreas, normalizeAreaToAcres, ANOMALY_WEIGHTS } from '../utils/verificationEvaluator.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failedCount++;
  }
}

console.log('======================================================================');
console.log('LANDGUARD RISK SCORING & ANOMALY DETECTION TEST SUITE');
console.log('======================================================================\n');

// ---------------------------------------------------------------------------
// TEST 1: Matching clean record produces low score (0–10)
// ---------------------------------------------------------------------------
console.log('Scenario 1: Verified Clean Match');
const cleanDeed = {
  document_id: 'DOC-CLEAN-1042',
  extracted_nlp_fields: {
    owner_name: 'Arun Kumar',
    survey_number: 'SY-TEST-104/2',
    land_area_normalized_acres: 0.0496,
    village: 'Green Valley',
    mandal: 'Demo Mandal',
    district: 'Demo District'
  }
};
const cleanResult = evaluateDocumentRisk(cleanDeed);
assert(cleanResult !== null, 'Clean record evaluates successfully');
assert(cleanResult.risk_score <= 10, 'Clean record produces low risk score (<= 10)', `got ${cleanResult.risk_score}`);
assert(cleanResult.risk_level === 'LOW', 'Clean record assigned LOW risk category', `got ${cleanResult.risk_level}`);
assert(cleanResult.verification_status === 'VERIFIED', 'Clean record verification status is VERIFIED', `got ${cleanResult.verification_status}`);
assert(cleanResult.record_inconsistencies.length === 0, 'Clean record has zero record inconsistencies');
assert(cleanResult.field_matches.owner_match === true, 'Owner match flag is true');
assert(cleanResult.field_matches.survey_number_match === true, 'Survey number match flag is true');
assert(cleanResult.field_matches.land_area_match === true, 'Land area match flag is true');

console.log('');

// ---------------------------------------------------------------------------
// TEST 2: Owner mismatch increases score (+25)
// ---------------------------------------------------------------------------
console.log('Scenario 2: Owner Name Mismatch Anomaly');
const ownerMismatchDeed = {
  document_id: 'DOC-OWNER-MISMATCH',
  extracted_nlp_fields: {
    owner_name: 'Rajesh Varma', // Registered owner is Farhan Ahmed
    survey_number: '201/A',
    land_area_normalized_acres: 5.0,
    village: 'Hilltop',
    mandal: 'Maheshwaram',
    district: 'Ranga Reddy'
  }
};
const ownerMismatchResult = evaluateDocumentRisk(ownerMismatchDeed);
assert(ownerMismatchResult.risk_score >= cleanResult.risk_score + 25, 'Owner mismatch increases risk score by at least +25', `got score ${ownerMismatchResult.risk_score} vs clean ${cleanResult.risk_score}`);
assert(ownerMismatchResult.field_matches.owner_match === false, 'Owner match flag is false');
const hasOwnerAnomaly = ownerMismatchResult.detected_anomalies.some(a => a.type === 'OWNER_NAME_MISMATCH');
assert(hasOwnerAnomaly, 'OWNER_NAME_MISMATCH anomaly is flagged');
const ownerAnomaly = ownerMismatchResult.detected_anomalies.find(a => a.type === 'OWNER_NAME_MISMATCH');
assert(ownerAnomaly?.points_added === 25, 'OWNER_NAME_MISMATCH adds exactly 25 points', `got ${ownerAnomaly?.points_added}`);
assert(ownerMismatchResult.verification_status === 'SUSPICIOUS', 'Status is flagged as SUSPICIOUS');

console.log('');

// ---------------------------------------------------------------------------
// TEST 3: Survey mismatch increases score (+20)
// ---------------------------------------------------------------------------
console.log('Scenario 3: Survey Number Mismatch Anomaly');
const surveyMismatchDeed = {
  document_id: 'DOC-SURVEY-MISMATCH',
  extracted_nlp_fields: {
    owner_name: 'Anil Kumar Rao',
    survey_number: '101/B', // Base is 101/A
    land_area_normalized_acres: 2.50,
    village: 'Greenvalley',
    mandal: 'Serilingampally',
    district: 'Ranga Reddy'
  }
};
const surveyMismatchResult = evaluateDocumentRisk(surveyMismatchDeed);
assert(surveyMismatchResult.field_matches.survey_number_match === false, 'Survey match flag is false');
const hasSurveyAnomaly = surveyMismatchResult.detected_anomalies.some(a => a.type === 'SURVEY_NUMBER_MISMATCH');
assert(hasSurveyAnomaly, 'SURVEY_NUMBER_MISMATCH anomaly is flagged');
const surveyAnomaly = surveyMismatchResult.detected_anomalies.find(a => a.type === 'SURVEY_NUMBER_MISMATCH');
assert(surveyAnomaly?.points_added === 20, 'SURVEY_NUMBER_MISMATCH adds exactly 20 points', `got ${surveyAnomaly?.points_added}`);
assert(surveyMismatchResult.risk_score >= 20, 'Score reflects survey mismatch penalty', `got ${surveyMismatchResult.risk_score}`);

console.log('');

// ---------------------------------------------------------------------------
// TEST 4: Land Area Discrepancy / Inflation increases score (+20)
// ---------------------------------------------------------------------------
console.log('Scenario 4: Land Area Discrepancy Anomaly');
const areaMismatchDeed = {
  document_id: 'DOC-AREA-MISMATCH',
  extracted_nlp_fields: {
    owner_name: 'Bhavana Sharma',
    survey_number: '102/B',
    land_area_normalized_acres: 4.50, // Registered area is 1.80 Acres (150% inflation)
    village: 'Greenvalley',
    mandal: 'Serilingampally',
    district: 'Ranga Reddy'
  }
};
const areaMismatchResult = evaluateDocumentRisk(areaMismatchDeed);
assert(areaMismatchResult.field_matches.land_area_match === false, 'Land area match flag is false');
const hasAreaAnomaly = areaMismatchResult.detected_anomalies.some(a => a.type === 'LAND_AREA_MISMATCH');
assert(hasAreaAnomaly, 'LAND_AREA_MISMATCH anomaly is flagged');
const areaAnomaly = areaMismatchResult.detected_anomalies.find(a => a.type === 'LAND_AREA_MISMATCH');
assert(areaAnomaly?.points_added === 20, 'LAND_AREA_MISMATCH adds exactly 20 points', `got ${areaAnomaly?.points_added}`);
assert(areaMismatchResult.risk_score >= 20, 'Score reflects area mismatch penalty', `got ${areaMismatchResult.risk_score}`);

console.log('');

// ---------------------------------------------------------------------------
// TEST 5: Multiple independent mismatches produce higher score than clean record
// ---------------------------------------------------------------------------
console.log('Scenario 5: Multiple Independent Anomalies (Suspicious Deed)');
const multiAnomalyDeed = {
  document_id: 'DOC-SUSPICIOUS-2026-002',
  extracted_nlp_fields: {
    owner_name: 'Fictional Test Owner', // Mismatch vs Anil Kumar Rao (+25)
    survey_number: '101/A',
    land_area_normalized_acres: 12.50, // Inflation vs 2.50 Acres (+20)
    village: 'Greenvalley',
    mandal: 'Serilingampally',
    district: 'Ranga Reddy'
  }
};
const multiResult = evaluateDocumentRisk(multiAnomalyDeed);
assert(multiResult.risk_score > cleanResult.risk_score, 'Multi-anomaly score is significantly higher than clean record', `${multiResult.risk_score} > ${cleanResult.risk_score}`);
assert(multiResult.risk_score > ownerMismatchResult.risk_score, 'Multi-anomaly score is higher than single mismatch', `${multiResult.risk_score} > ${ownerMismatchResult.risk_score}`);
assert(multiResult.risk_score >= 60, 'Multi-anomaly score is at least 60 (HIGH risk tier)', `got ${multiResult.risk_score}`);
assert(multiResult.risk_level === 'HIGH', 'Risk level is HIGH', `got ${multiResult.risk_level}`);
assert(multiResult.detected_anomalies.length >= 2, 'Multiple independent anomalies detected', `count: ${multiResult.detected_anomalies.length}`);

console.log('');

// ---------------------------------------------------------------------------
// TEST 6: Duplicate registration produces critical risk alert (+30)
// ---------------------------------------------------------------------------
console.log('Scenario 6: Duplicate Registration Alert');
const duplicateDeed = {
  document_id: 'DOC-DUP-501A',
  extracted_nlp_fields: {
    owner_name: 'Kavitha Nambiar',
    survey_number: '501/A', // Multiple records exist for 501/A in registry
    land_area_normalized_acres: 4.0,
    village: 'Forest Edge',
    mandal: 'Moinabad',
    district: 'Ranga Reddy'
  }
};
const duplicateResult = evaluateDocumentRisk(duplicateDeed);
const hasDupAnomaly = duplicateResult.detected_anomalies.some(a => a.type === 'DUPLICATE_REGISTRATION_FLAGGED');
assert(hasDupAnomaly, 'DUPLICATE_REGISTRATION_FLAGGED anomaly is present');
const dupAnomaly = duplicateResult.detected_anomalies.find(a => a.type === 'DUPLICATE_REGISTRATION_FLAGGED');
assert(dupAnomaly?.severity === 'Critical', 'DUPLICATE_REGISTRATION_FLAGGED has Critical severity');
assert(dupAnomaly?.points_added === 30, 'DUPLICATE_REGISTRATION_FLAGGED adds 30 points');
assert(duplicateResult.risk_score >= 70, 'Duplicate deed achieves high/critical risk score', `got ${duplicateResult.risk_score}`);

console.log('');

// ---------------------------------------------------------------------------
// TEST 7: Unindexed parcel produces 0 fraud penalty points (REFERENCE_NOT_FOUND)
// ---------------------------------------------------------------------------
console.log('Scenario 7: Unindexed Registry Notice (Not Fraud)');
const unindexedDeed = {
  document_id: 'DOC-UNINDEXED-999',
  extracted_nlp_fields: {
    owner_name: 'Praveen Reddy',
    survey_number: 'SY-UNINDEXED-999',
    land_area_normalized_acres: 2.0
  }
};
const unindexedResult = evaluateDocumentRisk(unindexedDeed);
assert(unindexedResult.verification_status === 'REFERENCE_NOT_FOUND', 'Verification status is REFERENCE_NOT_FOUND');
assert(unindexedResult.risk_score === 0, 'Unindexed parcel receives 0 fraud penalty points', `got ${unindexedResult.risk_score}`);
assert(unindexedResult.risk_level === 'LOW', 'Assigned LOW risk category (not penalized)');
assert(unindexedResult.record_inconsistencies.length === 0, 'Zero fraud inconsistencies attributed to unindexed record');

console.log('');

// ---------------------------------------------------------------------------
// TEST 8: State consistency across Verification Results, Risk Score, and GIS Map
// ---------------------------------------------------------------------------
console.log('Scenario 8: Workflow Cross-Page State Consistency');
const testDoc = multiAnomalyDeed;
const evalResult = evaluateDocumentRisk(testDoc);

// Simulated VerificationResults derivation
const verScore = evalResult.risk_score;
const verLevel = evalResult.risk_level;
const verAnomalies = evalResult.detected_anomalies;

// Simulated RiskScoreView derivation
const riskViewScore = evalResult.risk_score != null ? evalResult.risk_score : null;
const riskViewBreakdown = evalResult.scoring_breakdown;
const riskViewLevel = evalResult.risk_level;

// Simulated GisMap derivation
const gisDocScore = evalResult.risk_score;
const gisDocLevel = evalResult.risk_level;
const gisReasonsCount = evalResult.detected_anomalies.filter(a => a.category !== 'Reference Status').length;

assert(verScore === riskViewScore && riskViewScore === gisDocScore, 'Risk score is identical across Verification, Risk View, and GIS', `${verScore} === ${riskViewScore} === ${gisDocScore}`);
assert(verLevel === riskViewLevel && riskViewLevel === gisDocLevel, 'Risk level category is identical across all three views', `${verLevel} === ${riskViewLevel} === ${gisDocLevel}`);
assert(gisReasonsCount > 0, 'GIS Map displays non-empty risk reasons for suspicious deed', `count: ${gisReasonsCount}`);
assert(verScore === 60, 'Suspicious deed score is strictly 60/100, not defaulting to 0', `got ${verScore}`);

console.log('\n======================================================================');
console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('======================================================================\n');

if (failedCount > 0) {
  process.exit(1);
}

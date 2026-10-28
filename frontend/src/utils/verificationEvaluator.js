import { allSearchableRecords } from '../data/allLandRecords.js';

// Transparent rule-based anomaly weights matching backend engine
export const ANOMALY_WEIGHTS = {
  DUPLICATE_REGISTRATION_FLAGGED: 30,
  OWNER_NAME_MISMATCH: 25,
  SURVEY_NUMBER_MISMATCH: 20,
  LAND_AREA_MISMATCH: 20,
  SPATIAL_LOCATION_MISMATCH: 20,
  RAPID_OWNERSHIP_TRANSFER: 15,
  UNFOUND_SELLER_IN_HISTORY: 15,
  MISSING_HISTORICAL_TITLE_CHAIN: 15,
  INCOMPLETE_DOCUMENT_DATA: 10,
  LOW_OCR_CONFIDENCE: 5,
  REFERENCE_RECORD_NOT_AVAILABLE: 0,
  SURVEY_NOT_FOUND: 0,
  GIS_PARCEL_NOT_FOUND: 0,
  DOCUMENT_NOT_FOUND: 0
};

// Known ownership history chains from reference registry (sample_data/ownership_history.csv)
export const KNOWN_OWNERSHIP_HISTORIES = {
  '101/A': [
    { history_id: 'HIST-001', survey_number: '101/A', owner_name: 'Ramakrishna Rao', transfer_date: '1995-04-10', transfer_type: 'Original Grant' },
    { history_id: 'HIST-002', survey_number: '101/A', owner_name: 'Anil Kumar Rao', transfer_date: '2020-03-15', transfer_type: 'Sale Deed' }
  ],
  '102/B': [
    { history_id: 'HIST-003', survey_number: '102/B', owner_name: 'Govind Sharma', transfer_date: '1998-08-12', transfer_type: 'Original Grant' },
    { history_id: 'HIST-004', survey_number: '102/B', owner_name: 'Bhavana Sharma', transfer_date: '2021-06-20', transfer_type: 'Sale Deed' }
  ],
  '103/C': [
    { history_id: 'HIST-005', survey_number: '103/C', owner_name: 'Chandra Shekhar Verma', transfer_date: '2019-11-10', transfer_type: 'Gift Deed' }
  ],
  '201/A': [
    { history_id: 'HIST-006', survey_number: '201/A', owner_name: 'Farhan Ahmed', transfer_date: '2018-04-12', transfer_type: 'Sale Deed' }
  ],
  '202/B': [
    { history_id: 'HIST-007', survey_number: '202/B', owner_name: 'Gita Devi', transfer_date: '2021-09-30', transfer_type: 'Sale Deed' }
  ],
  '301/A': [
    { history_id: 'HIST-008', survey_number: '301/A', owner_name: 'Harish Chandra', transfer_date: '2020-12-01', transfer_type: 'Sale Deed' }
  ],
  '401/A': [
    { history_id: 'HIST-009', survey_number: '401/A', owner_name: 'Mukund Joshi', transfer_date: '2002-01-12', transfer_type: 'Original Grant' },
    { history_id: 'HIST-010', survey_number: '401/A', owner_name: 'Jayant Joshi', transfer_date: '2019-02-28', transfer_type: 'Inheritance Mutation' }
  ],
  '402/B': [
    { history_id: 'HIST-011', survey_number: '402/B', owner_name: 'Subhash Sharma', transfer_date: '2005-07-14', transfer_type: 'Original Grant' },
    { history_id: 'HIST-012', survey_number: '402/B', owner_name: 'Rajesh Kumar Sharma', transfer_date: '2023-05-14', transfer_type: 'Sale Deed' }
  ],
  '501/A': [
    { history_id: 'HIST-013', survey_number: '501/A', owner_name: 'Lokesh Gupta', transfer_date: '2021-10-15', transfer_type: 'Sale Deed' },
    { history_id: 'HIST-014', survey_number: '501/A', owner_name: 'Madhav Singh', transfer_date: '2023-11-20', transfer_type: 'Duplicate Sale Deed' }
  ],
  '601/A': [
    { history_id: 'HIST-015', survey_number: '601/A', owner_name: 'Anand Saxena', transfer_date: '2023-12-01', transfer_type: 'Original Sale' },
    { history_id: 'HIST-016', survey_number: '601/A', owner_name: 'Vijay Saxena', transfer_date: '2023-12-15', transfer_type: 'Rapid Resale' },
    { history_id: 'HIST-017', survey_number: '601/A', owner_name: 'Nitin Saxena', transfer_date: '2024-01-10', transfer_type: 'Rapid Resale' }
  ],
  '602/B': [
    { history_id: 'HIST-018', survey_number: '602/B', owner_name: 'Omkar Kulkarni', transfer_date: '2024-02-05', transfer_type: 'Gift Deed (No Prior History)' }
  ],
  '801/A': [
    { history_id: 'HIST-019', survey_number: '801/A', owner_name: 'Bishwanath Prasad', transfer_date: '1988-06-20', transfer_type: 'Original Grant' },
    { history_id: 'HIST-020', survey_number: '801/A', owner_name: 'Rameshwar Prasad', transfer_date: '2017-05-11', transfer_type: 'Inheritance Mutation' }
  ],
  '901/A': [
    { history_id: 'HIST-021', survey_number: '901/A', owner_name: 'Harpreet Chawla', transfer_date: '2010-09-05', transfer_type: 'Sale Deed' },
    { history_id: 'HIST-022', survey_number: '901/A', owner_name: 'Tarun Chawla', transfer_date: '2022-11-30', transfer_type: 'Sale Deed' }
  ],
  'SY-TEST-104/2': [
    { history_id: 'HIST-TEST-1042-1', survey_number: 'SY-TEST-104/2', owner_name: 'Ram Kumar', transfer_date: '2015-06-10', transfer_type: 'Original Grant' },
    { history_id: 'HIST-TEST-1042-2', survey_number: 'SY-TEST-104/2', owner_name: 'Arun Kumar', transfer_date: '2026-09-15', transfer_type: 'Sale Deed' }
  ],
  '118/A': [
    { history_id: 'HIST-118A-1', survey_number: '118/A', owner_name: 'Mallaiah Goud', transfer_date: '1998-04-10', transfer_type: 'Original Grant' },
    { history_id: 'HIST-118A-2', survey_number: '118/A', owner_name: 'Venkat Swamy Goud', transfer_date: '2024-05-12', transfer_type: 'Patta Passbook' }
  ],
  '304/C': [
    { history_id: 'HIST-304C-1', survey_number: '304/C', owner_name: 'K. S. Rao', transfer_date: '2010-01-05', transfer_type: 'Original Grant' },
    { history_id: 'HIST-304C-2', survey_number: '304/C', owner_name: 'Anuradha Rao', transfer_date: '2026-10-15', transfer_type: 'Sale Deed' }
  ],
  'SYN-101/A': [
    { history_id: 'SYN-HIST-001', survey_number: 'SYN-101/A', owner_name: 'Dantuluri Narayana Rao', transfer_date: '1996-02-02', transfer_type: 'Ancestral Partition' },
    { history_id: 'SYN-HIST-002', survey_number: 'SYN-101/A', owner_name: 'Kalyan Varma Dantuluri', transfer_date: '2017-02-02', transfer_type: 'Gift Deed' }
  ]
};

/**
 * Compare two Indian owner names accounting for honorifics, initials, and token ordering.
 */
export function compareNames(name1, name2) {
  if (!name1 || !name2) return false;
  const clean = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\b(mr|mrs|sri|smt|shri|late|dr|md|mister)\b/g, '')
      .trim();

  const n1 = clean(name1);
  const n2 = clean(name2);

  if (n1 === n2) return true;

  const t1 = new Set(n1.split(/\s+/).filter(Boolean));
  const t2 = new Set(n2.split(/\s+/).filter(Boolean));

  const common = [...t1].filter((x) => t2.has(x));

  // If at least 2 tokens match or both are single identical token
  if (common.length >= 2 || (t1.size === 1 && t2.size === 1 && common.length >= 1)) {
    return true;
  }

  // Token subset match when one is multi-word name
  if (common.length >= 1 && (t1.size <= 2 || t2.size <= 2)) {
    const isMajorToken = common.some((t) => t.length > 3);
    if (isMajorToken) return true;
  }

  return false;
}

/**
 * Normalize any land area extent to standard Acres.
 */
export function normalizeAreaToAcres(value, unit = 'Acres') {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return 0.0;

  const u = String(unit || 'acres').toLowerCase().trim();

  if (u.includes('gunt') || u.includes('gunth')) {
    return num * 0.025; // 40 guntas = 1 acre
  }
  if (u.includes('sq y') || u.includes('yard') || u.includes('sq. y') || u.includes('yds')) {
    return num * 0.00020661157; // 4840 sq yds = 1 acre
  }
  if (u.includes('hect') || u.includes('ha')) {
    return num * 2.47105;
  }
  if (u.includes('cent')) {
    return num * 0.01;
  }
  if (u.includes('sq ft') || u.includes('feet')) {
    return num * 0.0000229568;
  }

  // Default assumption: Acres
  return num;
}

/**
 * Compare claimed deed area with reference area extent.
 * Returns { match: boolean, discrepancyPct: number, docAcres: number, refAcres: number }
 */
export function compareAreas(claimedVal, claimedUnit, refAcres, tolerancePct = 5.0) {
  const docAcres = normalizeAreaToAcres(claimedVal, claimedUnit);
  const ref = parseFloat(refAcres) || 0.0;

  if (ref <= 0 || docAcres <= 0) {
    return {
      match: false,
      discrepancyPct: 100.0,
      docAcres: Number(docAcres.toFixed(4)),
      refAcres: ref
    };
  }

  const diff = Math.abs(docAcres - ref);
  const discrepancyPct = (diff / ref) * 100.0;
  const match = discrepancyPct <= tolerancePct;

  return {
    match,
    discrepancyPct: Number(discrepancyPct.toFixed(2)),
    docAcres: Number(docAcres.toFixed(4)),
    refAcres: ref
  };
}

/**
 * Retrieve ownership history timeline for a given document or survey number.
 */
export function getLocalOwnershipHistory(surveyOrDocId) {
  let survey = surveyOrDocId;
  if (!survey) return { survey_number: 'Unspecified', history_timeline: [] };

  // If passed an object or doc ID
  if (typeof survey !== 'string') {
    survey = survey.survey_number || survey.surveyNumber || '';
  }

  // Check direct survey lookup
  let found = KNOWN_OWNERSHIP_HISTORIES[survey];
  if (!found) {
    // Try matching survey without prefix / suffix
    const cleanKey = Object.keys(KNOWN_OWNERSHIP_HISTORIES).find((k) =>
      survey.includes(k) || k.includes(survey)
    );
    if (cleanKey) {
      found = KNOWN_OWNERSHIP_HISTORIES[cleanKey];
      survey = cleanKey;
    }
  }

  return {
    survey_number: survey,
    history_timeline: found ? [...found] : []
  };
}

/**
 * Core Rule-Based Land Record Verification and Anomaly Detection Evaluator.
 * Matches document extracted fields against reference registry and ownership chains.
 * Always produces explainable, capped (0-100) risk scores based on actual detected inconsistencies.
 */
export function evaluateDocumentRisk(activeDoc) {
  if (!activeDoc) return null;

  const docId = activeDoc.document_id || activeDoc.id || 'DOC-UNASSIGNED';
  const fields =
    activeDoc.extracted_nlp_fields ||
    activeDoc.extracted_fields ||
    activeDoc.nlp_fields ||
    activeDoc;

  // Extract primary fields
  const surveyNumber = (
    fields.survey_number ||
    fields.surveyNumber ||
    activeDoc.survey_number ||
    activeDoc.surveyNumber ||
    ''
  ).trim();

  const ownerName = (
    fields.owner_name ||
    fields.ownerName ||
    activeDoc.owner_name ||
    activeDoc.ownerName ||
    ''
  ).trim();

  const landAreaRaw = fields.land_area_raw || fields.area || activeDoc.area || '';
  const landAreaUnit = fields.land_area_unit || 'Acres';
  const landAreaNumeric = parseFloat(
    fields.land_area_normalized_acres != null
      ? fields.land_area_normalized_acres
      : fields.land_area_acres != null
      ? fields.land_area_acres
      : fields.land_area_numeric != null
      ? fields.land_area_numeric
      : fields.landArea != null
      ? fields.landArea
      : fields.area != null
      ? fields.area
      : 0
  );

  const village = (fields.village || activeDoc.village || '').trim();
  const mandal = (fields.mandal || activeDoc.mandal || '').trim();
  const district = (fields.district || activeDoc.district || '').trim();
  const ocrConfidence = parseFloat(
    activeDoc.ocr_confidence_score || activeDoc.confidence || 95.0
  );

  const fieldMatches = {
    owner_match: false,
    survey_number_match: false,
    land_area_match: false,
    spatial_match: false,
    reference_record_found: false
  };

  const detectedAnomalies = [];
  const recordInconsistencies = [];
  const dataQualityWarnings = [];
  const referenceNotices = [];

  // Check 1: Incomplete Survey Number Check
  if (!surveyNumber) {
    const issue = {
      type: 'INCOMPLETE_DOCUMENT_DATA',
      category: 'Data Quality Warning',
      severity: 'Medium',
      points_added: 10,
      title: 'Missing Survey Number',
      expected: 'Valid Cadastral Survey Number (e.g. 101/A, 118/A, 402/B)',
      found: 'No survey number extracted from document',
      description: 'The uploaded document lacks a recognizable cadastral survey parcel number required for registry cross-matching.',
      reason_for_points: 'Data quality warning: Missing survey number (+10 pts).'
    };
    detectedAnomalies.push(issue);
    dataQualityWarnings.push(issue);

    return {
      document_id: docId,
      verification_id: `VER-${docId}`,
      verification_status: 'UNVERIFIED',
      verification_outcome: 'INCONCLUSIVE',
      reference_status: 'MISSING_KEY',
      matched_record_id: null,
      matched_land_record: null,
      risk_score: 10,
      risk_level: 'LOW',
      recommendation: 'Incomplete document data: Provide a document with identifiable survey number.',
      status_summary: 'Inconclusive / Missing Key Fields (Risk Score: 10/100)',
      field_matches: fieldMatches,
      detected_anomalies: detectedAnomalies,
      scoring_breakdown: detectedAnomalies,
      record_inconsistencies: [],
      data_quality_warnings: dataQualityWarnings,
      reference_notices: [],
      anomalies_count: detectedAnomalies.length,
      disclaimer: 'Synthetic demonstration prototype. Not an official government certification.'
    };
  }

  // Check 2: Reference Record Lookup
  const cleanSurvey = surveyNumber.toLowerCase();
  let matchedRecord = allSearchableRecords.find((r) => {
    if (!r.survey_number) return false;
    if (r.type === 'document_record' || r.source === 'document_registry') return false;
    const rSurvey = r.survey_number.toLowerCase().trim();
    return rSurvey === cleanSurvey;
  });

  if (!matchedRecord) {
    // Try base survey match (e.g. "101" from "101/A")
    const baseSurvey = cleanSurvey.split('/')[0];
    matchedRecord = allSearchableRecords.find((r) => {
      if (!r.survey_number) return false;
      if (r.type === 'document_record' || r.source === 'document_registry') return false;
      const rSurvey = r.survey_number.toLowerCase().trim();
      return rSurvey.startsWith(baseSurvey);
    });
  }

  // If Survey is NOT found in reference database -> REFERENCE_NOT_FOUND (Explicitly NOT FRAUD: 0 penalty points)
  if (!matchedRecord) {
    const unindexedIssue = {
      type: 'REFERENCE_RECORD_NOT_AVAILABLE',
      category: 'Reference Status',
      severity: 'Low',
      points_added: 0,
      title: 'No Matching Reference Record in Demo Database',
      expected: `Survey parcel '${surveyNumber}' indexed in synthetic reference database`,
      found: `No reference entry found for Survey '${surveyNumber}'`,
      description: `Survey number '${surveyNumber}' does not exist in the current synthetic test dataset. This indicates an unindexed parcel in the prototype layer, not fraud or title invalidity.`,
      reason_for_points: 'Informational notice: Parcel unindexed in demonstration registry; zero penalty assigned (0 pts).'
    };
    detectedAnomalies.push(unindexedIssue);
    referenceNotices.push(unindexedIssue);

    return {
      document_id: docId,
      verification_id: `VER-${docId}`,
      verification_status: 'REFERENCE_NOT_FOUND',
      verification_outcome: 'REFERENCE_NOT_FOUND',
      reference_status: 'NO_MATCHING_REFERENCE',
      matched_record_id: null,
      matched_land_record: null,
      risk_score: 0,
      risk_level: 'LOW',
      recommendation: 'Unindexed parcel in demonstration dataset: No registered baseline found; physical registry verification required.',
      status_summary: 'Unindexed in Demo Layer (Risk Score: 0/100)',
      field_matches: fieldMatches,
      detected_anomalies: detectedAnomalies,
      scoring_breakdown: detectedAnomalies,
      record_inconsistencies: [],
      data_quality_warnings: [],
      reference_notices: referenceNotices,
      anomalies_count: detectedAnomalies.length,
      disclaimer: 'Synthetic demonstration prototype. Not an official government certification.'
    };
  }

  fieldMatches.reference_record_found = true;
  const matchedRecordId = matchedRecord.record_id || `REC-${matchedRecord.survey_number}`;
  const refAreaAcres = parseFloat(matchedRecord.land_area_acres) || 0.0;

  const matchedLandRecord = {
    record_id: matchedRecordId,
    owner_name: matchedRecord.owner_name,
    survey_number: matchedRecord.survey_number,
    land_area_acres: refAreaAcres,
    village: matchedRecord.village,
    mandal: matchedRecord.mandal,
    district: matchedRecord.district,
    state: matchedRecord.state,
    registration_number: matchedRecord.registration_number,
    document_type: matchedRecord.document_type
  };

  // Check 3: Survey Number Exact Match
  if (matchedRecord.survey_number.toLowerCase() === cleanSurvey) {
    fieldMatches.survey_number_match = true;
  } else {
    fieldMatches.survey_number_match = false;
    const issue = {
      type: 'SURVEY_NUMBER_MISMATCH',
      category: 'Record Inconsistency',
      severity: 'High',
      points_added: ANOMALY_WEIGHTS.SURVEY_NUMBER_MISMATCH,
      title: 'Survey Sub-division Mismatch',
      expected: `Exact Survey Parcel '${matchedRecord.survey_number}'`,
      found: `Document Claims Survey '${surveyNumber}'`,
      description: `Document claims Survey '${surveyNumber}', but government reference is registered under Survey '${matchedRecord.survey_number}'.`,
      reason_for_points: `High risk anomaly: Document survey subdivision differs from registered reference parcel (+${ANOMALY_WEIGHTS.SURVEY_NUMBER_MISMATCH} pts).`
    };
    detectedAnomalies.push(issue);
    recordInconsistencies.push(issue);
  }

  // Check 4: Owner Name Match
  if (ownerName && matchedRecord.owner_name) {
    if (compareNames(ownerName, matchedRecord.owner_name)) {
      fieldMatches.owner_match = true;
    } else {
      fieldMatches.owner_match = false;
      const issue = {
        type: 'OWNER_NAME_MISMATCH',
        category: 'Record Inconsistency',
        severity: 'High',
        points_added: ANOMALY_WEIGHTS.OWNER_NAME_MISMATCH,
        title: 'Ownership Name Mismatch Anomaly',
        expected: `Registered Title Owner: '${matchedRecord.owner_name}'`,
        found: `Document Executant Name: '${ownerName}'`,
        description: `Document owner name '${ownerName}' differs from official registered owner '${matchedRecord.owner_name}'.`,
        reason_for_points: `High risk anomaly: Document executant differs from registered title owner (+${ANOMALY_WEIGHTS.OWNER_NAME_MISMATCH} pts).`
      };
      detectedAnomalies.push(issue);
      recordInconsistencies.push(issue);
    }
  } else if (!ownerName) {
    const issue = {
      type: 'INCOMPLETE_DOCUMENT_DATA',
      category: 'Data Quality Warning',
      severity: 'Medium',
      points_added: ANOMALY_WEIGHTS.INCOMPLETE_DOCUMENT_DATA,
      title: 'Missing Owner / Executant Name',
      expected: 'Valid title holder or vendor executant name',
      found: 'Empty or unextracted owner name',
      description: 'The executant or vendor name could not be identified with confidence from the document text.',
      reason_for_points: `Data quality warning: Missing executant name (+${ANOMALY_WEIGHTS.INCOMPLETE_DOCUMENT_DATA} pts).`
    };
    detectedAnomalies.push(issue);
    dataQualityWarnings.push(issue);
  }

  // Check 5: Normalized Land Area Extent Match
  if (landAreaNumeric > 0) {
    const areaCmp = compareAreas(landAreaNumeric, landAreaUnit, refAreaAcres, 5.0);
    if (areaCmp.match) {
      fieldMatches.land_area_match = true;
    } else {
      fieldMatches.land_area_match = false;
      const isHigh = areaCmp.discrepancyPct > 20.0;
      const issue = {
        type: 'LAND_AREA_MISMATCH',
        category: 'Record Inconsistency',
        severity: isHigh ? 'High' : 'Medium',
        points_added: ANOMALY_WEIGHTS.LAND_AREA_MISMATCH,
        title: 'Land Area Extent Discrepancy',
        expected: `Registered Area: ${refAreaAcres.toFixed(2)} Acres`,
        found: `Document Claims: ${landAreaRaw || `${areaCmp.docAcres.toFixed(2)} Acres`} (${areaCmp.docAcres.toFixed(2)} Acres normalized)`,
        description: `Document claims ${areaCmp.docAcres.toFixed(2)} Acres, differing from registered extent of ${refAreaAcres.toFixed(2)} Acres by ${areaCmp.discrepancyPct}%.`,
        reason_for_points: `High risk anomaly: Document land area extent deviates from registered reference extent by ${areaCmp.discrepancyPct}% (+${ANOMALY_WEIGHTS.LAND_AREA_MISMATCH} pts).`
      };
      detectedAnomalies.push(issue);
      recordInconsistencies.push(issue);
    }
  } else {
    const issue = {
      type: 'INCOMPLETE_DOCUMENT_DATA',
      category: 'Data Quality Warning',
      severity: 'Medium',
      points_added: ANOMALY_WEIGHTS.INCOMPLETE_DOCUMENT_DATA,
      title: 'Zero or Unspecified Land Area',
      expected: `Registered Area: ${refAreaAcres.toFixed(2)} Acres`,
      found: landAreaRaw || '0.0',
      description: 'Document specifies zero or invalid land area extent.',
      reason_for_points: `Data quality warning: Zero land extent (+${ANOMALY_WEIGHTS.INCOMPLETE_DOCUMENT_DATA} pts).`
    };
    detectedAnomalies.push(issue);
    dataQualityWarnings.push(issue);
  }

  // Check 6: Duplicate Registration / Double Selling Check (in revenue registry)
  const duplicateRecords = allSearchableRecords.filter(
    (r) =>
      r.type !== 'document_record' &&
      r.source !== 'document_registry' &&
      r.survey_number &&
      r.survey_number.toLowerCase().trim() === matchedRecord.survey_number.toLowerCase().trim() &&
      r.record_id !== matchedRecord.record_id &&
      !compareNames(r.owner_name, matchedRecord.owner_name)
  );

  if (duplicateRecords.length > 0) {
    const dupOwners = duplicateRecords.map((r) => r.owner_name).filter(Boolean).join(', ');
    const issue = {
      type: 'DUPLICATE_REGISTRATION_FLAGGED',
      category: 'Record Inconsistency',
      severity: 'Critical',
      points_added: ANOMALY_WEIGHTS.DUPLICATE_REGISTRATION_FLAGGED,
      title: 'Duplicate Registration / Double Selling Alert',
      expected: `Single unique registration for Survey '${matchedRecord.survey_number}'`,
      found: `Multiple active registrations under sellers: ${dupOwners}`,
      description: `Survey parcel '${matchedRecord.survey_number}' is registered under multiple records (${matchedRecord.record_id} and ${duplicateRecords[0].record_id}), indicating potential duplicate conveyance or double selling.`,
      reason_for_points: `Critical title risk: Multiple active registrations found for the same parcel (+${ANOMALY_WEIGHTS.DUPLICATE_REGISTRATION_FLAGGED} pts).`
    };
    detectedAnomalies.push(issue);
    recordInconsistencies.push(issue);
  }

  // Check 7: Historical Title Chain & Unfound Seller Check
  const surveyHistories = KNOWN_OWNERSHIP_HISTORIES[matchedRecord.survey_number] || [];
  if (surveyHistories.length > 0) {
    // Check if seller appears in historical title records
    if (ownerName) {
      const appearsInHistory = surveyHistories.some((h) => compareNames(ownerName, h.owner_name));
      if (!appearsInHistory && !fieldMatches.owner_match) {
        const issue = {
          type: 'UNFOUND_SELLER_IN_HISTORY',
          category: 'Record Inconsistency',
          severity: 'High',
          points_added: ANOMALY_WEIGHTS.UNFOUND_SELLER_IN_HISTORY,
          title: 'Missing Prior Chain of Title',
          expected: 'Executant present in historical ownership transfers',
          found: `Executant '${ownerName}' absent from recorded chain`,
          description: `Executant '${ownerName}' does not appear anywhere in historical title transfers for Survey '${matchedRecord.survey_number}'.`,
          reason_for_points: `High risk anomaly: Vendor/executant not found in registered chain of title (+${ANOMALY_WEIGHTS.UNFOUND_SELLER_IN_HISTORY} pts).`
        };
        detectedAnomalies.push(issue);
        recordInconsistencies.push(issue);
      }
    }

    // Check for rapid successive transfers (< 180 days)
    for (let i = 0; i < surveyHistories.length - 1; i++) {
      const d1 = new Date(surveyHistories[i].transfer_date);
      const d2 = new Date(surveyHistories[i + 1].transfer_date);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diffDays = Math.abs(Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)));
        if (diffDays < 180) {
          const issue = {
            type: 'RAPID_OWNERSHIP_TRANSFER',
            category: 'Record Inconsistency',
            severity: 'Medium',
            points_added: ANOMALY_WEIGHTS.RAPID_OWNERSHIP_TRANSFER,
            title: 'Rapid Successive Ownership Transfer',
            expected: 'Standard holding period (> 180 days between transfers)',
            found: `Transferred within ${diffDays} days between ${surveyHistories[i + 1].owner_name} and ${surveyHistories[i].owner_name}`,
            description: `Property changed ownership within ${diffDays} days, characteristic of speculative deed flipping or rapid conveyance.`,
            reason_for_points: `Medium risk anomaly: Rapid successive transfer within <180 days (+${ANOMALY_WEIGHTS.RAPID_OWNERSHIP_TRANSFER} pts).`
          };
          detectedAnomalies.push(issue);
          recordInconsistencies.push(issue);
          break;
        }
      }
    }
  }

  // Check 8: Spatial Location Mismatch
  if (village && matchedRecord.village) {
    const v1 = village.toLowerCase().replace(/[^a-z0-9]/g, '');
    const v2 = matchedRecord.village.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (v1 !== v2 && !v1.includes(v2) && !v2.includes(v1)) {
      fieldMatches.spatial_match = false;
      const issue = {
        type: 'SPATIAL_LOCATION_MISMATCH',
        category: 'Record Inconsistency',
        severity: 'High',
        points_added: ANOMALY_WEIGHTS.SPATIAL_LOCATION_MISMATCH,
        title: 'Spatial Jurisdiction / Village Mismatch',
        expected: `Official Registered Village: '${matchedRecord.village}'`,
        found: `Document Claims Village: '${village}'`,
        description: `Document claims property is located in Village '${village}', but official cadastral registry places Survey '${matchedRecord.survey_number}' in Village '${matchedRecord.village}'.`,
        reason_for_points: `High risk anomaly: Document claimed jurisdiction conflicts with cadastral registry (+${ANOMALY_WEIGHTS.SPATIAL_LOCATION_MISMATCH} pts).`
      };
      detectedAnomalies.push(issue);
      recordInconsistencies.push(issue);
    } else {
      fieldMatches.spatial_match = true;
    }
  } else {
    fieldMatches.spatial_match = true;
  }

  // Check 9: OCR Confidence
  if (ocrConfidence > 0 && ocrConfidence < 60.0) {
    const issue = {
      type: 'LOW_OCR_CONFIDENCE',
      category: 'Data Quality Warning',
      severity: 'Low',
      points_added: ANOMALY_WEIGHTS.LOW_OCR_CONFIDENCE,
      title: 'Low OCR Extraction Confidence',
      expected: 'High text extraction confidence (> 60%)',
      found: `OCR Confidence: ${ocrConfidence.toFixed(1)}%`,
      description: 'Document scan legibility is below optimal threshold, which may impact field extraction accuracy.',
      reason_for_points: `Data quality observation: Low OCR legibility (+${ANOMALY_WEIGHTS.LOW_OCR_CONFIDENCE} pts).`
    };
    detectedAnomalies.push(issue);
    dataQualityWarnings.push(issue);
  }

  // Calculate Final Explainable Risk Score
  const rawTotalScore = detectedAnomalies.reduce(
    (sum, item) => sum + (Number(item.points_added) || 0),
    0
  );
  const finalRiskScore = Math.min(rawTotalScore, 100);

  // Risk Level Category
  let riskLevel = 'LOW';
  if (finalRiskScore >= 80) riskLevel = 'CRITICAL';
  else if (finalRiskScore >= 60) riskLevel = 'HIGH';
  else if (finalRiskScore >= 30) riskLevel = 'MEDIUM';

  // Overall Status & Outcome
  let status = 'VERIFIED';
  let outcome = 'VERIFIED_MATCH';

  if (recordInconsistencies.length > 0) {
    status = 'SUSPICIOUS';
    const hasCriticalOrHigh = recordInconsistencies.some(
      (a) => a.severity === 'Critical' || a.severity === 'High'
    );
    outcome = hasCriticalOrHigh ? 'MISMATCH' : 'PARTIAL_MATCH';
  } else if (dataQualityWarnings.length > 0) {
    status = finalRiskScore >= 30 ? 'REVIEW_NEEDED' : 'VERIFIED';
    outcome = 'PARTIAL_MATCH';
  }

  // Recommendation
  let recommendation = 'No major inconsistencies detected across official registry records.';
  if (riskLevel === 'CRITICAL') {
    recommendation =
      'Immediate detailed verification required: Critical duplicate registration or severe title conflict detected.';
  } else if (riskLevel === 'HIGH') {
    recommendation =
      'Further verification required: Multiple significant discrepancies found between deed and revenue registry.';
  } else if (riskLevel === 'MEDIUM') {
    recommendation =
      'Manual administrative review recommended: Discrepancies identified against registry records.';
  }

  const statusSummary =
    status === 'VERIFIED'
      ? `Verified Record Match (Risk Score: ${finalRiskScore}/100)`
      : `${riskLevel} Risk Anomaly Detected (Risk Score: ${finalRiskScore}/100)`;

  return {
    document_id: docId,
    verification_id: `VER-${docId}`,
    verification_status: status,
    verification_outcome: outcome,
    reference_status: 'MATCHED',
    matched_record_id: matchedRecordId,
    matched_land_record: matchedLandRecord,
    risk_score: finalRiskScore,
    risk_level: riskLevel,
    recommendation,
    status_summary: statusSummary,
    field_matches: fieldMatches,
    detected_anomalies: detectedAnomalies,
    scoring_breakdown: detectedAnomalies,
    record_inconsistencies: recordInconsistencies,
    data_quality_warnings: dataQualityWarnings,
    reference_notices: referenceNotices,
    anomalies_count: detectedAnomalies.length,
    inconsistency_score: recordInconsistencies.reduce(
      (sum, i) => sum + (Number(i.points_added) || 0),
      0
    ),
    quality_score: dataQualityWarnings.reduce(
      (sum, i) => sum + (Number(i.points_added) || 0),
      0
    ),
    disclaimer: 'Synthetic demonstration prototype. Not an official government certification.'
  };
}

import { getLocalOwnershipHistory } from "../utils/verificationEvaluator";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://landguard-1-a465.onrender.com/api";

export async function uploadDocumentApi(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload document.");
  }

  return response.json();
}

export async function getDocumentNlpApi(documentId) {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/nlp`);
  if (!response.ok) {
    throw new Error("Failed to fetch NLP extraction details.");
  }
  return response.json();
}

export async function getVerificationApi(documentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/verification/verify/${documentId}`, {
      method: "POST"
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (postErr) {
    console.warn("POST verification notice, attempting GET results fallback:", postErr.message);
  }

  const getResp = await fetch(`${API_BASE_URL}/verification/results/${documentId}`);
  if (!getResp.ok) {
    throw new Error("Failed to fetch verification results.");
  }
  return getResp.json();
}

export async function getRiskAssessmentApi(documentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/risk/assess/${documentId}`, {
      method: "POST"
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (postErr) {
    console.warn("POST risk assess notice, attempting GET assessment fallback:", postErr.message);
  }

  const getResp = await fetch(`${API_BASE_URL}/risk/assessment/${documentId}`);
  if (!getResp.ok) {
    throw new Error("Failed to fetch risk assessment.");
  }
  return getResp.json();
}

export async function getGisParcelsApi(documentId = null) {
  const url = documentId
    ? `${API_BASE_URL}/gis/parcels?document_id=${encodeURIComponent(documentId)}`
    : `${API_BASE_URL}/gis/parcels`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch GIS parcel boundaries.");
  }
  return response.json();
}

export async function getOwnershipHistoryApi(documentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/history`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("Live ownership history notice, falling back:", err.message);
  }
  return getLocalOwnershipHistory(documentId);
}

export async function searchRecordsApi(query) {
  if (!query || !query.trim()) return { count: 0, results: [] };
  const response = await fetch(`${API_BASE_URL}/documents/search?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) {
    throw new Error("Failed to search records.");
  }
  return response.json();
}


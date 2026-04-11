import { CONFIG, authFetch } from "./config.js";

const apiUrl = CONFIG.API_URL;

// Función auxiliar para POST + unwrapping del body de API Gateway/Lambda
async function post(payload) {

  const response = await authFetch(apiUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  const raw = await response.json();

  if (raw && typeof raw.body === "string") {
    try {
      return JSON.parse(raw.body);
    } catch (e) {
      console.error("No se pudo parsear raw.body:", raw.body);
      throw e;
    }
  }

  return raw?.body ?? raw;
}

export async function checkTranscriptionStatus(jobName) {
  // Espera recibir: { status, formattedReady, summaryReady, keys: {...} }
  return post({ checkStatus: { job_name: jobName } });
}

export async function getTranscriptionResults(bucketName, jobName) {
  // Espera recibir: { transcription: "...", summary: "..." }
  return post({ getResults: { job_name: jobName, bucketName } });
}

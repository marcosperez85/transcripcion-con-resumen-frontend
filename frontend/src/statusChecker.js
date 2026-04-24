export async function checkUserUsage() {
  try {
    // Llamar al endpoint real para obtener el uso actual del usuario
    const response = await post({ checkUsage: true });
    
    console.log('Datos de uso recibidos:', response);
    
    return {
      used: response.usedSeconds || 0,
      limit: response.limitSeconds || 600,
      remaining: response.remainingSeconds || 600
    };
  } catch (error) {
    console.error('Error checking usage:', error);
    return null;
  }
}import { CONFIG, authFetch } from "./config.js";

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
  // Espera recibir: { status, jobStatus, keys: {...} }
  return post({ checkStatus: { job_name: jobName } });
}

export async function getTranscriptionResults(bucketName, jobName) {
  // Espera recibir: { transcription: "...", summary: "..." }
  return post({ getResults: { job_name: jobName, bucketName } });
}

export async function getDashboardData(identityId) {
  // Llama al endpoint de dashboard pasándole el identityId
  return post({ getDashboardData: true, identityId });
}

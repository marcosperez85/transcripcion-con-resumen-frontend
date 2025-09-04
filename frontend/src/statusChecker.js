const apiUrl = "https://yfoulcwp9a.execute-api.us-east-1.amazonaws.com/prod/transcribir";

// Función auxiliar para POST + unwrapping del body de API Gateway/Lambda
async function post(payload) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Si la integración devolvió 4xx/5xx a nivel HTTP
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  // raw es del estilo: { statusCode, headers, body: "<json string>" } o directamente el objeto útil
  const raw = await response.json();

  // Si existe raw.body y es string, parseamos; si no, devolvemos raw.body o raw
  if (raw && typeof raw.body === "string") {
    try {
      return JSON.parse(raw.body);
    } catch (e) {
      console.error("No se pudo parsear raw.body:", raw.body);
      throw e;
    }
  }
  // Algunos mapeos pueden enviar el objeto ya “desenvuelto”
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

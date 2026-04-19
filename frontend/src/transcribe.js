import { CONFIG, authFetch } from "./config.js";

export async function iniciarTranscripcion(params) {
    const apiUrl = CONFIG.API_URL;

        // Extraer parámetros de transcripción del objeto params
    const bucketName = params.Bucket || params.bucketName;
    const fileKey = params.Key || params.key;
    const languageCode = params.idioma || params.languageCode || "es-ES";
    const maxSpeakers = params.speakers || params.maxSpeakers || 2;

        const body = {
        s3: {
            bucketName: bucketName,
            key: fileKey
        },
        transcribe: {
            languageCode: languageCode,
            maxSpeakers: maxSpeakers
        }
        // El modo de prueba solo se controla desde el backend
    };
    
    // Log completo para debugging
    // No exponer en producción porque revela bucket y key de subida del audio.
    // console.log("Body enviado:", body);
    const response = await authFetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        
        // Si hay un mensaje de error en formato JSON, extraerlo
        try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
                errorMessage = errorData.error;
                if (errorData.usedSeconds !== undefined && errorData.limitSeconds !== undefined) {
                    // Añadir datos de uso al mensaje de error para procesarlo
                    const usageData = {
                        usedSeconds: errorData.usedSeconds,
                        limitSeconds: errorData.limitSeconds
                    };
                    errorMessage = JSON.stringify(usageData);
                }
            }
        } catch (e) {
            console.error("Error parsing error response:", e);
        }
        
        throw new Error(errorMessage);
    }

    // Parsear la respuesta
    const data = await response.json();

    // Log completo para debugging
    // No exponer en producción porque revela bucket del output location
    // console.log("Respuesta completa:", data);
    
    // Devolver el objeto completo para que se pueda acceder a más datos
    return data;
}

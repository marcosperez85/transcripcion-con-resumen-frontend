import { CONFIG, authFetch } from "./config.js";

export async function iniciarTranscripcion(bucketName, fileKey, languageCode, maxSpeakers) {
    const apiUrl = CONFIG.API_URL;

    const body = {
        s3: {
            bucketName: bucketName,
            key: fileKey
        },
        transcribe: {
            languageCode: languageCode,
            maxSpeakers: maxSpeakers
        }
    };
    
    console.log("Body enviado:", body);
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

    console.log("Respuesta completa:", data);
    
    // Devolver el objeto completo para que se pueda acceder a más datos
    return data;
}

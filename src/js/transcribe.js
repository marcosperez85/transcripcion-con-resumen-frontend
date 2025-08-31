import { CONFIG } from './config.js';

export async function iniciarTranscripcion(bucket, key, idioma, speakers, sessionId) {
    try {
        console.log('Iniciando transcripción:', { bucket, key, idioma, speakers, sessionId });
        
        const response = await fetch(`${CONFIG.API_URL}/transcribir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                bucket: bucket,
                key: key,
                languageCode: idioma,
                maxSpeakers: speakers,
                sessionId: sessionId
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Respuesta de transcripción:', result);
        
        return result;
        
    } catch (error) {
        console.error('Error iniciando transcripción:', error);
        throw error;
    }
}

export function estimarTiempoProcesamiento(duracionAudio, numeroSpeakers) {
    // Estimación básica: 1 minuto de audio = 30-60 segundos de procesamiento
    const factorBase = 0.5; // 30 segundos por minuto de audio
    const factorSpeakers = 1 + (numeroSpeakers - 1) * 0.2; // +20% por speaker adicional
    
    const tiempoEstimadoMinutos = duracionAudio * factorBase * factorSpeakers;
    
    if (tiempoEstimadoMinutos < 1) {
        return 'Menos de 1 minuto';
    } else if (tiempoEstimadoMinutos < 60) {
        return `${Math.round(tiempoEstimadoMinutos)} minutos`;
    } else {
        const horas = Math.floor(tiempoEstimadoMinutos / 60);
        const minutos = Math.round(tiempoEstimadoMinutos % 60);
        return `${horas}h ${minutos}m`;
    }
}
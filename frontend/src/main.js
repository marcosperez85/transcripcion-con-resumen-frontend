import { uploadFileToS3 } from './s3Upload.js';
import { iniciarTranscripcion } from './transcribe.js';
import { checkTranscriptionStatus, getTranscriptionResults } from './statusChecker.js';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const $formulario = document.getElementById('uploadForm');

// Nombre del bucket DESTINO donde se va a alojar el audio, transcripción y resúmenes
const nombreDelBucket = "transcripcion-con-resumen-backend";

// ****** Sección para mostrar resultados de la transcripción y resumen ****** 
function createResultsDisplay() {
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'resultsContainer';
    resultsContainer.className = 'mt-4';
    resultsContainer.innerHTML = `
        <div id="statusDisplay" class="alert alert-info" style="display: none;">
            <strong>Estado:</strong> <span id="statusText">Procesando...</span>
        </div>
        <div id="transcriptionResults" style="display: none;">
            <h4>Transcripción:</h4>
            <div id="transcriptionText" class="border p-3 mb-3" style="max-height: 300px; overflow-y: auto;"></div>
            <h4>Resumen:</h4>
            <div id="summaryText" class="border p-3" style="max-height: 200px; overflow-y: auto;"></div>
        </div>
    `;

    const form = document.getElementById('uploadForm');
    form.parentNode.insertBefore(resultsContainer, form.nextSibling);
}

// Initialize results display
document.addEventListener('DOMContentLoaded', createResultsDisplay);

async function pollTranscriptionStatus(jobName) {
    const statusDisplay = document.getElementById('statusDisplay');
    const statusText = document.getElementById('statusText');
    const transcriptionResults = document.getElementById('transcriptionResults');

    statusDisplay.style.display = 'block';

    const poll = async () => {
        try {
            const status = await checkTranscriptionStatus(jobName);

            // Esto es sólo para ver qué llegó realmente
            console.log("Status payload:", status);

            if (!status || typeof status !== 'object' || typeof status.status !== 'string') {
                statusText.textContent = 'Esperando estado…';
                setTimeout(poll, 2000);
                return;
            }

            // Mostramos estado de Transcribe y de los artefactos en S3:
            statusText.textContent =
                'Transcripción: ' + status.status +
                'Formateo: ' + (status.formattedReady ? 'listo' : 'procesando') +
                'Resumen: ' + (status.summaryReady ? 'listo' : 'procesando');

            if (status.status === 'FAILED') {
                statusText.textContent = 'Error en la transcripción';
                statusDisplay.className = 'alert alert-danger';
                return; // Stop polling
            }

            if (status.status === 'COMPLETED' && status.formattedReady && status.summaryReady) {
                // Cuando todo está listo, pedimos resultados y pintamos
                const results = await getTranscriptionResults(nombreDelBucket, jobName);
                displayResults(results);
                statusDisplay.style.display = 'none';
                return; // Stop polling

                // Continue polling if still in progress
                setTimeout(poll, 2000); // Poll every 2 seconds

            }
        }
        catch (error) {
            console.error('Error checking status:', error);
            statusText.textContent = 'Error al verificar el estado';
            statusDisplay.className = 'alert alert-danger';
        }
    };

    poll();
}

function displayResults(results) {
    const transcriptionResults = document.getElementById('transcriptionResults');
    const transcriptionText = document.getElementById('transcriptionText');
    const summaryText = document.getElementById('summaryText');

    // Display transcription
    if (results.transcription) {
        transcriptionText.innerHTML = formatTranscriptionText(results.transcription);
    }

    // Display summary
    if (results.summary) {
        summaryText.innerHTML = formatSummaryText(results.summary);
    }

    transcriptionResults.style.display = 'block';
}

function formatTranscriptionText(transcription) {
    // Format transcription with speakers if available
    if (typeof transcription === 'object' && transcription.speakers) {
        return transcription.speakers.map(speaker =>
            `<strong>Hablante ${speaker.speaker}:</strong> ${speaker.text}<br>`
        ).join('');
    }
    return `<pre>${transcription}</pre>`;
}

function formatSummaryText(summary) {
    if (typeof summary === 'object') {
        return `<pre>${JSON.stringify(summary, null, 2)}</pre>`;
    }
    return `<pre>${summary}</pre>`;
}


// ****** Sección para el submit del archivo de audio ****** 

$formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('audioFile');
    const idiomaInput = document.getElementById('idioma');
    const speakersInput = document.getElementById('speakers');

    if (!fileInput.files.length) {
        alert("Por favor seleccioná un archivo");
        return;
    }

    if (!idiomaInput.value.trim()) {
        alert("Por favor ingresá un idioma válido (por ejemplo, es-ES para español o en-US para inglés).");
        return;
    }

    const file = fileInput.files[0];
    const key = `audios/${file.name}`;
    const idioma = idiomaInput.value;
    const speakers = parseInt(speakersInput.value);

    try {
        await uploadFileToS3(file, key);
        console.log("Archivo subido correctamente");

        const jobName = await iniciarTranscripcion(nombreDelBucket, key, idioma, speakers);
        console.log("Transcripción iniciada:", jobName);

        // Start polling for status
        pollTranscriptionStatus(jobName.job_name || jobName);

    } catch (error) {
        console.error("Error:", error);
    }
});

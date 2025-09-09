import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { uploadFileToS3 } from './s3Upload.js';
import { iniciarTranscripcion } from './transcribe.js';
import { checkTranscriptionStatus, getTranscriptionResults } from './statusChecker.js';

const $formulario = document.getElementById('uploadForm');
const nombreDelBucket = "transcripcion-con-resumen-backend-376129873205-us-east-1";

// ********* Inicializar el resto de los procesos de la app *********

// Variable para evitar múltiples procesos simultáneos
let processingInProgress = false;

// Crear barra de estado y contenedor de resultados
function initializeUI() {
    createFileUploadHandlers();
}

function createFileUploadHandlers() {
    const fileInput = document.getElementById('audioFile');
    const wrapper = document.querySelector('.file-input-wrapper');

    if (!wrapper || !fileInput) return; // Guard clause

    // Drag and drop handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        wrapper.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        wrapper.addEventListener(eventName, () => wrapper.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        wrapper.addEventListener(eventName, () => wrapper.classList.remove('dragover'), false);
    });

    wrapper.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            updateFileLabel(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            updateFileLabel(e.target.files[0]);
        }
    });
}

function updateFileLabel(file) {
    const overlay = document.querySelector('.file-input-overlay');
    if (overlay) {
        overlay.innerHTML = `
            <i class="fas fa-file-audio"></i>
            <span><strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
        `;
    }
}

function createResultsContainer() {
    let resultsContainer = document.getElementById('resultsContainer');

    // Si ya existe, sólo reseteamos textos/estados y salimos
    if (resultsContainer) {
        const transcriptionText = resultsContainer.querySelector('#transcriptionText');
        const summaryText = resultsContainer.querySelector('#summaryText');
        if (transcriptionText) {
            transcriptionText.classList.add('loading-pulse');
            transcriptionText.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando transcripción...';
        }
        if (summaryText) {
            summaryText.classList.add('loading-pulse');
            summaryText.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generando resumen...';
        }
        return resultsContainer;
    }

    // Si no existe, lo creamos una sola vez
    resultsContainer = document.createElement('div');
    resultsContainer.id = 'resultsContainer';
    resultsContainer.className = 'row justify-content-center mt-4';
    resultsContainer.innerHTML = `
        <div class="col-lg-8">
            <div class="results-container">
                <div id="transcriptionSection">
                    <div class="results-header">
                        <i class="fas fa-file-alt"></i>
                        <h4>Transcripción</h4>
                    </div>
                    <div id="transcriptionText" class="results-content loading-pulse">
                        <i class="fas fa-spinner fa-spin me-2"></i>Procesando transcripción...
                    </div>
                </div>

                <div id="summarySection" class="mt-4">
                    <div class="results-header">
                        <i class="fas fa-compress-alt"></i>
                        <h4>Resumen</h4>
                    </div>
                    <div id="summaryText" class="results-content loading-pulse">
                        <i class="fas fa-spinner fa-spin me-2"></i>Generando resumen...
                    </div>
                </div>
            </div>
        </div>
    `;

    const container = document.querySelector('.container');
    if (container) container.appendChild(resultsContainer);
    return resultsContainer;
}

async function pollTranscriptionStatus(jobName) {
    createResultsContainer();

    let pollAttempts = 0;
    const maxPollAttempts = 150; // ~5 min (150 * 2s)

    const poll = async () => {
        try {
            pollAttempts++;
            console.log(`Poll attempt ${pollAttempts} for job: ${jobName}`);

            if (pollAttempts > maxPollAttempts) {
                const tNode = document.getElementById('transcriptionText');
                const sNode = document.getElementById('summaryText');
                if (tNode) tNode.innerHTML = '<p class="text-danger">Tiempo de espera agotado.</p>';
                if (sNode) sNode.innerHTML = '<p class="text-muted">No se generó resumen.</p>';
                processingInProgress = false;
                return;
            }

            const status = await checkTranscriptionStatus(jobName);
            console.log("Status payload:", status);

            if (!status || typeof status !== 'object') {
                // Esperar un poco y reintentar
                setTimeout(poll, 2000);
                return;
            }

            const transcriptionStatus = status.status || status.TranscriptionJobStatus;
            const formattedReady = !!status.formattedReady;
            const summaryReady = !!status.summaryReady;

            const tNode = document.getElementById('transcriptionText');
            const sNode = document.getElementById('summaryText');

            // Feedback suave mientras procesa
            if (tNode && transcriptionStatus !== 'COMPLETED') {
                tNode.classList.add('loading-pulse');
                tNode.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando transcripción...';
            }
            if (sNode && !summaryReady) {
                sNode.classList.add('loading-pulse');
                sNode.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generando resumen...';
            }

            if (transcriptionStatus === 'FAILED') {
                if (tNode) {
                    tNode.classList.remove('loading-pulse');
                    tNode.innerHTML = '<p class="text-danger">La transcripción falló.</p>';
                }
                processingInProgress = false;
                return;
            }

            // Cuando todo está completo, obtenemos resultados
            if (transcriptionStatus === 'COMPLETED' && formattedReady && summaryReady) {
                try {
                    const results = await getTranscriptionResults(nombreDelBucket, jobName);
                    console.log("Results received:", results);

                    if (results && (results.transcription || results.summary)) {
                        displayResults(results);
                        const rc = document.getElementById('resultsContainer');
                        if (rc) rc.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        processingInProgress = false;
                        return;
                    } else {
                        setTimeout(poll, 2000);
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching results:', error);
                    if (tNode) tNode.innerHTML = '<p class="text-danger">Error obteniendo resultados, reintentando...</p>';
                    setTimeout(poll, 3000);
                    return;
                }
            }

            // Continuar polling
            setTimeout(poll, 2000);
        } catch (error) {
            console.error('Error checking status:', error);
            const tNode = document.getElementById('transcriptionText');
            if (tNode) tNode.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
            // Backoff
            const retryDelay = Math.min(5000, 1000 * Math.pow(1.5, pollAttempts - 1));
            setTimeout(poll, retryDelay);
        }
    };

    poll();
}

function displayResults(results) {
    console.log("Displaying results:", results);

    const transcriptionText = document.getElementById('transcriptionText');
    const summaryText = document.getElementById('summaryText');

    if (!transcriptionText || !summaryText) {
        console.error("Results containers not found");
        return;
    }

    transcriptionText.classList.remove('loading-pulse');
    summaryText.classList.remove('loading-pulse');

    if (results.transcription) {
        transcriptionText.innerHTML = formatTranscriptionText(results.transcription);
    } else {
        transcriptionText.innerHTML = '<p class="text-muted">No se encontró transcripción</p>';
    }

    if (results.summary) {
        summaryText.innerHTML = formatSummaryText(results.summary);
    } else {
        summaryText.innerHTML = '<p class="text-muted">No se encontró resumen</p>';
    }

    processingInProgress = false;
}

function formatTranscriptionText(transcription) {
    if (typeof transcription === 'object' && transcription.speakers) {
        return transcription.speakers.map(speaker => `
            <div class="speaker-text">
                <div class="speaker-label">Hablante ${speaker.speaker}:</div>
                <div>${speaker.text}</div>
            </div>
        `).join('');
    }
    return `<pre>${transcription}</pre>`;
}

function formatSummaryText(summary) {
    if (typeof summary === 'object') {
        return `<pre>${JSON.stringify(summary, null, 2)}</pre>`;
    }
    return `<pre>${summary}</pre>`;
}

// Form submission
$formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (processingInProgress) return;

    const fileInput = document.getElementById('audioFile');
    const idiomaInput = document.getElementById('idioma');
    const speakersInput = document.getElementById('speakers');

    if (!fileInput.files.length) {
        alert("Por favor selecciona un archivo");
        return;
    }

    const file = fileInput.files[0];
    const key = `audios/${file.name}`;
    const idioma = idiomaInput.value;
    const speakers = parseInt(speakersInput.value);

    processingInProgress = true;

    try {
        // Mostrar contenedor y estados iniciales
        const rc = createResultsContainer();
        const tNode = document.getElementById('transcriptionText');
        const sNode = document.getElementById('summaryText');
        if (tNode) {
            tNode.classList.add('loading-pulse');
            tNode.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Subiendo archivo...';
        }
        if (sNode) {
            sNode.classList.add('loading-pulse');
            sNode.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Esperando transcripción...';
        }

        await uploadFileToS3(file, key);
        if (tNode) tNode.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Iniciando transcripción...';

        const jobName = await iniciarTranscripcion(nombreDelBucket, key, idioma, speakers);
        const actualJobName = jobName.job_name || jobName.JobName || jobName;
        console.log("Using job name:", actualJobName);

        pollTranscriptionStatus(actualJobName);
    } catch (error) {
        console.error("Error:", error);
        const tNode = document.getElementById('transcriptionText');
        if (tNode) tNode.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
        processingInProgress = false;
    }
});

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);
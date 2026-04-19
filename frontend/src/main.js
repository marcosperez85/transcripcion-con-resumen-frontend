import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { getAudioDuration } from "./audioUtils.js";
import { uploadFileToS3 } from './s3Upload.js';
import { iniciarTranscripcion } from './transcribe.js';
import { checkTranscriptionStatus, getTranscriptionResults, checkUserUsage } from './statusChecker.js';
import { CONFIG } from "./config.js";

const $formulario = document.getElementById('uploadForm');
const nombreDelBucket = CONFIG.BUCKET_NAME;

// Constantes para límites de uso
const MAX_MINUTES_FREE = 10;
const MAX_DURATION_SECONDS = MAX_MINUTES_FREE * 60;

// ********* Inicializar el resto de los procesos de la app *********

// Variable para evitar múltiples procesos simultáneos
let processingInProgress = false;

// Datos de uso del usuario
let userUsage = {
    used: 0,
    limit: MAX_DURATION_SECONDS,
    remaining: MAX_DURATION_SECONDS
};

// Crear barra de estado y contenedor de resultados
function initializeUI() {
    createFileUploadHandlers();
    createUsageIndicator();
    fetchUserUsage();
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
        <div class="col-lg-9">
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

    let summaryReady = false

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
            const jobStatus = status.jobStatus;

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

            if (jobStatus === 'PROCESSING') {
                if (tNode) {
                    tNode.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Transcribiendo audio...';
                }
            }

            if (jobStatus === 'FORMATTED') {
                if (tNode) {
                    tNode.innerHTML = '<i class="fas fa-check me-2 text-success"></i>Transcripción lista';
                    tNode.classList.remove('loading-pulse');
                }
                if (sNode) {
                    sNode.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generando resumen...';
                }
            }

            if (jobStatus === 'DONE') {
                summaryReady = true;
            }

            // Cuando todo está completo, obtenemos resultados
            if (transcriptionStatus === 'COMPLETED' && jobStatus === 'DONE') {
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

    // Actualizar la barra de uso después de completar una transcripción
    fetchUserUsage();

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
    const idioma = idiomaInput.value;
    const speakers = parseInt(speakersInput.value);

    processingInProgress = true;

    try {

        const duration = await getAudioDuration(file);

        // Asegurarse de usar la constante definida
        if (duration > MAX_DURATION_SECONDS) {
            alert(`La versión gratis permite procesar hasta ${MAX_MINUTES_FREE} minutos.`);
            processingInProgress = false;
            return;
        }

        console.log("Duración audio:", duration);
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

        const { Bucket, Key } = await uploadFileToS3(file, file.name);

        if (tNode) tNode.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Iniciando transcripción...';

        // Preparar parámetros para la transcripción
        const transcriptionRequest = {
            Bucket: Bucket,
            Key: Key,
            idioma: idioma,
            speakers: speakers
        };

        // const jobName = await iniciarTranscripcion(nombreDelBucket, key, idioma, speakers);
        const response = await iniciarTranscripcion(transcriptionRequest);

        // Actualizar datos de uso si la respuesta los incluye
        if (response && typeof response === 'object') {
            const jobName = response.jobName || response.JobName || response;

            // Si la respuesta incluye datos de uso o estimatedDuration, actualizar UI
            if (response.usedSeconds !== undefined || response.estimatedDuration !== undefined) {
                // Si tenemos usedSeconds, usar eso directamente
                if (response.usedSeconds !== undefined) {
                    updateUsageData({
                        used: response.usedSeconds,
                        limit: response.limitSeconds || MAX_DURATION_SECONDS
                    });
                }
                // Si no tenemos usedSeconds pero tenemos estimatedDuration, actualizar con fetchUserUsage
                else if (response.estimatedDuration !== undefined) {
                    fetchUserUsage(); // Actualizar los datos de uso desde el servidor
                }
            }

            console.log("Using job name:", jobName);
            pollTranscriptionStatus(jobName);
        } else {
            const actualJobName = response;
            console.log("Using job name:", actualJobName);
            pollTranscriptionStatus(actualJobName);

            // Intentar actualizar los datos de uso desde el servidor
            fetchUserUsage();
        }
    } catch (error) {
        console.error("Error:", error);
        const tNode = document.getElementById('transcriptionText');

        // Manejar error de límite excedido
        if (error.message && error.message.includes("Usage limit reached")) {
            if (tNode) tNode.innerHTML = `<p class="text-danger">Has alcanzado el límite de ${MAX_MINUTES_FREE} minutos de transcripción.</p>`;

            // Actualizar el indicador de uso
            try {
                const data = JSON.parse(error.message.replace("Error 403: ", ""));
                if (data.usedSeconds && data.limitSeconds) {
                    updateUsageData({
                        used: data.usedSeconds,
                        limit: data.limitSeconds
                    });
                }
            } catch (parseError) {
                console.error("Error parsing usage data", parseError);
            }
        } else {
            if (tNode) tNode.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
        }

        processingInProgress = false;
    }
});

function showError(msg) {
    const errorElement = document.getElementById("uploadError");
    if (errorElement) {
        errorElement.textContent = msg;
    }
}

// Crear indicador de uso
function createUsageIndicator() {
    // Verificar si ya existe
    if (document.getElementById('usageIndicator')) return;

    const formDiv = document.querySelector('.upload-card');
    if (!formDiv) return;

    const usageIndicator = document.createElement('div');
    usageIndicator.id = 'usageIndicator';
    usageIndicator.className = 'usage-indicator mt-4';
    usageIndicator.innerHTML = `
        <div class="usage-header">
            <i class="fas fa-chart-pie me-2"></i>
            <span>Uso de minutos gratuitos</span>
        </div>
        <div class="usage-bar-container">
            <div id="usageBar" class="usage-bar" style="width: 0%;"></div>
        </div>
        <div class="usage-details">
            <span id="usageText">Cargando datos de uso...</span>
            <span id="usageLimit"></span>
        </div>
    `;

    // Insertar al final del formulario
    formDiv.appendChild(usageIndicator);
}

// Actualizar datos de uso en UI
function updateUsageData(data) {
    if (!data) return;

    userUsage.used = data.used || 0;
    userUsage.limit = data.limit || MAX_DURATION_SECONDS;
    userUsage.remaining = Math.max(0, userUsage.limit - userUsage.used);

    // Actualizar indicador visual
    const usageBar = document.getElementById('usageBar');
    const usageText = document.getElementById('usageText');
    const usageLimit = document.getElementById('usageLimit');

    if (!usageBar || !usageText || !usageLimit) return;

    // Calcular porcentaje y actualizar barra
    const usedPercent = Math.min(100, (userUsage.used / userUsage.limit) * 100);
    usageBar.style.width = `${usedPercent}%`;

    // Cambiar color según uso
    if (usedPercent > 90) {
        usageBar.classList.add('usage-critical');
    } else if (usedPercent > 70) {
        usageBar.classList.add('usage-warning');
    }

    // Actualizar texto
    const usedMinutes = Math.floor(userUsage.used / 60);
    const usedSeconds = userUsage.used % 60;
    const remainingMinutes = Math.floor(userUsage.remaining / 60);
    const remainingSeconds = userUsage.remaining % 60;

    usageText.innerHTML = `<strong>Usado:</strong> ${usedMinutes}m ${usedSeconds}s`;
    usageLimit.innerHTML = `<strong>Restante:</strong> ${remainingMinutes}m ${remainingSeconds}s`;
}

// Obtener datos de uso del usuario actual
async function fetchUserUsage() {
    try {
        // Intentar obtener datos de uso del servidor
        const usageData = await checkUserUsage();

        // Si tenemos datos, actualizar UI
        if (usageData) {
            updateUsageData(usageData);
            return usageData;
        } else {
            // Fallback a valores por defecto
            const defaultData = {
                used: 0,
                limit: MAX_DURATION_SECONDS,
                remaining: MAX_DURATION_SECONDS
            };
            updateUsageData(defaultData);
            return defaultData;
        }

    } catch (error) {
        console.error('Error al obtener datos de uso:', error);
        // Fallback a valores por defecto
        const defaultData = {
            used: 0,
            limit: MAX_DURATION_SECONDS,
            remaining: MAX_DURATION_SECONDS
        };
        updateUsageData(defaultData);
        return defaultData;
    }
}

// showError(`Tenés ${MAX_MINUTES_FREE} minutos gratis para probar la app.`);

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);
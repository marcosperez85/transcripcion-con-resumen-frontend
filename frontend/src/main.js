import { uploadFileToS3 } from './s3Upload.js';
import { iniciarTranscripcion } from './transcribe.js';
import { checkTranscriptionStatus, getTranscriptionResults } from './statusChecker.js';

// Importaciones de Bootstrap (mantén estas)
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const $formulario = document.getElementById('uploadForm');
const nombreDelBucket = "transcripcion-con-resumen-backend";

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

function showStatusBar(message) {
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    
    if (statusText) statusText.textContent = message;
    if (statusBar) {
        statusBar.classList.add('show');
        statusBar.style.display = 'block';
        // Reset background color
        statusBar.style.background = '';
    }
}

function hideStatusBar() {
    const statusBar = document.getElementById('statusBar');
    if (statusBar) {
        statusBar.classList.remove('show');
        setTimeout(() => {
            statusBar.style.display = 'none';
        }, 300);
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
        resultsContainer.style.display = 'block';
        return resultsContainer;
    }

    // Si no existe, lo creamos una sola vez
    resultsContainer = document.createElement('div');
    resultsContainer.id = 'resultsContainer';
    resultsContainer.className = 'row justify-content-center';
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
    showStatusBar('Iniciando transcripción...');
    createResultsContainer();

    let pollAttempts = 0;
    const maxPollAttempts = 150; // 5 minutos máximo (150 * 2 segundos)

    const poll = async () => {
        try {
            pollAttempts++;
            console.log(`Poll attempt ${pollAttempts} for job: ${jobName}`);
            
            if (pollAttempts > maxPollAttempts) {
                showStatusBar('Tiempo de espera agotado');
                document.getElementById('statusBar').style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
                processingInProgress = false;
                return;
            }

            const status = await checkTranscriptionStatus(jobName);
            console.log("Status payload:", status);

            if (!status) {
                console.log("No status received, retrying...");
                showStatusBar('Esperando respuesta del servidor...');
                setTimeout(poll, 3000); // Wait a bit longer if no response
                return;
            }

            // Verificar si status tiene la estructura esperada
            if (typeof status !== 'object') {
                console.log("Invalid status format:", status);
                showStatusBar('Esperando estado válido...');
                setTimeout(poll, 2000);
                return;
            }

            // El status puede venir directamente o dentro de una propiedad
            const transcriptionStatus = status.status || status.TranscriptionJobStatus;
            const formattedReady = status.formattedReady || false;
            const summaryReady = status.summaryReady || false;

            console.log("Parsed status:", { transcriptionStatus, formattedReady, summaryReady });

            // Actualizar barra de estado
            const statusMessage = `Transcripción: ${transcriptionStatus || 'iniciando'} | Formateo: ${formattedReady ? 'listo' : 'procesando'} | Resumen: ${summaryReady ? 'listo' : 'procesando'}`;
            showStatusBar(statusMessage);

            if (transcriptionStatus === 'FAILED') {
                showStatusBar('Error en la transcripción');
                document.getElementById('statusBar').style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
                processingInProgress = false;
                return;
            }

            // Verificar si todo está completo
            if (transcriptionStatus === 'COMPLETED' && formattedReady && summaryReady) {
                console.log("All processes completed, fetching results...");
                showStatusBar('Obteniendo resultados...');
                
                try {
                    const results = await getTranscriptionResults(nombreDelBucket, jobName);
                    console.log("Results received:", results);
                    
                    if (results && (results.transcription || results.summary)) {
                        hideStatusBar();
                        displayResults(results);
                        processingInProgress = false;
                        return;
                    } else {
                        console.log("No results in response, retrying...");
                        setTimeout(poll, 2000);
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching results:', error);
                    showStatusBar('Error obteniendo resultados, reintentando...');
                    setTimeout(poll, 3000);
                    return;
                }
            }

            // Continue polling if still in progress
            setTimeout(poll, 2000);
        }
        catch (error) {
            console.error('Error checking status:', error);
            showStatusBar(`Error: ${error.message}`);
            document.getElementById('statusBar').style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
            
            // Retry on error, but with exponential backoff
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

    // Remover clases de loading
    transcriptionText.classList.remove('loading-pulse');
    summaryText.classList.remove('loading-pulse');

    // Display transcription
    if (results.transcription) {
        transcriptionText.innerHTML = formatTranscriptionText(results.transcription);
    } else {
        transcriptionText.innerHTML = '<p class="text-muted">No se encontró transcripción</p>';
    }

    // Display summary  
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

    // Prevenir múltiples submissions
    if (processingInProgress) {
        console.log("Processing already in progress, ignoring submit");
        return;
    }

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
        showStatusBar('Subiendo archivo...');
        await uploadFileToS3(file, key);
        console.log("Archivo subido correctamente");

        showStatusBar('Iniciando transcripción...');
        const jobName = await iniciarTranscripcion(nombreDelBucket, key, idioma, speakers);
        console.log("Transcripción iniciada:", jobName);

        // Extraer el job name correcto
        const actualJobName = jobName.job_name || jobName.JobName || jobName;
        console.log("Using job name:", actualJobName);

        pollTranscriptionStatus(actualJobName);

    } catch (error) {
        console.error("Error:", error);
        showStatusBar(`Error: ${error.message}`);
        document.getElementById('statusBar').style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
        processingInProgress = false;
    }
});

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);
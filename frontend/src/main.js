import { uploadFileToS3 } from './s3Upload.js';
import { iniciarTranscripcion } from './transcribe.js';
import { checkTranscriptionStatus, getTranscriptionResults } from './statusChecker.js';

// Importaciones de Bootstrap (mantén estas)
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const $formulario = document.getElementById('uploadForm');
const nombreDelBucket = "transcripcion-con-resumen-backend";

// Crear barra de estado y contenedor de resultados
function initializeUI() {
    createFileUploadHandlers();
}

function createFileUploadHandlers() {
    const fileInput = document.getElementById('audioFile');
    const wrapper = document.querySelector('.file-input-wrapper');
    
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
    overlay.innerHTML = `
        <i class="fas fa-file-audio"></i>
        <span><strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
    `;
}

function showStatusBar(message) {
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    
    statusText.textContent = message;
    statusBar.classList.add('show');
    statusBar.style.display = 'block';
}

function hideStatusBar() {
    const statusBar = document.getElementById('statusBar');
    statusBar.classList.remove('show');
    setTimeout(() => {
        statusBar.style.display = 'none';
    }, 300);
}

function createResultsContainer() {
    const existingContainer = document.getElementById('resultsContainer');
    if (existingContainer) {
        existingContainer.remove();
    }

    const resultsContainer = document.createElement('div');
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
    container.appendChild(resultsContainer);
}

async function pollTranscriptionStatus(jobName) {
    showStatusBar('Iniciando transcripción...');
    createResultsContainer();

    const poll = async () => {
        try {
            const status = await checkTranscriptionStatus(jobName);
            console.log("Status payload:", status);

            if (!status || typeof status !== 'object' || typeof status.status !== 'string') {
                showStatusBar('Esperando estado...');
                setTimeout(poll, 2000);
                return;
            }

            // Actualizar barra de estado
            const statusMessage = `Transcripción: ${status.status} | Formateo: ${status.formattedReady ? 'listo' : 'procesando'} | Resumen: ${status.summaryReady ? 'listo' : 'procesando'}`;
            showStatusBar(statusMessage);

            if (status.status === 'FAILED') {
                showStatusBar('Error en la transcripción');
                document.getElementById('statusBar').style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
                return;
            }

            if (status.status === 'COMPLETED' && status.formattedReady && status.summaryReady) {
                hideStatusBar();
                const results = await getTranscriptionResults(nombreDelBucket, jobName);
                displayResults(results);
                return;
            }

            setTimeout(poll, 2000);
        } catch (error) {
            console.error('Error checking status:', error);
            showStatusBar('Error al verificar el estado');
            document.getElementById('statusBar').style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
        }
    };

    poll();
}

function displayResults(results) {
    const transcriptionText = document.getElementById('transcriptionText');
    const summaryText = document.getElementById('summaryText');

    // Remover clases de loading
    transcriptionText.classList.remove('loading-pulse');
    summaryText.classList.remove('loading-pulse');

    // Display transcription
    if (results.transcription) {
        transcriptionText.innerHTML = formatTranscriptionText(results.transcription);
    }

    // Display summary
    if (results.summary) {
        summaryText.innerHTML = formatSummaryText(results.summary);
    }
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

    try {
        showStatusBar('Subiendo archivo...');
        await uploadFileToS3(file, key);
        console.log("Archivo subido correctamente");

        showStatusBar('Iniciando transcripción...');
        const jobName = await iniciarTranscripcion(nombreDelBucket, key, idioma, speakers);
        console.log("Transcripción iniciada:", jobName);

        pollTranscriptionStatus(jobName.job_name || jobName);

    } catch (error) {
        console.error("Error:", error);
        showStatusBar('Error durante el proceso');
        document.getElementById('statusBar').style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
    }
});

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);
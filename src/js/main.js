import { CONFIG } from './config.js';
import { uploadFileToS3 } from './s3Upload.js';
import WebSocketManager from './websocket.js';

// Variables globales
let wsManager;
let currentFile = null;

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Inicializar WebSocket Manager
        wsManager = new WebSocketManager();
        
        // Conectar WebSocket
        await connectWebSocket();
        
        // Configurar event listeners de la UI
        setupUIEventListeners();
        
        console.log('Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('Error inicializando aplicación:', error);
        showError('Error inicializando la aplicación');
    }
}

async function connectWebSocket() {
    try {
        showStatus('Conectando al servidor...', 'info');
        await wsManager.connect();
        showStatus('Conectado al servidor correctamente', 'success');
        
        // Configurar handlers personalizados
        setupWebSocketHandlers();
        
    } catch (error) {
        console.error('Error conectando WebSocket:', error);
        showError('Error conectando al servidor. Algunas funciones pueden no estar disponibles.');
    }
}

// Configurar handlers personalizados para WebSocket
function setupWebSocketHandlers() {
    // Handler para cuando se sube el archivo
    wsManager.addMessageHandler('file_uploaded', (data) => {
        console.log('Archivo subido:', data);
        wsManager.updateProgress(15, 'Archivo subido correctamente');
    });
    
    // Handler para cuando inicia la transcripción
    wsManager.addMessageHandler('transcription_started', (data) => {
        console.log('Transcripción iniciada:', data);
        wsManager.updateProgress(25, `Transcripción iniciada: ${data.jobName}`);
        wsManager.showJobInfo(data.jobName, 'transcription');
    });
    
    // Handler para progreso de transcripción
    wsManager.addMessageHandler('transcription_progress', (data) => {
        const progress = Math.min(80, 25 + (data.progress || 0) * 0.55); // 25% a 80%
        wsManager.updateProgress(progress, `Transcribiendo audio... ${data.progress || 0}%`);
    });
    
    // Handler para cuando completa la transcripción (JSON guardado en S3)
    wsManager.addMessageHandler('transcription_completed', (data) => {
        console.log('Transcripción completada:', data);
        wsManager.updateProgress(85, 'Transcripción completada. Iniciando formateo...');
        // No llamamos formateo manualmente - se dispara automáticamente por evento S3
    });
    
    // Handler para cuando inicia el formateo
    wsManager.addMessageHandler('formatting_started', (data) => {
        console.log('Formateo iniciado:', data);
        wsManager.updateProgress(90, 'Generando resumen y formato final...');
    });
    
    // Handler para cuando completa el formateo
    wsManager.addMessageHandler('formatting_completed', (data) => {
        console.log('Formateo completado:', data);
        wsManager.updateProgress(95, 'Formateo completado');
    });
    
    // Handler para proceso completamente terminado
    wsManager.addMessageHandler('process_completed', (data) => {
        console.log('Proceso completado:', data);
        wsManager.updateProgress(100, 'Proceso completado');
        wsManager.displayResults(data.results);
    });
    
    // Handler para errores
    wsManager.addMessageHandler('error', (data) => {
        console.error('Error recibido:', data);
        wsManager.displayError(data.message, data.details);
    });
}

function setupUIEventListeners() {
    // Formulario principal - ¡Este es el evento más importante!
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // ¡Prevenir recarga de página!
            await handleFormSubmit();
        });
    }
    
    // Selector de archivo (ID correcto)
    const fileInput = document.getElementById('audioFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    // Botones adicionales
    const clearButton = document.getElementById('clearButton');
    if (clearButton) {
        clearButton.addEventListener('click', handleClear);
    }
    
    const reconnectButton = document.getElementById('reconnectButton');
    if (reconnectButton) {
        reconnectButton.addEventListener('click', connectWebSocket);
    }
    
    // Drag & Drop
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('drop', handleFileDrop);
        dropZone.addEventListener('dragleave', handleDragLeave);
    }
}

// Nueva función para manejar el submit del formulario
async function handleFormSubmit() {
    try {
        // Obtener valores del formulario
        const fileInput = document.getElementById('audioFile');
        const languageInput = document.getElementById('idioma');
        const speakersInput = document.getElementById('speakers');
        
        const file = fileInput.files[0];
        const languageCode = languageInput.value || 'es-ES';
        const maxSpeakers = parseInt(speakersInput.value) || 2;
        
        if (!file) {
            showError('Por favor selecciona un archivo de audio');
            return;
        }
        
        // Validar archivo
        validateAndSetFile(file);
        
        // Deshabilitar botón durante el procesamiento
        const submitButton = document.getElementById('submitButton');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Procesando...';
        }
        
        // Procesar archivo
        await procesarArchivo(file, languageCode, maxSpeakers);
        
    } catch (error) {
        console.error('Error en submit:', error);
        showError('Error procesando el archivo: ' + error.message);
        
        // Re-habilitar botón
        const submitButton = document.getElementById('submitButton');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="bi bi-upload"></i> Procesar Audio';
        }
    }
}

// Función para limpiar el formulario
function handleClear() {
    const form = document.getElementById('uploadForm');
    if (form) {
        form.reset();
    }
    
    currentFile = null;
    
    // Limpiar info del archivo
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
        fileInfo.style.display = 'none';
    }
    
    // Ocultar resultados y progreso
    const results = document.getElementById('results');
    const progress = document.getElementById('progressContainer');
    const jobInfo = document.getElementById('jobInfo');
    const error = document.getElementById('error');
    
    if (results) results.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (jobInfo) jobInfo.style.display = 'none';
    if (error) error.style.display = 'none';
    
    // Re-habilitar botón
    enableProcessButton();
}

function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

function handleFileDrop(event) {
    event.preventDefault();
    const dropZone = event.target;
    dropZone.classList.remove('drag-over');
    
    const file = event.dataTransfer.files[0];
    if (file) {
        // También actualizar el input
        const fileInput = document.getElementById('audioFile');
        if (fileInput) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;
        }
        validateAndSetFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.target.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.target.classList.remove('drag-over');
}

function validateAndSetFile(file) {
    try {
        // Validar tipo de archivo
        if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            if (!CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
                throw new Error('Tipo de archivo no soportado');
            }
        }
        
        // Validar tamaño
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            throw new Error(`El archivo es demasiado grande. Máximo ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
        }
        
        currentFile = file;
        updateFileInfo(file);
        enableProcessButton();
        
    } catch (error) {
        showError(error.message);
        currentFile = null;
        disableProcessButton();
    }
}

// Función principal para procesar el archivo
async function procesarArchivo(file, languageCode, maxSpeakers) {
    try {
        const sessionId = wsManager.getSessionId();
        const key = `audios/${sessionId}/${file.name}`;
        
        // Mostrar progreso inicial
        wsManager.updateProgress(5, 'Preparando archivo...');
        
        // 1. Solo subir a S3 - el evento S3 iniciará automáticamente Transcribe
        await uploadFileToS3(file, key, sessionId, languageCode, maxSpeakers);
        
        // 2. Notificar por WebSocket que el archivo fue subido
        wsManager.sendMessage({
            type: 'file_uploaded',
            sessionId: sessionId,
            fileName: file.name,
            key: key,
            status: 'uploaded',
            languageCode: languageCode,
            maxSpeakers: maxSpeakers
        });
        
        // 3. Actualizar UI para mostrar que el proceso ha comenzado
        wsManager.updateUI('Archivo subido correctamente. Iniciando transcripción...', 'success');
        wsManager.updateProgress(15, 'Archivo subido. Esperando inicio de transcripción...');
        
    } catch (error) {
        console.error('Error procesando archivo:', error);
        wsManager.displayError('Error subiendo archivo', error.message);
        enableProcessButton();
        throw error;
    }
}

// Funciones de utilidad para la UI
function updateFileInfo(file) {
    const fileInfoElement = document.getElementById('fileInfo');
    if (fileInfoElement) {
        fileInfoElement.style.display = 'block';
        fileInfoElement.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-file-music"></i>
                <strong>Archivo seleccionado:</strong> ${file.name}<br>
                <strong>Tamaño:</strong> ${(file.size / (1024 * 1024)).toFixed(2)} MB<br>
                <strong>Tipo:</strong> ${file.type}
            </div>
        `;
    }
}

function enableProcessButton() {
    const button = document.getElementById('submitButton');
    if (button) {
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-upload"></i> Procesar Audio';
    }
}

function disableProcessButton() {
    const button = document.getElementById('submitButton');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="bi bi-hourglass-split"></i> Procesando...';
    }
}

function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('sessionInfo');
    if (statusElement) {
        statusElement.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function showError(message) {
    const errorElement = document.getElementById('error');
    if (errorElement) {
        errorElement.style.display = 'block';
        errorElement.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-triangle"></i>
                <strong>Error:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    }
    console.error(`[ERROR] ${message}`);
}

// Exportar funciones si es necesario
window.procesarArchivo = procesarArchivo;
window.connectWebSocket = connectWebSocket;
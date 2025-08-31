import { uploadFileToS3 } from './s3Upload.js';
import { iniciarTranscripcion } from './transcribe.js';
// import { formatearTranscripcion } from './formatear.js';
import WebSocketManager from './websocket.js';

// Inicializar WebSocket Manager
const wsManager = new WebSocketManager();

// Variables globales
const nombreDelBucket = "transcripcion-con-resumen";
let currentJobName = null;
let isProcessing = false;

// Elementos del DOM
const $formulario = document.getElementById('uploadForm');
const $fileInput = document.getElementById('audioFile');
const $idiomaInput = document.getElementById('idioma');
const $speakersInput = document.getElementById('speakers');
const $submitButton = document.getElementById('submitButton');

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM cargado, inicializando aplicación...');
    
    try {
        // Conectar WebSocket
        await connectWebSocket();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Configurar validaciones del formulario
        setupFormValidation();
        
        // Inicializar UI
        initializeUI();
        
        console.log('Aplicación inicializada correctamente');
        
    } catch (error) {
        console.error('Error inicializando aplicación:', error);
        showError('Error inicializando la aplicación. Por favor, recarga la página.');
    }
});

async function connectWebSocket() {
    try {
        showStatus('Conectando al servidor...', 'info');
        await wsManager.connect();
        showStatus('Conectado al servidor correctamente', 'success');
        
        // Configurar handlers personalizados si es necesario
        setupWebSocketHandlers();
        
    } catch (error) {
        console.error('Error conectando WebSocket:', error);
        showError('Error conectando al servidor. Algunas funciones pueden no estar disponibles.');
    }
}

function setupWebSocketHandlers() {
    // Handler personalizado para cuando el proceso se completa
    wsManager.addMessageHandler('PROCESS_COMPLETED', (data) => {
        console.log('Proceso completado recibido:', data);
        isProcessing = false;
        currentJobName = null;
        enableForm();
        
        // Mostrar notificación de éxito
        showNotification('¡Transcripción y resumen completados exitosamente!', 'success');
    });
    
    // Handler para errores
    wsManager.addMessageHandler('ERROR', (data) => {
        console.error('Error recibido del servidor:', data);
        isProcessing = false;
        currentJobName = null;
        enableForm();
        
        showError(`Error en el proceso: ${data.message}`);
    });
    
    // Handler para inicio de transcripción
    wsManager.addMessageHandler('TRANSCRIPTION_STARTED', (data) => {
        currentJobName = data.jobName;
        showStatus('Transcripción iniciada correctamente', 'info');
    });
}

function setupEventListeners() {
    // Event listener principal del formulario
    if ($formulario) {
        $formulario.addEventListener('submit', handleFormSubmit);
    }
    
    // Event listeners para validación en tiempo real
    if ($fileInput) {
        $fileInput.addEventListener('change', validateFileInput);
    }
    
    if ($idiomaInput) {
        $idiomaInput.addEventListener('input', validateIdiomaInput);
    }
    
    if ($speakersInput) {
        $speakersInput.addEventListener('input', validateSpeakersInput);
    }
    
    // Event listener para drag & drop
    setupDragAndDrop();
    
    // Event listener para reconexión manual
    const reconnectButton = document.getElementById('reconnectButton');
    if (reconnectButton) {
        reconnectButton.addEventListener('click', handleReconnect);
    }
    
    // Event listener para limpiar resultados
    const clearButton = document.getElementById('clearButton');
    if (clearButton) {
        clearButton.addEventListener('click', handleClearResults);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (isProcessing) {
        showWarning('Ya hay un proceso en curso. Por favor espere...');
        return;
    }
    
    // Validar formulario
    if (!validateForm()) {
        return;
    }
    
    const file = $fileInput.files[0];
    const key = `audios/${file.name}`;
    const idioma = $idiomaInput.value.trim();
    const speakers = parseInt($speakersInput.value) || 2;
    
    try {
        // Marcar como procesando
        isProcessing = true;
        disableForm();
        clearPreviousResults();
        
        showStatus('Subiendo archivo...', 'info');
        updateProgress(5, 'Subiendo archivo a S3...');
        
        // Subir archivo a S3
        await uploadFileToS3(file, key);
        console.log("Archivo subido correctamente");
        
        showStatus('Archivo subido. Iniciando transcripción...', 'info');
        updateProgress(10, 'Iniciando proceso de transcripción...');
        
        // Iniciar transcripción con sessionId
        const response = await iniciarTranscripcion(
            nombreDelBucket,
            key,
            idioma,
            speakers,
            wsManager.getSessionId()
        );
        
        console.log("Transcripción iniciada:", response);
        
        if (response && response.jobName) {
            currentJobName = response.jobName;
            showStatus('Transcripción iniciada correctamente. Procesando...', 'success');
            showJobInfo(response.jobName, 'STARTING');
        }
        
        // El resto del proceso se maneja vía WebSocket
        
    } catch (error) {
        console.error("Error en el proceso:", error);
        showError(`Error: ${error.message}`);
        
        // Resetear estado
        isProcessing = false;
        currentJobName = null;
        enableForm();
        updateProgress(0, 'Error en el proceso');
    }
}

function validateForm() {
    let isValid = true;
    
    // Validar archivo
    if (!$fileInput.files.length) {
        showFieldError('audioFile', 'Por favor selecciona un archivo de audio');
        isValid = false;
    } else {
        clearFieldError('audioFile');
    }
    
    // Validar idioma
    const idioma = $idiomaInput.value.trim();
    if (!idioma) {
        showFieldError('idioma', 'Por favor ingresa un código de idioma válido');
        isValid = false;
    } else if (!isValidLanguageCode(idioma)) {
        showFieldError('idioma', 'Formato de idioma inválido. Usa formato: es-ES, en-US, etc.');
        isValid = false;
    } else {
        clearFieldError('idioma');
    }
    
    // Validar número de speakers
    const speakers = parseInt($speakersInput.value);
    if (!speakers || speakers < 1 || speakers > 10) {
        showFieldError('speakers', 'El número de speakers debe ser entre 1 y 10');
        isValid = false;
    } else {
        clearFieldError('speakers');
    }
    
    return isValid;
}

function validateFileInput() {
    const file = $fileInput.files[0];
    
    if (!file) {
        clearFieldError('audioFile');
        return;
    }
    
    // Validar tipo de archivo
    const allowedTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 
        'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a'
    ];
    
    const allowedExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.webm', '.mp4', '.m4a'];
    
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        showFieldError('audioFile', 'Tipo de archivo no soportado. Usa MP3, WAV, FLAC, OGG, WebM, MP4 o M4A');
        return false;
    }
    
    // Validar tamaño (máximo 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
        showFieldError('audioFile', 'El archivo es demasiado grande. Máximo 100MB');
        return false;
    }
    
    clearFieldError('audioFile');
    
    // Mostrar información del archivo
    showFileInfo(file);
    return true;
}

function validateIdiomaInput() {
    const idioma = $idiomaInput.value.trim();
    
    if (!idioma) {
        clearFieldError('idioma');
        return;
    }
    
    if (isValidLanguageCode(idioma)) {
        clearFieldError('idioma');
        showFieldSuccess('idioma');
    } else {
        showFieldError('idioma', 'Formato inválido. Ejemplo: es-ES, en-US, fr-FR');
    }
}

function validateSpeakersInput() {
    const speakers = parseInt($speakersInput.value);
    
    if (!speakers || speakers < 1 || speakers > 10) {
        showFieldError('speakers', 'Debe ser un número entre 1 y 10');
    } else {
        clearFieldError('speakers');
        showFieldSuccess('speakers');
    }
}

function isValidLanguageCode(code) {
    // Validar formato xx-XX (ejemplo: es-ES, en-US)
    const regex = /^[a-z]{2}-[A-Z]{2}$/;
    return regex.test(code);
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    
    if (!dropZone) return;
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            $fileInput.files = files;
            validateFileInput();
        }
    });
}

function setupFormValidation() {
    // Configurar validación de Bootstrap si está disponible
    const forms = document.querySelectorAll('.needs-validation');
    
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', (event) => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

function initializeUI() {
    // Configurar valores por defecto
    if ($idiomaInput && !$idiomaInput.value) {
        $idiomaInput.value = 'es-ES';
    }
    
    if ($speakersInput && !$speakersInput.value) {
        $speakersInput.value = '2';
    }
    
    // Limpiar resultados anteriores
    clearPreviousResults();
}

function disableForm() {
    const formElements = $formulario.querySelectorAll('input, button, select');
    formElements.forEach(element => {
        element.disabled = true;
    });
    
    if ($submitButton) {
        $submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
    }
}

function enableForm() {
    const formElements = $formulario.querySelectorAll('input, button, select');
    formElements.forEach(element => {
        element.disabled = false;
    });
    
    if ($submitButton) {
        $submitButton.innerHTML = '<i class="bi bi-upload"></i> Procesar Audio';
    }
}

function clearPreviousResults() {
    const elementsToHide = ['results', 'error', 'jobInfo'];
    elementsToHide.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
            element.innerHTML = '';
        }
    });
    
    updateProgress(0, '');
}

function showStatus(message, type = 'info') {
    wsManager.updateUI(message, type);
}

function showError(message) {
    wsManager.updateUI(message, 'error');
}

function showWarning(message) {
    wsManager.updateUI(message, 'warning');
}

function showNotification(message, type = 'info') {
    // Crear notificación toast si Bootstrap está disponible
    if (typeof bootstrap !== 'undefined') {
        const toastHtml = `
            <div class="toast align-items-center text-white bg-${wsManager.getBootstrapClass(type)} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        // Limpiar toast después de que se oculte
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    } else {
        // Fallback si Bootstrap no está disponible
        showStatus(message, type);
    }
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}Error`);
    
    if (field) {
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
    }
    
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showFieldSuccess(fieldId) {
    const field = document.getElementById(fieldId);
    
    if (field) {
        field.classList.add('is-valid');
        field.classList.remove('is-invalid');
    }
    
    clearFieldError(fieldId);
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}Error`);
    
    if (field) {
        field.classList.remove('is-invalid');
    }
    
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

function showFileInfo(file) {
    const fileInfoDiv = document.getElementById('fileInfo');
    if (fileInfoDiv) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        fileInfoDiv.innerHTML = `
            <div class="alert alert-info">
                <strong>Archivo seleccionado:</strong><br>
                <i class="bi bi-file-music"></i> ${file.name}<br>
                <small>Tamaño: ${sizeInMB} MB | Tipo: ${file.type}</small>
            </div>
        `;
        fileInfoDiv.style.display = 'block';
    }
}

function showJobInfo(jobName, stage) {
    wsManager.showJobInfo(jobName, stage);
}

function updateProgress(percentage, text) {
    wsManager.updateProgress(percentage, text);
}

async function handleReconnect() {
    try {
        showStatus('Reconectando...', 'info');
        await wsManager.connect();
        showStatus('Reconectado exitosamente', 'success');
    } catch (error) {
        showError('Error al reconectar. Intenta recargar la página.');
    }
}

function handleClearResults() {
    clearPreviousResults();
    showStatus('Resultados limpiados', 'info');
}

// Exponer wsManager globalmente para uso en funciones de descarga
window.wsManager = wsManager;

// Manejo de errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
    showError('Ha ocurrido un error inesperado');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rechazada:', event.reason);
    showError('Error de conexión o procesamiento');
});

// Limpiar al cerrar la página
window.addEventListener('beforeunload', () => {
    if (wsManager.isConnected()) {
        wsManager.disconnect();
    }
});
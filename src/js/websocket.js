import { CONFIG } from './config.js';

export default class WebSocketManager {
    constructor() {
        this.ws = null;
        this.sessionId = this.generateSessionId();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = null;
        this.pingInterval = null;
        this.messageHandlers = new Map();
        this.connectionState = 'DISCONNECTED';
    }

    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    async connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket ya está conectado');
            return;
        }

        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `${CONFIG.WEBSOCKET_URL}?sessionId=${this.sessionId}`;
                console.log('Conectando WebSocket a:', wsUrl);
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = (event) => {
                    this.handleOpen(event);
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event);
                };
                
                this.ws.onclose = (event) => {
                    this.handleClose(event);
                };
                
                this.ws.onerror = (error) => {
                    this.handleError(error);
                    reject(error);
                };
                
                // Timeout para conexión
                setTimeout(() => {
                    if (this.ws.readyState !== WebSocket.OPEN) {
                        reject(new Error('Timeout conectando WebSocket'));
                    }
                }, 10000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    handleOpen(event) {
        console.log('WebSocket conectado');
        this.connectionState = 'CONNECTED';
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('Conectado');
        this.startPingInterval();
    }

    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('Mensaje WebSocket recibido:', data);
            this.processMessage(data);
        } catch (error) {
            console.error('Error procesando mensaje WebSocket:', error);
        }
    }

    handleClose(event) {
        console.log('WebSocket cerrado:', event.code, event.reason);
        this.connectionState = 'DISCONNECTED';
        this.updateConnectionStatus('Desconectado');
        this.stopPingInterval();
        
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
        }
    }

    handleError(error) {
        console.error('Error WebSocket:', error);
        this.connectionState = 'ERROR';
        this.updateConnectionStatus('Error');
    }

    processMessage(data) {
        const messageType = data.type;
        
        // Manejar tipos de mensaje específicos
        switch (messageType) {
            case 'CONNECTION_ESTABLISHED':
                this.handleConnectionEstablished(data);
                break;
            case 'TRANSCRIPTION_STARTED':
                this.handleTranscriptionStarted(data);
                break;
            case 'TRANSCRIPTION_PROGRESS':
                this.handleTranscriptionProgress(data);
                break;
            case 'TRANSCRIPTION_COMPLETED':
                this.handleTranscriptionCompleted(data);
                break;
            case 'FORMATTING_COMPLETED':
                this.handleFormattingCompleted(data);
                break;
            case 'PROCESS_COMPLETED':
                this.handleProcessCompleted(data);
                break;
            case 'ERROR':
                this.handleErrorMessage(data);
                break;
            case 'PING':
                this.handlePing(data);
                break;
            default:
                console.log('Tipo de mensaje no manejado:', messageType);
        }
        
        // Ejecutar handlers personalizados
        if (this.messageHandlers.has(messageType)) {
            this.messageHandlers.get(messageType)(data);
        }
    }

    handleConnectionEstablished(data) {
        console.log('Conexión establecida:', data);
        this.updateUI('Conectado al servidor', 'success');
    }

    handleTranscriptionStarted(data) {
        console.log('Transcripción iniciada:', data);
        this.updateProgress(15, 'Transcripción iniciada...');
        this.showJobInfo(data.jobName, 'TRANSCRIBING');
    }

    handleTranscriptionProgress(data) {
        console.log('Progreso de transcripción:', data);
        const progress = Math.min(data.progress || 50, 70);
        this.updateProgress(progress, 'Transcribiendo audio...');
    }

    handleTranscriptionCompleted(data) {
        console.log('Transcripción completada:', data);
        this.updateProgress(75, 'Transcripción completada. Formateando...');
        this.updateUI('Transcripción completada. Iniciando formateo...', 'info');
    }

    handleFormattingCompleted(data) {
        console.log('Formateo completado:', data);
        this.updateProgress(90, 'Formateo completado. Generando resumen...');
        this.updateUI('Formateo completado. Generando resumen...', 'info');
    }

    handleProcessCompleted(data) {
        console.log('Proceso completado:', data);
        this.updateProgress(100, 'Proceso completado exitosamente');
        this.displayResults(data.results);
        this.updateUI('¡Proceso completado exitosamente!', 'success');
    }

    handleErrorMessage(data) {
        console.error('Error del servidor:', data);
        this.displayError(data.message, data.details);
        this.updateUI(`Error: ${data.message}`, 'error');
    }

    handlePing(data) {
        // Responder al ping con pong
        this.sendMessage({ type: 'PONG', timestamp: new Date().toISOString() });
    }

    updateUI(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${this.getBootstrapClass(type)} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insertar en el container de mensajes o crear uno
        let messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.className = 'mb-3';
            
            const mainContainer = document.querySelector('.container .row .col-lg-8');
            if (mainContainer) {
                mainContainer.insertBefore(messageContainer, mainContainer.firstChild);
            }
        }
        
        messageContainer.appendChild(alertDiv);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    updateProgress(percentage, text = '') {
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressPercentage = document.getElementById('progressPercentage');
        
        if (progressContainer) {
            if (percentage > 0) {
                progressContainer.style.display = 'block';
            } else {
                progressContainer.style.display = 'none';
            }
        }
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', percentage);
        }
        
        if (progressText && text) {
            progressText.textContent = text;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }
        
        // Exponer para uso global
        window.updateProgress = (perc, txt) => this.updateProgress(perc, txt);
    }

    showJobInfo(jobName, stage) {
        const jobInfoDiv = document.getElementById('jobInfo');
        if (jobInfoDiv) {
            jobInfoDiv.innerHTML = `
                <div class="alert alert-info">
                    <strong>Job en proceso:</strong><br>
                    <code>${jobName}</code><br>
                    <small>Estado: ${stage}</small>
                </div>
            `;
            jobInfoDiv.style.display = 'block';
        }
    }

    displayResults(results) {
        const resultsDiv = document.getElementById('results');
        const resultsContent = document.getElementById('resultsContent');
        
        if (resultsDiv && resultsContent && results) {
            let html = '';
            
            if (results.transcription) {
                html += `
                    <div class="mb-4">
                        <h6>Transcripción:</h6>
                        <div class="code-block">
                            ${this.formatTranscription(results.transcription)}
                        </div>
                        <button class="btn btn-sm btn-outline-primary mt-2" 
                                onclick="wsManager.downloadResults('transcription', '${results.transcription}')">
                            <i class="bi bi-download"></i> Descargar Transcripción
                        </button>
                    </div>
                `;
            }
            
            if (results.summary) {
                html += `
                    <div class="mb-4">
                        <h6>Resumen:</h6>
                        <div class="code-block">
                            ${this.formatSummary(results.summary)}
                        </div>
                        <button class="btn btn-sm btn-outline-primary mt-2" 
                                onclick="wsManager.downloadResults('summary', '${results.summary}')">
                            <i class="bi bi-download"></i> Descargar Resumen
                        </button>
                    </div>
                `;
            }
            
            resultsContent.innerHTML = html;
            resultsDiv.style.display = 'block';
        }
    }

    downloadResults(type, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    displayError(message, details = null) {
        const errorDiv = document.getElementById('error');
        if (errorDiv) {
            errorDiv.innerHTML = `
                <div class="alert alert-danger">
                    <h6>Error:</h6>
                    <p>${message}</p>
                    ${details ? `<details><summary>Detalles técnicos</summary><pre>${JSON.stringify(details, null, 2)}</pre></details>` : ''}
                </div>
            `;
            errorDiv.style.display = 'block';
        }
    }

    formatTranscription(text) {
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    }

    formatSummary(text) {
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `badge bg-${status === 'Conectado' ? 'success' : 'secondary'}`;
        }
    }

    getBootstrapClass(type) {
        const classMap = {
            'info': 'info',
            'success': 'success',
            'warning': 'warning',
            'error': 'danger'
        };
        return classMap[type] || 'info';
    }

    resetUI() {
        this.updateProgress(0, '');
        
        const elementsToHide = ['results', 'error', 'jobInfo', 'progressContainer'];
        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        const messageContainer = document.getElementById('messageContainer');
        if (messageContainer) {
            messageContainer.innerHTML = '';
        }
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket no está conectado');
        }
    }

    sendPing() {
        this.sendMessage({
            type: 'PING',
            timestamp: new Date().toISOString()
        });
    }

    startPingInterval() {
        this.pingInterval = setInterval(() => {
            this.sendPing();
        }, 30000); // Ping cada 30 segundos
    }

    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    attemptReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        console.log(`Intentando reconectar en ${delay}ms (intento ${this.reconnectAttempts})`);
        this.updateConnectionStatus(`Reconectando... (${this.reconnectAttempts})`);
        
        this.reconnectInterval = setTimeout(() => {
            this.connect().catch(error => {
                console.error('Error en reconexión:', error);
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.attemptReconnect();
                } else {
                    this.updateConnectionStatus('Error de conexión');
                    this.updateUI('No se pudo reconectar. Por favor, recarga la página.', 'error');
                }
            });
        }, delay);
    }

    addMessageHandler(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    removeMessageHandler(type) {
        this.messageHandlers.delete(type);
    }

    disconnect() {
        this.stopPingInterval();
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
        }
        
        if (this.ws) {
            this.ws.close(1000, 'Desconexión manual');
        }
    }

    getSessionId() {
        return this.sessionId;
    }

    getConnectionState() {
        return this.connectionState;
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}
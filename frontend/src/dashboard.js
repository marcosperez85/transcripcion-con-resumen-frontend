import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { getDashboardData, getTranscriptionResults, deleteFile } from "./statusChecker.js";
import { getIdentityId } from "./s3Credentials.js";
import { CONFIG } from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
    const loadingIndicator = document.getElementById("loadingIndicator");
    const jobsList = document.getElementById("jobsList");
    const emptyState = document.getElementById("emptyState");

    try {
        const identityId = await getIdentityId();
        const data = await getDashboardData(identityId);

        renderUsage(data.usage);
        renderJobs(data);

        loadingIndicator.style.display = "none";

    } catch (error) {
        console.error("Error al cargar el dashboard:", error);
        loadingIndicator.innerHTML = `<div class="alert alert-danger">Error al cargar los datos: ${error.message}</div>`;
    }

    setupModal();
});

function renderUsage(usage) {
    const used = usage.usedSeconds || 0;
    const limit = usage.limitSeconds || 600;
    const remaining = usage.remainingSeconds || (limit - used);

    const percent = Math.min(100, Math.round((used / limit) * 100));

    const bar = document.getElementById("usageProgressBar");
    bar.style.width = `${percent}%`;
    bar.textContent = `${percent}%`;

    if (percent > 90) {
        bar.classList.add("bg-danger");
    } else if (percent > 75) {
        bar.classList.add("bg-warning");
    } else {
        bar.classList.add("bg-success");
    }

    document.getElementById("usedTimeText").innerHTML = `<strong>Usado:</strong> ${Math.round(used)}s`;
    document.getElementById("remainingTimeText").innerHTML = `<strong>Restante:</strong> ${Math.round(remaining)}s`;
}

function renderJobs(data) {
    const jobsList = document.getElementById("jobsList");
    const emptyState = document.getElementById("emptyState");

    const jobsMap = new Map();

    // Registrar transcripciones
    data.formatted.forEach(f => {
        jobsMap.set(f.jobName, {
            jobName: f.jobName,
            key: f.key,
            date: new Date(f.date),
            hasTranscription: true,
            hasSummary: false
        });
    });

    // Añadir resúmenes
    data.summaries.forEach(s => {
        if (jobsMap.has(s.jobName)) {
            jobsMap.get(s.jobName).hasSummary = true;
            // Si el resumen tiene el key y la transcripción no, podríamos asignarlo, 
            // pero con el key del formateado debería bastar para borrar ambos si es que el backend borra todo.
            // Para asegurar, podemos guardar un key si no estaba.
            if (!jobsMap.get(s.jobName).key) {
                jobsMap.get(s.jobName).key = s.key;
            }
        } else {
            jobsMap.set(s.jobName, {
                jobName: s.jobName,
                key: s.key,
                date: new Date(s.date),
                hasTranscription: false,
                hasSummary: true
            });
        }
    });

    const jobs = Array.from(jobsMap.values()).sort((a, b) => b.date - a.date);

    if (jobs.length === 0 && data.audios.length === 0) {
        emptyState.style.display = "block";
        return;
    }

    jobsList.style.display = "block";
    jobsList.innerHTML = "";

    // Renderizar Jobs (Transcripciones/Resúmenes)
    if (jobs.length > 0) {
        const jobsHeader = document.createElement("h4");
        jobsHeader.className = "mb-3 mt-4";
        jobsHeader.innerHTML = "Trabajos Procesados";
        jobsList.appendChild(jobsHeader);

        jobs.forEach(job => {
            const card = document.createElement("div");
            card.className = "card bg-light mb-3 border-secondary";

            // Format date safely
            const dateStr = !isNaN(job.date) ? job.date.toLocaleString() : "Fecha desconocida";

            card.innerHTML = `
                <div class="card-body d-flex justify-content-between align-items-center flex-wrap">
                    <div>
                        <h5 class="card-title mb-1"><i class="fas fa-file-alt text-info me-2"></i>Trabajo: ${job.jobName.substring(0, 8)}...</h5>
                        <p class="card-text text-muted small mb-0"><i class="far fa-clock me-1"></i>${dateStr}</p>
                    </div>
                    <div class="mt-2 mt-md-0">
                        <button class="btn btn-sm btn-outline-primary me-2 btn-view-transcription" data-job="${job.jobName}" ${!job.hasTranscription ? 'disabled' : ''}>
                            <i class="fas fa-align-left me-1"></i>Transcripción
                        </button>
                        <button class="btn btn-sm btn-outline-success me-2 btn-view-summary" data-job="${job.jobName}" ${!job.hasSummary ? 'disabled' : ''}>
                            <i class="fas fa-list-ul me-1"></i>Resumen
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-file" data-key="${job.key}" title="Eliminar Trabajo">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            jobsList.appendChild(card);
        });
    }

    // Renderizar Audios Subidos
    if (data.audios.length > 0) {
        const audiosHeader = document.createElement("h4");
        audiosHeader.className = "mb-3 mt-4";
        audiosHeader.innerHTML = "Audios Originales";
        jobsList.appendChild(audiosHeader);

        const listGroup = document.createElement("div");
        listGroup.className = "list-group";

        data.audios.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(audio => {
            const item = document.createElement("div");
            item.className = "list-group-item bg-light border-secondary d-flex justify-content-between align-items-center";

            const dateStr = new Date(audio.date).toLocaleString();
            const sizeMb = (audio.size / (1024 * 1024)).toFixed(2);

            item.innerHTML = `
                <div>
                    <i class="fas fa-file-audio text-warning me-2"></i>${audio.filename}
                </div>
                <div class="text-muted small d-flex align-items-center">
                    <span class="me-3">${sizeMb} MB</span>
                    <span class="me-3">${dateStr}</span>
                    <button class="btn btn-sm btn-outline-danger btn-delete-file" data-key="${audio.key}" title="Eliminar Audio">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            listGroup.appendChild(item);
        });

        jobsList.appendChild(listGroup);
    }

    // Add event listeners for buttons
    document.querySelectorAll('.btn-view-transcription').forEach(btn => {
        btn.addEventListener('click', () => showResult(btn.getAttribute('data-job'), 'transcription'));
    });

    document.querySelectorAll('.btn-view-summary').forEach(btn => {
        btn.addEventListener('click', () => showResult(btn.getAttribute('data-job'), 'summary'));
    });
    
    document.querySelectorAll('.btn-delete-file').forEach(btn => {
        btn.addEventListener('click', () => handleDelete(btn.getAttribute('data-key')));
    });
}

async function handleDelete(key) {
    if (!confirm("¿Estás seguro de que deseas eliminar este archivo? Esta acción no se puede deshacer.")) {
        return;
    }
    
    try {
        const identityId = await getIdentityId();
        await deleteFile(key, identityId);
        
        // Recargar la página para reflejar los cambios
        window.location.reload();
    } catch (error) {
        console.error("Error al eliminar el archivo:", error);
        alert("Ocurrió un error al intentar eliminar el archivo: " + error.message);
    }
}

// Modal handling
const modal = document.getElementById("resultModal");
const closeBtns = document.querySelectorAll(".close-modal, .close-modal-btn");

function setupModal() {
    closeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    });

    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
}

async function showResult(jobName, type) {
    const modalTitle = document.getElementById("modalTitle");
    const modalContent = document.getElementById("modalContent");

    modalTitle.innerText = type === 'transcription' ? "Cargando Transcripción..." : "Cargando Resumen...";
    modalContent.innerText = "Obteniendo datos...";
    modal.style.display = "block";

    try {
        const result = await getTranscriptionResults(CONFIG.BUCKET_NAME, jobName);

        if (type === 'transcription') {
            modalTitle.innerText = "Transcripción Completa";
            modalContent.innerText = result.transcription || "No se encontró la transcripción.";
        } else {
            modalTitle.innerText = "Resumen (Bedrock)";
            modalContent.innerText = result.summary || "No se encontró el resumen.";
        }
    } catch (error) {
        modalTitle.innerText = "Error";
        modalContent.innerText = "No se pudieron obtener los datos. Intenta nuevamente.";
        console.error(error);
    }
}

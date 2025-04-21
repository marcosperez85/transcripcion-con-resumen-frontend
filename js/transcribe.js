const $forumularioDeUpload = document.getElementById("uploadForm")
const $status = document.getElementById("status");
const $fileInput = document.getElementById("audioFile");

$forumularioDeUpload.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!$fileInput.files.length) {
        $status.innerHTML = `<div class="alert alert-warning">Por favor seleccioná un archivo MP3.</div>`;
        return;
    }

    const file = $fileInput.files[0];
    $status.innerHTML = `<div class="alert alert-info">Subiendo archivo: ${file.name}</div>`;

    try {
        const response = await fetch('https://53h3319jii.execute-api.us-east-2.amazonaws.com/default/proyecto1-transcribir-audios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "s3": {
                    "bucketName": "transcripcion-con-resumen",
                    "key": "audios/dialog.mp3"
                },
                "transcribe": {
                    "languageCode": "en-US",
                    "maxSpeakers": 2
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`)
        }

        const data = await response.json();
        console.log("Respuesta del servidor:", data);

        $status.innerHTML = `<div class="alert alert-success">✅ Transcripción iniciada correctamente.</div>`;

        // Mostrar contenido de la transcripción
        if (data.transcriptionJobName) {
            $status.innerHTML += `<div class="mt-2">Job ID: <code>${data.transcriptionJobName}</code></div>`;
        }

    }
    catch (error) {
        console.error("Error al enviar la solicitud:", error);
        $status.innerHTML = `<div class="alert alert-danger">❌ Error: ${error.message}</div>`;
    }
});
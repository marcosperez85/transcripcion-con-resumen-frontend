export async function iniciarTranscripcion(bucketName, fileKey, languageCode, maxSpeakers) {
    const apiUrl = "https://53h3319jii.execute-api.us-east-2.amazonaws.com/default/proyecto1-transcribir-audios";

    const body = {
        s3: {
            bucketName: bucketName,
            key: fileKey
        },
        transcribe: {
            languageCode: languageCode,
            maxSpeakers: maxSpeakers
        }
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    // Parsear la respuesta
    const data = await response.json();

    // Trabajar con el objeto completo que vino del backend
    const jobName = data.jobName;
    console.log(`El Job Name recibido es: ${jobName}`);

    return jobName
}

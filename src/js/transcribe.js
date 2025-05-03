export async function iniciarTranscripcion(bucketName, fileKey, languageCode, maxSpeakers) {
    const apiUrl = "https://vq9cf0otga.execute-api.us-east-2.amazonaws.com/prod/transcribir";

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

    return await response.json();
}

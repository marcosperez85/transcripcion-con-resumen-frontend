export async function formatearTranscripcion(nombreDelBucket, nombreDelJob, fileKey) {
    const apiUrl = "https://pvpva3kjdl.execute-api.us-east-1.amazonaws.com/prod/transcribir";

    const body = {
        s3: {
            bucketName: nombreDelBucket,
            key: fileKey
        },
        formatear: {
            job_name: nombreDelJob
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
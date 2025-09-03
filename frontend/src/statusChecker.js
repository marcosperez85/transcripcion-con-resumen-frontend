export async function checkTranscriptionStatus(jobName) {
    const apiUrl = "https://yfoulcwp9a.execute-api.us-east-1.amazonaws.com/prod/transcribir";
    
    const body = {
        checkStatus: {
            job_name: jobName
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

export async function getTranscriptionResults(bucketName, jobName) {
    const apiUrl = "https://yfoulcwp9a.execute-api.us-east-1.amazonaws.com/prod/transcribir";
    
    const body = {
        getResults: {
            bucketName: bucketName,
            job_name: jobName
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
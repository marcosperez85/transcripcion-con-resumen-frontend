fetch('https://53h3319jii.execute-api.us-east-2.amazonaws.com/default/proyecto1-transcribir-audios', {
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
})

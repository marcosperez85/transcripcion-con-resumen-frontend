import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { CONFIG } from './config.js';

// Configurar cliente S3
const s3Client = new S3Client({
    region: CONFIG.REGION,
    credentials: fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: CONFIG.REGION }),
        identityPoolId: CONFIG.IDENTITY_POOL_ID,
    }),
});

export async function uploadFileToS3(file, key, sessionId, languageCode, maxSpeakers) {
    try {
        console.log(`Subiendo archivo ${file.name} a S3...`);
        
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: CONFIG.BUCKET_NAME,
                Key: key,
                Body: file,
                ContentType: file.type,
                // Metadatos para el evento S3 que triggereará Transcribe
                Metadata: {
                    'session-id': sessionId,
                    'language-code': languageCode,
                    'max-speakers': maxSpeakers.toString()
                },
                // Tags para identificar el archivo
                Tagging: `sessionId=${sessionId}&languageCode=${languageCode}&maxSpeakers=${maxSpeakers}`
            },
        });

        // Monitorear progreso
        upload.on("httpUploadProgress", (progress) => {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            console.log(`Progreso de subida: ${percentage}%`);
            
            // Actualizar UI si hay una función disponible
            if (window.updateProgress) {
                window.updateProgress(percentage * 0.1, `Subiendo archivo... ${percentage}%`);
            }
        });

        const result = await upload.done();
        console.log('Archivo subido exitosamente:', result);
        return result;
        
    } catch (error) {
        console.error('Error subiendo archivo a S3:', error);
        throw new Error(`Error subiendo archivo: ${error.message}`);
    }
}
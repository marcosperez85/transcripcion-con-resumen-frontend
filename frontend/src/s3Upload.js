import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getCognitoCredentials, getIdentityId } from "./s3Credentials.js";
import { REGION, BUCKET_NAME } from "./config.js";

/**
 * Sube un archivo a S3 usando Cognito Identity (rol "authenticated")
 * @param {File|Blob|Uint8Array|ArrayBuffer} file
 * @param {string} fileName nombre base del archivo (sin prefijo)
 */
export async function uploadFileToS3(file, fileName) {
    // 1) Resolver el provider ANTES de crear el cliente. 
    // const credentials = await getCognitoCredentials();

    // Esto devuelve un provider (función)
    const provider = await getCognitoCredentials();
    

    // Fuerzo la resolución para inspeccionar 
    const creds = await provider();

    console.log("Resolved creds shape:", {
        accessKeyId: !!creds.accessKeyId,
        secret: !!creds.secretAccessKey,
        token: !!creds.sessionToken,
        expiration: creds.expiration,
    });

    const s3 = new S3Client({
        region: REGION,
        credentials: provider, // provider válido
    });

    // 2) Prefijo por usuario, acorde a la policy del rol
    const identityId = await getIdentityId(); // ej: us-east-1:xxxx-...
    const Key = `audios/${identityId}/${fileName}`;

    const parallelUploads3 = new Upload({
        client: s3,
        params: {
            Bucket: BUCKET_NAME,
            Key,
            Body: file, // en navegador, File/Blob va perfecto
            ContentType: (file && file.type) || "application/octet-stream",
        },
        // Opcional: tunear multipart en uploads grandes
        // queueSize: 3,
        // partSize: 5 * 1024 * 1024,
    });

    parallelUploads3.on("httpUploadProgress", (p) => {
        console.log("Progreso:", p);
    });

    await parallelUploads3.done();
    return { Bucket: BUCKET_NAME, Key };
}

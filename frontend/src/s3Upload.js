import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getCognitoCredentials, getIdentityId } from "./s3Credentials.js";
import { CONFIG } from "./config.js";
import { userManager } from "./auth.js";

const REGION = CONFIG.REGION;
const BUCKET_NAME = CONFIG.BUCKET_NAME;

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
    const identityId = await getIdentityId();

    const user = await userManager.getUser();
    if (!user || user.expired) {
        throw new Error("Usuario no autenticado.");
    }

    const userSub = user.profile.sub;
    const Key = `audios/${userSub}/${identityId}/${fileName}`;

    const parallelUploads3 = new Upload({
        client: s3,
        params: {
            Bucket: BUCKET_NAME,
            Key,
            Body: file, // en navegador, File/Blob va perfecto
            ContentType: (file && file.type) || "application/octet-stream"
        },
        // Opcional: tunear multipart en uploads grandes
        queueSize: 3,
        partSize: 8 * 1024 * 1024,
    });

    parallelUploads3.on("httpUploadProgress", (p) => {
        console.log("Progreso:", p);
    });

    await parallelUploads3.done();
    return { Bucket: BUCKET_NAME, Key };
}

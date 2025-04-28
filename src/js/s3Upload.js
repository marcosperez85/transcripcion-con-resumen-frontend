import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getCognitoCredentials } from './cognitoAuth.js';

const REGION = "us-east-2";
const BUCKET_NAME = "transcripcion-con-resumen";

// Importante configurar el CORS en la pestaña de Permissions dentro del bucket para que admita el origen desde el cual 
// se realiza el upload

export async function uploadFileToS3(file, key) {
    const s3 = new S3Client({
        region: REGION,
        credentials: getCognitoCredentials()
    });

    const parallelUploads3 = new Upload({
        client: s3,
        params: {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: file,
            ContentType: file.type
        },
    });

    parallelUploads3.on("httpUploadProgress", (progress) => {
        console.log(progress);
    });

    await parallelUploads3.done();
}

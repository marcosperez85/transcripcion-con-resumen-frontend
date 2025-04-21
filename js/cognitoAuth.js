import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Parámetros
const REGION = "us-east-2";
const IDENTITY_POOL_ID = "us-east-2:d8965005-3395-406b-b4cf-9140dffbc1b0";
const BUCKET_NAME = "transcripcion-con-resumen";
const FILE_KEY = "audios/tuarchivo.mp3";

// 1. Crear cliente de S3 con credenciales de Cognito
const s3 = new S3Client({
  region: REGION,
  credentials: fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: REGION }),
    identityPoolId: IDENTITY_POOL_ID
  })
});

// 2. Subir archivo
async function uploadFile(file) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: FILE_KEY,
    Body: file,
    ContentType: file.type
  });

  try {
    await s3.send(command);
    console.log("Archivo subido exitosamente.");
  } catch (err) {
    console.error("Error al subir archivo:", err);
  }
}

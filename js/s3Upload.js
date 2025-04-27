import { getCognitoCredentials } from './cognitoAuth.js';

const REGION = "us-east-2";
const BUCKET_NAME = "transcripcion-con-resumen";

export async function uploadFileToS3(file, key) {
    const s3 = new AWS.S3Client({
      region: REGION,
      credentials: getCognitoCredentials()
    });
  
    const command = new AWS.PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: file.type
    });
  
    await s3.send(command);
}
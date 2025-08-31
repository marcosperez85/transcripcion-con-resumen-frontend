// Configuración de endpoints y constantes
export const CONFIG = {
    // Estos valores se deben actualizar después del deploy del backend
    WEBSOCKET_URL: "wss://33hhrplka3.execute-api.us-east-1.amazonaws.com/prod",
    API_URL: "https://0nn249g9wd.execute-api.us-east-1.amazonaws.com/prod/transcribir",
    
    // Configuración S3
    REGION: "us-east-1",
    BUCKET_NAME: "transcripcion-con-resumen",
    
    // Configuración Cognito (si usas autenticación)
    IDENTITY_POOL_ID: "us-east-1:06a0d449-cbc6-4850-aec9-2766adf213f7",
    
    // Configuración de archivos
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    ALLOWED_TYPES: [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 
        'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a'
    ],
    ALLOWED_EXTENSIONS: ['.mp3', '.wav', '.flac', '.ogg', '.webm', '.mp4', '.m4a']
};
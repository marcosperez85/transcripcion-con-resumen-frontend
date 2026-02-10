// Detectar entorno
const isDevelopment = window.location.hostname === 'localhost';

export const CONFIG = {
    REGION: "us-east-1",
    USER_POOL_ID: "us-east-1_cH9mKVza7",
    USER_POOL_CLIENT_ID: "7mamskis0o6je28qfvtr4tvftd", 
    IDENTITY_POOL_ID: "us-east-1:d48bc7ec-5785-47f0-a6a4-4ca30d43b3a2",
    BUCKET_NAME: "transcripcion-con-resumen-backend-376129873205-us-east-1",
    API_URL: "https://yfoulcwp9a.execute-api.us-east-1.amazonaws.com/prod/transcribir",

    // URLs dinámicas según entorno
    BASE_URL: isDevelopment 
        ? 'http://localhost:5173'
        : 'https://d11ahn26gyfe9q.cloudfront.net',
        
    // URLs derivadas
    get PROVIDER() {
        return `cognito-idp.${this.REGION}.amazonaws.com/${this.USER_POOL_ID}`;
    },
    
    get COGNITO_DOMAIN() {
        return `https://transcripcion-376129873205.auth.us-east-1.amazoncognito.com`
        // return `https://${this.USER_POOL_ID}.auth.${this.REGION}.amazoncognito.com`;
    },
    
    get AUTHORITY() {
        return `https://cognito-idp.${this.REGION}.amazonaws.com/${this.USER_POOL_ID}`;
    },
    
    get CALLBACK_URL() {
        return `${this.BASE_URL}/pages/callback.html`;
    },
    
    get LOGOUT_URL() {
        return `${this.BASE_URL}/pages/logout.html`;
    }
};
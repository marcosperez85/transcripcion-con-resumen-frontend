// Detectar entorno
const isDevelopment = window.location.hostname === 'localhost';
import { userManager } from "./auth.js";

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

// Helper para hacer requests autenticados al backend
export async function authFetch(url, options = {}) {
    // Usar solamente localStorage para obtener el token
    const user = await userManager.getUser();
    const token = user?.id_token;

    console.log("Token disponible para fetch:", token ? "Sí (primeros caracteres: " + token.substring(0, 10) + "...)" : "No");

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`;
    }
    // Log completo para debugging
    // No exponer en producción porque revela URL de API Gateway
    // console.log("Request details:", {
    //     url,
    //     method: options.method || "GET",
    //     headers: { ...headers, Authorization: headers.Authorization ? "Bearer ***" : undefined },
    //     body: options.body ? "Present" : "None"
    // });

    return fetch(url, {
        ...options,
        headers
    });
}
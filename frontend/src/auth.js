import { UserManager } from "oidc-client-ts";
import { USER_POOL_ID, USER_POOL_CLIENT_ID, COGNITO_DOMAIN } from "./config.js";

// Detectar entorno
const isDevelopment = window.location.hostname === 'localhost';
const baseUrl = isDevelopment
    ? 'http://localhost:3000'
    : 'https://d11ahn26gyfe9q.cloudfront.net';

const cognitoAuthConfig = {
    // User Pool ID
    authority: `https://cognito-idp.us-east-1.amazonaws.com/${USER_POOL_ID}`,
    client_id: USER_POOL_CLIENT_ID,
    redirect_uri: `${baseUrl}/pages/callback.html`,
    response_type: "code",
    scope: "email openid phone profile"
};

// create a UserManager instance
export const userManager = new UserManager({
    ...cognitoAuthConfig,
});

export async function signOutRedirect () {
    const clientId = USER_POOL_CLIENT_ID;
    const logoutUri = `${baseUrl}/pages/logout.html`;
    const cognitoDomain = COGNITO_DOMAIN;
    
    // Marcamos intención de logout (se leerá al volver)
    sessionStorage.setItem('postLogoutInProgress', '1');
    
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
};
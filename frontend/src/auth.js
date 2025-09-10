import { UserManager } from "oidc-client-ts";

// Detectar entorno
const isDevelopment = window.location.hostname === 'localhost';
const baseUrl = isDevelopment
    ? 'http://localhost:3000'
    : 'https://d1cssc0skay50s.cloudfront.net';

const cognitoAuthConfig = {
    authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PApw7t541",
    client_id: "6evgd9kupcn26vc5nmtuajqrkm",
    redirect_uri: `${baseUrl}/pages/callback.html`,
    response_type: "code",
    scope: "email openid phone"
};

// create a UserManager instance
export const userManager = new UserManager({
    ...cognitoAuthConfig,
});

export async function signOutRedirect () {
    const clientId = "6evgd9kupcn26vc5nmtuajqrkm";
    const logoutUri = baseUrl;
    const cognitoDomain = "https://us-east-1papw7t541.auth.us-east-1.amazoncognito.com";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
};
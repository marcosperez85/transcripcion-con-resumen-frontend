import { UserManager } from "oidc-client-ts";
import { CONFIG } from "./config.js";

const cognitoAuthConfig = {
    authority: CONFIG.AUTHORITY,
    client_id: CONFIG.USER_POOL_CLIENT_ID,
    redirect_uri: CONFIG.CALLBACK_URL,
    response_type: "code",
    scope: "openid email"
};

export const userManager = new UserManager(cognitoAuthConfig);

export async function signOutRedirect() {
    sessionStorage.setItem("postLogoutInProgress", "1");

    window.location.href =
        `${CONFIG.COGNITO_DOMAIN}/logout` +
        `?client_id=${CONFIG.USER_POOL_CLIENT_ID}` +
        `&logout_uri=${encodeURIComponent(CONFIG.BASE_URL)}`;
}

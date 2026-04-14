import { CONFIG } from "./config.js";
import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const cognitoAuthConfig = {
    authority: CONFIG.AUTHORITY,
    client_id: CONFIG.USER_POOL_CLIENT_ID,
    redirect_uri: CONFIG.CALLBACK_URL,
    response_type: "code",
    scope: "openid email",
    userStore: new WebStorageStateStore({ store: window.localStorage })
};

export const userManager = new UserManager(cognitoAuthConfig);

// Guardar el token en localStorage cuando se obtiene un nuevo usuario
userManager.events.addUserLoaded((user) => {
    if (user && user.id_token) {
        localStorage.setItem("id_token", user.id_token);
    }
});


export async function signOutRedirect() {
    sessionStorage.setItem("postLogoutInProgress", "1");

    window.location.href =
        `${CONFIG.COGNITO_DOMAIN}/logout` +
        `?client_id=${CONFIG.USER_POOL_CLIENT_ID}` +
        `&logout_uri=${encodeURIComponent(CONFIG.BASE_URL)}`;
}

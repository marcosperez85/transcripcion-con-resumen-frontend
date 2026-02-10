import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient, GetIdCommand } from "@aws-sdk/client-cognito-identity";
import { userManager } from "./auth.js";
import { CONFIG } from "./config.js";

export async function getCognitoCredentials() {
    const user = await userManager.getUser();
    if (!user || user.expired) {
        throw new Error("Usuario no autenticado o sesión expirada.");
    }

    return fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: CONFIG.REGION }),
        identityPoolId: CONFIG.IDENTITY_POOL_ID,
        logins: {
            [CONFIG.PROVIDER]: user.id_token
        },
    });
}

export async function getIdentityId() {
    const user = await userManager.getUser();
    if (!user || user.expired) {
        throw new Error("Usuario no autenticado o sesión expirada.");
    }

    const client = new CognitoIdentityClient({ region: CONFIG.REGION });

    const out = await client.send(new GetIdCommand({
        IdentityPoolId: CONFIG.IDENTITY_POOL_ID,
        Logins: { [CONFIG.PROVIDER]: user.id_token },
    }));

    return out.IdentityId;
}

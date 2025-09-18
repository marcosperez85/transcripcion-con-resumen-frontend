import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient, GetIdCommand } from "@aws-sdk/client-cognito-identity";
import { userManager } from "./auth.js";
import { USER_POOL_ID, REGION, IDENTITY_POOL_ID } from "./config.js";

const PROVIDER = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

export async function getCognitoCredentials() {
  const user = await userManager.getUser();
  if (!user || user.expired) {
    throw new Error("Usuario no autenticado o sesión expirada.");
  }
  const idToken = user.id_token;

  return fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: REGION }),
    identityPoolId: IDENTITY_POOL_ID,
    logins: { [PROVIDER]: idToken },
  });
}

// (Opcional) Para construir el prefijo 'audios/<IdentityId>/*' en el key:
export async function getIdentityId() {
  const user = await userManager.getUser();
  if (!user || user.expired) {
    throw new Error("Usuario no autenticado o sesión expirada.");
  }

  const idToken = user.id_token;
  const client = new CognitoIdentityClient({ region: REGION });

  const out = await client.send(new GetIdCommand({
    IdentityPoolId: IDENTITY_POOL_ID,
    Logins: { [PROVIDER]: idToken },
  }));
  return out.IdentityId;
}

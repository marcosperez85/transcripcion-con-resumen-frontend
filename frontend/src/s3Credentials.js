import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient, GetIdCommand } from "@aws-sdk/client-cognito-identity";
import { userManager } from "./auth.js";

 // Ajusta región según corresponda
const REGION = "us-east-1";

// Es el mismo que está en "auth.js"
const USER_POOL_ID = "us-east-1_PApw7t541"; 

// Obtenido del output del CDK del backend
const IDENTITY_POOL_ID = "us-east-1:d48bc7ec-5785-47f0-a6a4-4ca30d43b3a2";

// us-east-1:57931665-35be-c0e7-67f5-d6da3dd59c4b

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
  return out.IdentityId; // ej: "us-east-1:1234abcd-...."
}

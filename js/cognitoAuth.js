import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

// Parámetros
const REGION = "us-east-2";
const IDENTITY_POOL_ID = "us-east-2:d8965005-3395-406b-b4cf-9140dffbc1b0";

export function getCognitoCredentials() {
  return fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: REGION }),
    identityPoolId: IDENTITY_POOL_ID
  });
}



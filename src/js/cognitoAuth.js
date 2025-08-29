import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";

export function getCognitoCredentials() {
  return fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: "us-east-1" }),
    identityPoolId: "us-east-1:06a0d449-cbc6-4850-aec9-2766adf213f7"
  });
}




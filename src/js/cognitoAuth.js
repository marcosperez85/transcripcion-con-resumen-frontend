import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";

export function getCognitoCredentials() {
  return fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: "us-east-2" }),
    identityPoolId: "us-east-2:d8965005-3395-406b-b4cf-9140dffbc1b0"
  });
}




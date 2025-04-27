export function getCognitoCredentials() {
  return AWS.fromCognitoIdentityPool({
    client: new AWS.CognitoIdentityClient({ region: "us-east-2" }),
    identityPoolId: "us-east-2:d8965005-3395-406b-b4cf-9140dffbc1b0"
  });
}




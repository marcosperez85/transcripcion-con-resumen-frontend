// index.mjs
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { USER_POOL_ID, CLIENT_ID, REGION, COGNITO_DOMAIN} from "../main.js";

// Rutas a proteger (no incluir el callback ni el logout para poder obtener el token_id)
const PROTECTED_URIS = new Set(["/pages/app.html"]);
/** ======================================== */

const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: "id",
  clientId: CLIENT_ID,
});

function parseCookie(headers, name) {
  const cookieHeader = headers?.cookie?.[0]?.value ?? "";
  const rx = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`);
  const m = cookieHeader.match(rx);
  return m && m[1];
}

function buildRedirectUriFromRequest(request) {
  const host = request.headers?.host?.[0]?.value;
  const scheme = "https"; // CloudFront siempre entra por HTTPS
  return `${scheme}://${host}/pages/callback.html`;
}

function redirectToLogin() {
  const redirectUri = buildRedirectUriFromRequest(request);
  const loginUrl = `${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=openid+profile&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  return {
    status: "302",
    statusDescription: "Found",
    headers: {
      location: [{ key: "Location", value: loginUrl }],
      "cache-control": [{ key: "Cache-Control", value: "no-store" }],
    },
  };
}

export const handler = async (event) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;

  // Si no es una ruta protegida, dejar pasar
  if (!PROTECTED_URIS.has(uri)) return request;

  const token = parseCookie(request.headers, "id_token");
  if (!token) {
    return redirectToLogin(request);
  }

  try {
    await verifier.verify(token);
    return request; // OK -> pasa a S3
  } catch (e) {
    // Token inválido/expirado -> re-login
    return redirectToLogin(request);
  }
};
module.exports.handler = handler;

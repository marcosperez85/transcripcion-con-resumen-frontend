import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { userManager } from "./auth.js";

document.getElementById("loginBtn").addEventListener("click", async () => {
    console.log("Login Presionado")
    await userManager.signinRedirect();
});
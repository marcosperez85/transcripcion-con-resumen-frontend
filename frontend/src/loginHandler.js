import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { userManager, redirectToSignUp } from "./auth.js";

document.getElementById("loginBtn").addEventListener("click", async () => {
    console.log("Login Presionado")    
    await userManager.signinRedirect({ prompt: 'login' });
});

document.getElementById("comenzarBtn1").addEventListener("click", async () => {
    console.log("Comenzar 1 Presionado")    
    await userManager.signinRedirect({ prompt: 'login' });
});

document.getElementById("comenzarBtn2").addEventListener("click", async () => {
    console.log("Comenzar 2 Presionado")    
    await userManager.signinRedirect({ prompt: 'login' });
});

// Añadir evento para el botón de registro
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
    registerBtn.addEventListener("click", () => {
        console.log("Registro Presionado");
        redirectToSignUp();
    });
}
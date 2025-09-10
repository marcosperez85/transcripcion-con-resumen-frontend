import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { signOutRedirect } from "./auth.js";

document.getElementById("logoutBtn").addEventListener("click", async () => {
    console.log("Logout Presionado")
    await signOutRedirect();
});
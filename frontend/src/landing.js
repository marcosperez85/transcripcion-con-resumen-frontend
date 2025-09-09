import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { userManager, signOutRedirect } from "./auth.js";

document.addEventListener('DOMContentLoaded', async () => {
    const loginBtn = document.getElementById('loginBtn');
    const comenzarBtn1 = document.getElementById('comenzarBtn1');
    const comenzarBtn2 = document.getElementById('comenzarBtn2');

    // Verificar si ya está autenticado
    try {
        const user = await userManager.getUser();
        if (user && !user.expired) {
            // Redirigir a la aplicación
            window.location.href = './pages/app.html';
            return;
        }
    } catch (error) {
        console.log('Usuario no autenticado:', error);
    }

    // Función de login con manejo de errores
    const handleLogin = async () => {
        try {
            console.log("Iniciando proceso de login");
            await userManager.signinRedirect();
        } catch (error) {
            console.error('Error en el proceso de login:', error);
            // Mostrar mensaje de error al usuario
            alert('Error al iniciar sesión. Por favor, inténtalo de nuevo.');
        }
    };

    // Asignar evento a todos los botones
    [loginBtn, comenzarBtn1, comenzarBtn2].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', handleLogin);
        }
    });
});
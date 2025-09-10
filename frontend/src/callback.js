import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { userManager } from './auth.js';

// Referencias a elementos del DOM
const loadingContent = document.getElementById('loadingContent');
const successContent = document.getElementById('successContent');
const errorContent = document.getElementById('errorContent');

// Función para mostrar estado de éxito
function showSuccess() {
    loadingContent.classList.add('d-none');
    successContent.classList.remove('d-none');
}

// Función para mostrar estado de error
function showError() {
    loadingContent.classList.add('d-none');
    errorContent.classList.remove('d-none');
}

// Procesa ?code y guarda la sesión
userManager.signinCallback()
    .then(() => {
        console.log('Inicio de sesión exitoso');
        showSuccess();
        
        // Pequeña pausa para mostrar el mensaje de éxito
        setTimeout(() => {
            window.location.replace('/pages/app.html');
        }, 1500);
    })
    .catch((err) => {
        console.error('Error en signinCallback:', err);
        showError();
    });
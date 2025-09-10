import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { signOutRedirect } from './auth.js';

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

// Función para redirigir al inicio directamente
function redirectToHome() {
    setTimeout(() => {
        window.location.replace('/');
    }, 2000);
}

// Proceso de logout simplificado
async function performLogout() {
    try {
        console.log('Iniciando proceso de logout...');
        
        // Usar únicamente el método personalizado que funciona
        await signOutRedirect();
        
        // El signOutRedirect ya maneja la redirección a Cognito
        // que luego redirige de vuelta a logout.html
        
    } catch (error) {
        console.error('Error durante el logout:', error);
        
        // Si hay error, mostrar éxito de todas formas y redirigir
        showSuccess();
        redirectToHome();
    }
}

// Verificar si venimos del redirect de Cognito
function checkIfComingFromCognito() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Si no hay parámetros, es la primera carga (antes del redirect a Cognito)
    if (urlParams.toString() === '') {
        console.log('Primera carga - iniciando logout...');
        setTimeout(() => {
            performLogout();
        }, 1000);
    } else {
        // Venimos del redirect de Cognito - mostrar éxito y redirigir
        console.log('Regresando de Cognito - logout completado');
        showSuccess();
        redirectToHome();
    }
}

// Iniciar el proceso cuando carga la página
document.addEventListener('DOMContentLoaded', () => {
    checkIfComingFromCognito();
});
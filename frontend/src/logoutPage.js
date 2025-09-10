import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { signOutRedirect } from './auth.js';

const loadingContent = document.getElementById('loadingContent');
const successContent = document.getElementById('successContent');
const errorContent = document.getElementById('errorContent');

function showSuccess() {
  loadingContent.classList.add('d-none');
  successContent.classList.remove('d-none');
}

function showError() {
  loadingContent.classList.add('d-none');
  errorContent.classList.remove('d-none');
}

function redirectToHome() {
  setTimeout(() => {
    // Limpiar todo y volver al inicio
    sessionStorage.removeItem('postLogoutInProgress');
    localStorage.clear();
    window.location.replace('/'); // index.html en raíz de CloudFront
  }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
  const inProgress = sessionStorage.getItem('postLogoutInProgress') === 'true' || 
                     sessionStorage.getItem('postLogoutInProgress') === '1';

  if (inProgress) {
    // Ya venimos de Cognito: mostrar éxito y redirigir
    showSuccess();
    redirectToHome();
    return;
  }

  // Primera vez: marcamos el flag y salimos a Cognito
  sessionStorage.setItem('postLogoutInProgress', '1');
  try {
    await signOutRedirect();
  } catch (e) {
    console.error('Error durante el logout:', e);
    showError();
    redirectToHome();
  }
});

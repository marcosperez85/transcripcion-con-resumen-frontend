import { userManager } from './auth.js';

// Procesa ?code y guarda la sesión
userManager.signinCallback()
  .then(() => {
    // Listo: vamos a la app
    window.location.replace('/pages/app.html');
  })
  .catch((err) => {
    console.error('Error en signinCallback:', err);
    alert('No se pudo completar el inicio de sesión.');
    window.location.replace('/');
  });

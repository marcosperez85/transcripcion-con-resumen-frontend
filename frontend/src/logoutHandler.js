import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

document.getElementById("logoutBtn").addEventListener("click", async () => {
    console.log("Logout Presionado")
    // Redirigir a la página de logout en lugar de hacer logout directo
    window.location.href = '/pages/logout.html';
});
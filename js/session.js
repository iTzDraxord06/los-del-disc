// js/session.js - Guardián de sesión común para todas las vistas internas
const usuarioSesion = JSON.parse(localStorage.getItem('disc_user'));
if (!usuarioSesion) {
    window.location.href = 'login.html';
}

// Inactividad de 15 minutos
const TIEMPO_INACTIVIDAD = 15 * 60 * 1000;
let temporizadorInactividad;

function reiniciarTemporizador() {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(() => {
        alert('Sesión expirada por inactividad.');
        localStorage.removeItem('disc_user');
        window.location.href = 'login.html';
    }, TIEMPO_INACTIVIDAD);
}

['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(e => {
    window.addEventListener(e, reiniciarTemporizador, { passive: true });
});
reiniciarTemporizador();

// Manejo del panel inferior y menú lateral móvil
document.addEventListener('DOMContentLoaded', () => {
    const labelUser = document.getElementById('labelUsuario');
    if (labelUser && usuarioSesion) {
        labelUser.textContent = `${usuarioSesion.NombreVisible} [${usuarioSesion.RolApp}]`;
    }

    const btnToggle = document.getElementById('btnToggleMenuUsuario');
    const menuPopup = document.getElementById('menuDesplegableUsuario');
    const btnLogout = document.getElementById('btnCerrarSesion');
    const btnMenuMobile = document.getElementById('btnMenu');
    const barraLateral = document.getElementById('barraLateral');

    if (btnToggle && menuPopup) {
        btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuPopup.classList.toggle('oculto');
        });

        document.addEventListener('click', (e) => {
            if (!menuPopup.classList.contains('oculto') && !menuPopup.contains(e.target)) {
                menuPopup.classList.add('oculto');
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('disc_user');
            window.location.href = 'login.html';
        });
    }

    if (btnMenuMobile && barraLateral) {
        btnMenuMobile.addEventListener('click', (e) => {
            e.stopPropagation();
            barraLateral.classList.toggle('abierto');
        });
    }
});
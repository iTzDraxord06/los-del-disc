const TIEMPO_INACTIVIDAD = 15 * 60 * 1000;
let temporizadorInactividad = null;
let sesionInicializada = false;
export function obtenerUsuarioSesion() {
    try {
        const usuario = localStorage.getItem('disc_user');
        if (!usuario) {
            return null;
        }
        return JSON.parse(usuario);
    } catch (error) {
        console.error('Error leyendo la sesión:', error);
        return null;
    }
}
export function verificarSesion() {
    const usuario = obtenerUsuarioSesion();
    if (!usuario) {
        window.location.href = 'login.html';
        return null;
    }
    return usuario;
}
export function cerrarSesion() {
    localStorage.removeItem('disc_user');
    window.location.href = 'login.html';
}
function cerrarSesionPorInactividad() {
    alert('Tu sesión ha expirado por inactividad.');
    cerrarSesion();
}
function reiniciarTemporizador() {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(
        cerrarSesionPorInactividad,
        TIEMPO_INACTIVIDAD
    );
}
export function actualizarUsuarioSidebar() {
    const usuario = obtenerUsuarioSesion();
    const labelUsuario =
        document.getElementById('labelUsuario');
    if (!labelUsuario || !usuario) {
        return;
    }
    const nombre =
        usuario.NombreVisible ||
        usuario.Username ||
        'Usuario';
    const rol =
        usuario.RolApp ||
        'Lector';
    labelUsuario.textContent =
        `${nombre} [${rol}]`;
}
function configurarMenuUsuario() {
    const btnToggle =
        document.getElementById('btnToggleMenuUsuario');
    const menu =
        document.getElementById('menuDesplegableUsuario');
    const btnCerrarSesion =
        document.getElementById('btnCerrarSesion');
    const btnConfiguracion =
        document.getElementById('btnConfiguracion');
    if (btnToggle && menu) {
        btnToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            menu.classList.toggle('oculto');
        });
    }
    document.addEventListener('click', (event) => {
        if (!menu) return;
        if (
            !menu.classList.contains('oculto') &&
            !menu.contains(event.target) &&
            !btnToggle?.contains(event.target)
        ) {
            menu.classList.add('oculto');
        }
    });
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener(
            'click',
            cerrarSesion
        );
    }
    if (btnConfiguracion) {
        btnConfiguracion.addEventListener('click', () => {
            window.location.href =
                'html/configuracion.html';

        });

    }

}
function configurarMenuMovil() {
    const btnMenu = document.getElementById('btnMenu');
    const barraLateral = document.getElementById('barraLateral');
    if (!btnMenu || !barraLateral) return;
    let overlaySidebar = document.getElementById('overlaySidebar');
    if (!overlaySidebar) {
        overlaySidebar = document.createElement('div');
        overlaySidebar.id = 'overlaySidebar';
        overlaySidebar.className = 'overlay-sidebar';
    }
    document.body.appendChild(overlaySidebar);
    const cerrarMenu = () => {
        barraLateral.classList.remove('abierto');
        overlaySidebar.classList.remove('activo');
    };
    btnMenu.addEventListener('click', event => {
        event.stopPropagation();
        const abierto = barraLateral.classList.toggle('abierto');
        overlaySidebar.classList.toggle('activo', abierto);
    });
    overlaySidebar.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        cerrarMenu();
    });
    barraLateral.querySelectorAll('[data-page]').forEach(enlace => {
        enlace.addEventListener('click', cerrarMenu);
    });
    window.addEventListener('popstate', cerrarMenu);
    window.addEventListener('hashchange', cerrarMenu);
}

function activarControlInactividad() {
    if (sesionInicializada) {
        return;
    }
    const eventos = [
        'mousemove',
        'mousedown',
        'keydown',
        'scroll',
        'touchstart'
    ];
    eventos.forEach(evento => {
        window.addEventListener(
            evento,
            reiniciarTemporizador,
            { passive: true }
        );
    });
    reiniciarTemporizador();
    sesionInicializada = true;
}

export function inicializarSesion() {
    const usuario = verificarSesion();
    if (!usuario) {
        return null;
    }
    activarControlInactividad();
    actualizarUsuarioSidebar();
    configurarMenuUsuario();
    configurarMenuMovil();
    return usuario;
}
const API_URL = '/api';
let notificacionesInicializadas = false;

function obtenerUsuario() {
    try {
        return JSON.parse(localStorage.getItem('disc_user'));
    } catch (error) {
        console.error('Error leyendo usuario:', error);
        return null;
    }
}

export async function cargarNotificaciones() {
    const usuario = obtenerUsuario();
    const listaNotis = document.getElementById('listaNotis');
    const badgeNotis = document.getElementById('badgeNotis');

    if (!listaNotis) return;

    const usuarioId = usuario?.Id ?? usuario?.id;

    if (!usuarioId) {
        listaNotis.innerHTML = '<div class="dropdown-notificaciones-vacio">🔒 Inicia sesión para ver notificaciones</div>';
        badgeNotis?.classList.add('oculto');
        return;
    }

    listaNotis.innerHTML = '<div class="dropdown-notificaciones-vacio">Cargando...</div>';

    try {
        const res = await fetch(`${API_URL}/notificaciones/${usuarioId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        listaNotis.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
            listaNotis.innerHTML = '<div class="dropdown-notificaciones-vacio">📭 No tienes notificaciones</div>';
            badgeNotis?.classList.add('oculto');
            return;
        }

        const noLeidas = data.filter(n => !n.Leido).length;

        if (badgeNotis) {
            if (noLeidas > 0) {
                badgeNotis.textContent = noLeidas;
                badgeNotis.classList.remove('oculto');
            } else {
                badgeNotis.classList.add('oculto');
            }
        }

        data.forEach(notificacion => {
            const elemento = document.createElement('div');
            elemento.className = `item-notificacion ${notificacion.Leido ? '' : 'no-leido'}`;

            const mensaje = notificacion.TextoPrevio?.trim()
                ? `respondió: "${notificacion.TextoPrevio}"`
                : 'envió una imagen 🖼️';

            elemento.innerHTML = `<strong>${notificacion.AutorAccion}</strong> ${mensaje}`;
            elemento.addEventListener('click', () => abrirNotificacion(notificacion));
            listaNotis.appendChild(elemento);
        });
    } catch (error) {
        console.error('Error cargando notificaciones:', error);
        listaNotis.innerHTML = '<div class="dropdown-notificaciones-vacio">Error al cargar.</div>';
    }
}

async function abrirNotificacion(notificacion) {
    try {
        await fetch(`${API_URL}/notificaciones/${notificacion.Id}/leer`, {
            method: 'PUT'
        });
    } catch (error) {
        console.error('No se pudo marcar como leída:', error);
    }

    document.getElementById('dropdownNotis')?.classList.add('oculto');

    if (notificacion.Tipo === 'PERFIL') {
        window.dispatchEvent(new CustomEvent('navegar-app', {
            detail: {
                pagina: 'miembros',
                parametros: {
                    amigoId: notificacion.DestinoId,
                    scrollComentario: notificacion.ComentarioId
                }
            }
        }));
        return;
    }

    if (notificacion.Tipo === 'ANUNCIO') {
        window.dispatchEvent(new CustomEvent('navegar-app', {
            detail: { pagina: 'anuncios' }
        }));
        return;
    }

    window.dispatchEvent(new CustomEvent('navegar-app', {
        detail: {
            pagina: 'muro',
            parametros: {
                scrollPost: notificacion.ComentarioId
            }
        }
    }));
}

export function inicializarNotificaciones() {
    if (notificacionesInicializadas) return;

    const btnNotis = document.getElementById('btnNotis');
    const dropdown = document.getElementById('dropdownNotis');

    if (!btnNotis || !dropdown) return;

    btnNotis.addEventListener('click', async e => {
        e.stopPropagation();
        dropdown.classList.toggle('oculto');

        if (!dropdown.classList.contains('oculto')) {
            await cargarNotificaciones();
        }
    });

    document.addEventListener('click', e => {
        if (!dropdown.contains(e.target) && !btnNotis.contains(e.target)) {
            dropdown.classList.add('oculto');
        }
    });

    notificacionesInicializadas = true;
}
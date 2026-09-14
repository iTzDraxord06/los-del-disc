const API_URL = '/api';

const usuarioSesion = JSON.parse(localStorage.getItem('disc_user'));
if (!usuarioSesion) {
    window.location.href = 'login.html';
}

// --- CONTROL DE INACTIVIDAD (AUTO LOGOUT) ---
const TIEMPO_INACTIVIDAD = 15 * 60 * 1000; // 15 minutos
let temporizadorInactividad;

function cerrarSesionPorInactividad() {
    alert('Tu sesión ha expirado por inactividad.');
    localStorage.removeItem('disc_user');
    window.location.href = 'login.html';
}

function reiniciarTemporizadorInactividad() {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(cerrarSesionPorInactividad, TIEMPO_INACTIVIDAD);
}

const eventosActividad = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
eventosActividad.forEach(evento => {
    window.addEventListener(evento, reiniciarTemporizadorInactividad, { passive: true });
});

reiniciarTemporizadorInactividad();
// --------------------------------------------

let listaAmigosMemoria = [];
let amigoSeleccionado = null;
let amigoSeleccionadoId = null;

// Elementos de Usuario y Menú Desplegable
const labelUsuario = document.getElementById('labelUsuario');
const btnToggleMenuUsuario = document.getElementById('btnToggleMenuUsuario');
const menuDesplegableUsuario = document.getElementById('menuDesplegableUsuario');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');

const btnAbrirModal = document.getElementById('btnAbrirModal');
const btnAbrirModalAfiche = document.getElementById('btnAbrirModalAfiche');
const btnMenu = document.getElementById('btnMenu');
const btnInicio = document.getElementById('btnInicio');
const btnVolverInicio = document.getElementById('btnVolverInicio');

const seccionAmigos = document.querySelector('.seccion-amigos');
const seccionMuro = document.getElementById('seccionMuro');
const listaAmigosEl = document.getElementById('listaAmigos');
const muroVacioEl = document.getElementById('muroVacio');
const muroDetalleEl = document.getElementById('muroDetalle');
const muroAvatar = document.getElementById('muroAvatar');
const muroApodo = document.getElementById('muroApodo');
const muroTag = document.getElementById('muroTag');
const muroRol = document.getElementById('muroRol');
const muroDesc = document.getElementById('muroDesc');
const btnEditarPerfil = document.getElementById('btnEditarPerfil');
const btnEliminarPerfil = document.getElementById('btnEliminarPerfil');
const gridWaifus = document.getElementById('gridWaifus');

// Elementos de Comentarios en Perfiles
const listaComentariosEl = document.getElementById('listaComentarios');
const formComentario = document.getElementById('formComentario');
const inputAutor = document.getElementById('inputAutor');
const inputComentario = document.getElementById('inputComentario');
const inputFotoComentario = document.getElementById('inputFotoComentario');
const labelNombreFotoComentario = document.getElementById('labelNombreFotoComentario');
const btnQuitarFotoComentario = document.getElementById('btnQuitarFotoComentario');
const btnEnviarComentario = document.getElementById('btnEnviarComentario');

// Elementos de Publicaciones Globales (Inicio)
const formPostGlobal = document.getElementById('formPostGlobal');
const inputPostGlobal = document.getElementById('inputPostGlobal');
const inputFotoPostGlobal = document.getElementById('inputFotoPostGlobal');
const labelFotoPostGlobal = document.getElementById('labelFotoPostGlobal');
const btnQuitarFotoPostGlobal = document.getElementById('btnQuitarFotoPostGlobal');
const feedGlobalPosts = document.getElementById('feedGlobalPosts');
const btnEnviarPostGlobal = document.getElementById('btnEnviarPostGlobal');

// Modales
const modalAmigo = document.getElementById('modalAmigo');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const formNuevoAmigo = document.getElementById('formNuevoAmigo');
const modalTitulo = document.getElementById('modalTitulo');
const amigoEditId = document.getElementById('amigoEditId');
const btnGuardarAmigo = document.getElementById('btnGuardarAmigo');

const modalAfiche = document.getElementById('modalAfiche');
const btnCerrarModalAfiche = document.getElementById('btnCerrarModalAfiche');
const formAfiche = document.getElementById('formAfiche');
const feedAfiches = document.getElementById('feedAfiches');
const aficheDefault = document.getElementById('aficheDefault');

// Visor de Imágenes (Lightbox)
const modalVisor = document.getElementById('modalVisor');
const imagenVisorAmpliada = document.getElementById('imagenVisorAmpliada');
const btnCerrarVisor = document.getElementById('btnCerrarVisor');

function abrirVisor(url) {
    if (!url || url.includes('drive.google.com')) return;
    imagenVisorAmpliada.src = url;
    modalVisor.classList.remove('oculto');
}

function cerrarVisor() {
    modalVisor.classList.add('oculto');
    imagenVisorAmpliada.src = '';
}

if (btnCerrarVisor) btnCerrarVisor.addEventListener('click', cerrarVisor);
if (modalVisor) {
    modalVisor.addEventListener('click', (e) => {
        if (e.target === modalVisor) cerrarVisor();
    });
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalVisor && !modalVisor.classList.contains('oculto')) {
        cerrarVisor();
    }
});

// --- HELPER UNIFICADO DE MULTIMEDIA (IMAGEN O VIDEO DRIVE) ---
function renderizarMultimedia(url) {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        return `
            <video class="media-reproductor" controls preload="metadata" style="
                max-width: 100%;
                max-height: 380px;
                border-radius: 8px;
                border: 1px solid var(--borde, #444);
                margin-top: 10px;
                display: block;
                background: #000;
            ">
                <source src="${url}" type="video/mp4">
                Tu navegador no soporta reproducción de video.
            </video>
        `;
    }
    return `<img src="${url}" alt="Multimedia" class="comentario-imagen" title="Clic para ampliar" style="cursor: pointer; max-width: 100%; border-radius: 8px;">`;
}

// Delegación global para triggers de video/foto custom
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('lbl-video-trigger')) {
        const input = e.target.parentElement.querySelector('.input-video-media-file');
        if (input) input.click();
    }
});

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('input-video-media-file')) {
        const span = e.target.parentElement.querySelector('.nombre-archivo-video');
        if (span) {
            span.textContent = e.target.files[0] ? `🎬 ${e.target.files[0].name}` : '';
        }
    }
});

function cerrarMenuLateral() {
    if (seccionAmigos && seccionAmigos.classList.contains('abierto')) {
        seccionAmigos.classList.remove('abierto');
    }
}

// ================= GESTIÓN DEL MENÚ POPUP DE USUARIO =================
if (usuarioSesion) {
    labelUsuario.textContent = `${usuarioSesion.NombreVisible} [${usuarioSesion.RolApp}]`;
    if (inputAutor) inputAutor.value = usuarioSesion.NombreVisible;

    if (usuarioSesion.RolApp === 'Admin') {
        if (btnAbrirModal) btnAbrirModal.classList.remove('oculto');
        if (btnAbrirModalAfiche) btnAbrirModalAfiche.classList.remove('oculto');
    }
}

if (btnToggleMenuUsuario && menuDesplegableUsuario) {
    btnToggleMenuUsuario.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDesplegableUsuario.classList.toggle('oculto');
    });

    document.addEventListener('click', (e) => {
        if (!menuDesplegableUsuario.classList.contains('oculto') && !menuDesplegableUsuario.contains(e.target)) {
            menuDesplegableUsuario.classList.add('oculto');
        }
    });
}

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
        localStorage.removeItem('disc_user');
        window.location.href = 'login.html';
    });
}

if (btnMenu) {
    btnMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        seccionAmigos.classList.toggle('abierto');
    });
}

if (seccionMuro) {
    seccionMuro.addEventListener('click', () => {
        cerrarMenuLateral();
    });
}

function volverAlInicio() {
    cerrarMenuLateral();
    amigoSeleccionadoId = null;
    amigoSeleccionado = null;

    muroDetalleEl.classList.add('oculto');
    muroVacioEl.classList.remove('oculto');

    document.querySelectorAll('.amigo-card').forEach(c => c.classList.remove('activo'));

    if (btnEditarPerfil) btnEditarPerfil.classList.add('oculto');
    if (btnEliminarPerfil) btnEliminarPerfil.classList.add('oculto');

    if (typeof cargarAfiche === 'function') cargarAfiche();
    if (typeof cargarPostsGlobales === 'function') cargarPostsGlobales();
}

if (btnInicio) {
    btnInicio.addEventListener('click', (e) => {
        if (e.target.id === 'btnMenu') return;
        volverAlInicio();
    });
}

if (btnVolverInicio) {
    btnVolverInicio.addEventListener('click', volverAlInicio);
}

// ================= GESTIÓN DE LA FOTO ADJUNTA EN COMENTARIO =================
if (inputFotoComentario) {
    inputFotoComentario.addEventListener('change', () => {
        if (inputFotoComentario.files && inputFotoComentario.files[0]) {
            labelNombreFotoComentario.textContent = `📎 ${inputFotoComentario.files[0].name}`;
            labelNombreFotoComentario.classList.remove('oculto');
            btnQuitarFotoComentario.classList.remove('oculto');
        }
    });
}

function limpiarAdjuntoComentario() {
    if (inputFotoComentario) inputFotoComentario.value = '';
    if (labelNombreFotoComentario) {
        labelNombreFotoComentario.textContent = '';
        labelNombreFotoComentario.classList.add('oculto');
    }
    if (btnQuitarFotoComentario) btnQuitarFotoComentario.classList.add('oculto');
}

if (btnQuitarFotoComentario) {
    btnQuitarFotoComentario.addEventListener('click', limpiarAdjuntoComentario);
}

// ================= COMENTARIOS EN PERFILES =================
async function cargarComentarios(amigoId) {
    if (!listaComentariosEl) return;
    listaComentariosEl.innerHTML = '<p class="cargando">Cargando comentarios...</p>';
    try {
        const res = await fetch(`${API_URL}/comentarios/${amigoId}`);
        const comentarios = await res.json();
        listaComentariosEl.innerHTML = '';

        if (!Array.isArray(comentarios) || comentarios.length === 0) {
            listaComentariosEl.innerHTML = '<p class="sin-datos">Nadie ha comentado aún. ¡Sé el primero!</p>';
            return;
        }

        comentarios.forEach(c => {
            const rawFecha = c.Fecha || c.FechaPublicacion;
            const fechaStr = rawFecha ? new Date(rawFecha).toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short'
            }) : 'Reciente';

            const textoComentario = c.Texto || c.Contenido || '';
            const esAdmin = usuarioSesion && usuarioSesion.RolApp === 'Admin';
            const esAutor = usuarioSesion && usuarioSesion.NombreVisible === c.Autor;
            const puedeBorrar = esAdmin || esAutor;

            const card = document.createElement('div');
            card.className = 'comentario-item';
            
            let mediaHtml = c.ImagenUrl ? renderizarMultimedia(c.ImagenUrl) : '';

            card.innerHTML = `
                <div class="comentario-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="comentario-autor">${c.Autor}</span>
                        <span class="comentario-fecha">${fechaStr}</span>
                    </div>
                    ${puedeBorrar ? `<button class="btn-borrar-comentario" data-id="${c.Id}" title="Eliminar comentario" style="background: none; border: none; cursor: pointer; color: #ed4245; font-size: 14px; padding: 2px 6px;">🗑️</button>` : ''}
                </div>
                <p class="comentario-texto">${textoComentario}</p>
                ${mediaHtml}
            `;

            const imgEl = card.querySelector('.comentario-imagen');
            if (imgEl) {
                imgEl.addEventListener('click', () => abrirVisor(c.ImagenUrl));
            }

            if (puedeBorrar) {
                const btnBorrar = card.querySelector('.btn-borrar-comentario');
                btnBorrar.addEventListener('click', async () => {
                    const confirmar = confirm('¿Deseas eliminar este comentario?');
                    if (!confirmar) return;

                    try {
                        const deleteRes = await fetch(`${API_URL}/comentarios/${c.Id}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}&solicitanteNombre=${encodeURIComponent(usuarioSesion.NombreVisible)}`, {
                            method: 'DELETE'
                        });

                        if (deleteRes.ok) {
                            cargarComentarios(amigoId);
                        } else {
                            const data = await deleteRes.json().catch(() => ({}));
                            alert(data.error || 'No se pudo eliminar el comentario.');
                        }
                    } catch (err) {
                        console.error('Error al borrar comentario:', err);
                        alert('Error de conexión al eliminar.');
                    }
                });
            }

            listaComentariosEl.appendChild(card);
        });
    } catch (err) {
        console.error('Error al cargar comentarios:', err);
        listaComentariosEl.innerHTML = '<p class="sin-datos">Error al cargar comentarios.</p>';
    }
}

if (formComentario) {
    formComentario.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!amigoSeleccionadoId) return;

        const contenido = inputComentario.value.trim();
        const inputVid = formComentario.querySelector('.input-video-media-file');
        const tieneFoto = inputFotoComentario && inputFotoComentario.files && inputFotoComentario.files[0];
        const tieneVideo = inputVid && inputVid.files && inputVid.files[0];

        if (!contenido && !tieneFoto && !tieneVideo) return;

        const formData = new FormData();
        formData.append('amigoId', amigoSeleccionadoId);
        formData.append('autor', usuarioSesion.NombreVisible);
        formData.append('contenido', contenido || '');

        if (btnEnviarComentario) {
            btnEnviarComentario.disabled = true;
            btnEnviarComentario.textContent = 'Enviando...';
        }

        try {
            if (tieneVideo) {
                const formDataDrive = new FormData();
                formDataDrive.append('archivo', inputVid.files[0]);
                const resDrive = await fetch(`${API_URL}/media-drive`, { method: 'POST', body: formDataDrive });
                if (!resDrive.ok) throw new Error('Falló subida de video a Drive');
                const dataDrive = await resDrive.json();
                formData.append('imagenUrlDirecta', dataDrive.url);
            } else if (tieneFoto) {
                formData.append('imagenComentario', inputFotoComentario.files[0]);
            }

            const res = await fetch(`${API_URL}/comentarios`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                inputComentario.value = '';
                limpiarAdjuntoComentario();
                if (inputVid) {
                    inputVid.value = '';
                    const span = inputVid.parentElement.querySelector('.nombre-archivo-video');
                    if (span) span.textContent = '';
                }
                cargarComentarios(amigoSeleccionadoId);
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'No se pudo publicar el comentario.');
            }
        } catch (err) {
            console.error('Error al enviar comentario:', err);
            alert('Error de conexión al enviar comentario.');
        } finally {
            if (btnEnviarComentario) {
                btnEnviarComentario.disabled = false;
                btnEnviarComentario.textContent = 'Enviar comentario';
            }
        }
    });
}

// ================= GESTIÓN DEL MURO GLOBAL (INICIO) =================
if (inputFotoPostGlobal) {
    inputFotoPostGlobal.addEventListener('change', () => {
        if (inputFotoPostGlobal.files && inputFotoPostGlobal.files[0]) {
            labelFotoPostGlobal.textContent = `📎 ${inputFotoPostGlobal.files[0].name}`;
            labelFotoPostGlobal.classList.remove('oculto');
            btnQuitarFotoPostGlobal.classList.remove('oculto');
        }
    });
}

if (btnQuitarFotoPostGlobal) {
    btnQuitarFotoPostGlobal.addEventListener('click', () => {
        inputFotoPostGlobal.value = '';
        labelFotoPostGlobal.textContent = '';
        labelFotoPostGlobal.classList.add('oculto');
        btnQuitarFotoPostGlobal.classList.add('oculto');
    });
}

async function cargarPostsGlobales() {
    if (!feedGlobalPosts) return;
    feedGlobalPosts.innerHTML = '<p class="cargando">Cargando publicaciones...</p>';
    try {
        const res = await fetch(`${API_URL}/publicaciones-globales`);
        const posts = await res.json();
        feedGlobalPosts.innerHTML = '';

        if (!Array.isArray(posts) || posts.length === 0) {
            feedGlobalPosts.innerHTML = '<p class="sin-datos">No hay publicaciones aún. ¡Sé el primero en escribir!</p>';
            return;
        }

        posts.forEach(p => {
            const esAdmin = usuarioSesion && usuarioSesion.RolApp === 'Admin';
            const esAutor = usuarioSesion && usuarioSesion.NombreVisible === p.Autor;
            const peutBorrar = esAdmin || esAutor;

            const card = document.createElement('div');
            card.className = 'comentario-item';
            
            let mediaHtml = p.ImagenUrl ? renderizarMultimedia(p.ImagenUrl) : '';
            
            card.innerHTML = `
                <div class="comentario-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="comentario-autor">${p.Autor}</span>
                        <span class="comentario-fecha">${new Date(p.Fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                    ${peutBorrar ? `<button class="btn-borrar-post-global" data-id="${p.Id}" title="Eliminar publicación" style="background: none; border: none; cursor: pointer; color: #ed4245; font-size: 14px;">🗑️</button>` : ''}
                </div>
                <p class="comentario-texto">${p.Texto}</p>
                ${mediaHtml}
            `;

            const imgEl = card.querySelector('.comentario-imagen');
            if (imgEl) imgEl.addEventListener('click', () => abrirVisor(p.ImagenUrl));

            if (peutBorrar) {
                const btnB = card.querySelector('.btn-borrar-post-global');
                btnB.addEventListener('click', async () => {
                    if (!confirm('¿Deseas eliminar esta publicación?')) return;
                    await fetch(`${API_URL}/publicaciones-globales/${p.Id}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}&solicitanteNombre=${encodeURIComponent(usuarioSesion.NombreVisible)}`, {
                        method: 'DELETE'
                    });
                    cargarPostsGlobales();
                });
            }

            feedGlobalPosts.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        feedGlobalPosts.innerHTML = '<p class="sin-datos">Error al cargar publicaciones.</p>';
    }
}

if (formPostGlobal) {
    formPostGlobal.addEventListener('submit', async (e) => {
        e.preventDefault();
        const texto = inputPostGlobal.value.trim();
        const inputVid = formPostGlobal.querySelector('.input-video-media-file');
        const tieneFoto = inputFotoPostGlobal && inputFotoPostGlobal.files && inputFotoPostGlobal.files[0];
        const tieneVideo = inputVid && inputVid.files && inputVid.files[0];

        if (!texto && !tieneFoto && !tieneVideo) return;

        const formData = new FormData();
        formData.append('autor', usuarioSesion.NombreVisible);
        formData.append('contenido', texto || '');

        if (btnEnviarPostGlobal) {
            btnEnviarPostGlobal.disabled = true;
            btnEnviarPostGlobal.textContent = 'Publicando...';
        }

        try {
            if (tieneVideo) {
                const formDataDrive = new FormData();
                formDataDrive.append('archivo', inputVid.files[0]);
                const resDrive = await fetch(`${API_URL}/media-drive`, { method: 'POST', body: formDataDrive });
                if (!resDrive.ok) throw new Error('Falló subida de video a Drive');
                const dataDrive = await resDrive.json();
                formData.append('imagenUrlDirecta', dataDrive.url);
            } else if (tieneFoto) {
                formData.append('imagenPost', inputFotoPostGlobal.files[0]);
            }

            const res = await fetch(`${API_URL}/publicaciones-globales`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                inputPostGlobal.value = '';
                if (btnQuitarFotoPostGlobal) btnQuitarFotoPostGlobal.click();
                if (inputVid) {
                    inputVid.value = '';
                    const span = inputVid.parentElement.querySelector('.nombre-archivo-video');
                    if (span) span.textContent = '';
                }
                cargarPostsGlobales();
            } else {
                alert('No se pudo enviar la publicación.');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión al publicar.');
        } finally {
            if (btnEnviarPostGlobal) {
                btnEnviarPostGlobal.disabled = false;
                btnEnviarPostGlobal.textContent = 'Publicar';
            }
        }
    });
}
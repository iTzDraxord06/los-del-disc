const API_URL = '/api';

let postRespondiendoId = null;

const formPostGlobal = document.getElementById('formPostGlobal');
const inputPostGlobal = document.getElementById('inputPostGlobal');
const inputFotoPostGlobal = document.getElementById('inputFotoPostGlobal');
const labelFotoPostGlobal = document.getElementById('labelFotoPostGlobal');
const btnQuitarFotoPostGlobal = document.getElementById('btnQuitarFotoPostGlobal');
const feedGlobalPosts = document.getElementById('feedGlobalPosts');
const btnEnviarPostGlobal = document.getElementById('btnEnviarPostGlobal');

const bannerRespuestaGlobal = document.getElementById('bannerRespuestaGlobal');
const textoRespondiendoGlobal = document.getElementById('textoRespondiendoGlobal');
const btnCancelarRespuestaGlobal = document.getElementById('btnCancelarRespuestaGlobal');

// Visor Lightbox
const modalVisor = document.getElementById('modalVisor');
const imagenVisorAmpliada = document.getElementById('imagenVisorAmpliada');
const btnCerrarVisor = document.getElementById('btnCerrarVisor');

function abrirVisor(url) {
    if (!url) return;
    imagenVisorAmpliada.src = url;
    modalVisor.classList.remove('oculto');
}

function cerrarVisor() {
    if (!modalVisor) return;
    modalVisor.classList.add('oculto');
    imagenVisorAmpliada.src = '';
}

if (btnCerrarVisor) btnCerrarVisor.addEventListener('click', cerrarVisor);
if (modalVisor) {
    modalVisor.addEventListener('click', (e) => {
        if (e.target === modalVisor) cerrarVisor();
    });
}

// Adjuntar imagen al post
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

function cancelarRespuestaGlobal() {
    postRespondiendoId = null;
    if (bannerRespuestaGlobal) bannerRespuestaGlobal.classList.add('oculto');
    if (inputPostGlobal) inputPostGlobal.placeholder = "¿Qué está pasando en el server? Escribe algo para todos...";
}

if (btnCancelarRespuestaGlobal) btnCancelarRespuestaGlobal.addEventListener('click', cancelarRespuestaGlobal);

// Cargar posts comunitarios
async function cargarPostsGlobales() {
    if (!feedGlobalPosts) return;
    feedGlobalPosts.innerHTML = '<p class="cargando">Cargando publicaciones...</p>';
    
    try {
        const res = await fetch(`${API_URL}/publicaciones-globales`);
        
        if (!res.ok) {
            throw new Error(`Servidor devolvió status ${res.status}`);
        }

        const rawData = await res.json();
        const posts = Array.isArray(rawData) ? rawData : [];

        feedGlobalPosts.innerHTML = '';

        if (posts.length === 0) {
            feedGlobalPosts.innerHTML = '<p class="sin-datos">No hay publicaciones aún. ¡Sé el primero en escribir!</p>';
            return;
        }

        const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};
        const esAdmin = usuarioActual.RolApp === 'Admin';
        
        const principales = posts.filter(p => !p.RespuestaAId);
        const respuestas = posts.filter(p => p.RespuestaAId);

        function crearNodoPost(p, esHijo = false) {
            const esAutor = usuarioActual.NombreVisible && usuarioActual.NombreVisible === p.Autor;
            const puedeBorrar = esAdmin || esAutor;
            const fechaStr = p.Fecha ? new Date(p.Fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente';

            const card = document.createElement('div');
            card.className = `comentario-item ${esHijo ? 'comentario-hijo' : ''}`;

            let imgHtml = p.ImagenUrl ? `<img src="${p.ImagenUrl}" class="comentario-imagen" alt="Foto post" style="cursor: pointer;">` : '';

            card.innerHTML = `
                <div class="comentario-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="comentario-autor">${p.Autor || 'Anónimo'}</span>
                        <span class="comentario-fecha">${fechaStr}</span>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="btn-responder-comentario" data-id="${p.Id}" data-autor="${p.Autor}">↩ Responder</button>
                        ${puedeBorrar ? `<button class="btn-borrar-post-global" data-id="${p.Id}" title="Eliminar" style="background: none; border: none; cursor: pointer; color: #ff3366; font-size: 14px;">🗑️</button>` : ''}
                    </div>
                </div>
                <p class="comentario-texto">${p.Texto || ''}</p>
                ${imgHtml}
            `;

            const imgEl = card.querySelector('.comentario-imagen');
            if (imgEl) imgEl.addEventListener('click', () => abrirVisor(p.ImagenUrl));

            const btnResp = card.querySelector('.btn-responder-comentario');
            btnResp.addEventListener('click', () => {
                postRespondiendoId = p.Id;
                textoRespondiendoGlobal.textContent = `@${p.Autor}`;
                bannerRespuestaGlobal.classList.remove('oculto');
                inputPostGlobal.focus();
                inputPostGlobal.placeholder = `Respondiendo a @${p.Autor}...`;
            });

            if (puedeBorrar) {
                const btnB = card.querySelector('.btn-borrar-post-global');
                btnB.addEventListener('click', async () => {
                    if (!confirm('¿Deseas eliminar esta publicación?')) return;
                    await fetch(`${API_URL}/publicaciones-globales/${p.Id}?rolSolicitante=${encodeURIComponent(usuarioActual.RolApp || '')}&solicitanteNombre=${encodeURIComponent(usuarioActual.NombreVisible || '')}`, {
                        method: 'DELETE'
                    });
                    cargarPostsGlobales();
                });
            }

            return card;
        }

        principales.forEach(padre => {
            const wrapper = document.createElement('div');
            wrapper.className = 'comentario-wrapper';
            wrapper.appendChild(crearNodoPost(padre, false));

            const hijos = respuestas.filter(r => r.RespuestaAId === padre.Id);
            hijos.forEach(hijo => wrapper.appendChild(crearNodoPost(hijo, true)));

            feedGlobalPosts.appendChild(wrapper);
        });

    } catch (err) {
        console.error('Error detallado en muro.js:', err);
        feedGlobalPosts.innerHTML = '<p class="sin-datos">No se pudieron cargar las publicaciones. Verifica la conexión.</p>';
    }
}

if (formPostGlobal) {
    formPostGlobal.addEventListener('submit', async (e) => {
        e.preventDefault();
        const texto = inputPostGlobal.value.trim();
        if (!texto) return;

        const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};

        const formData = new FormData();
        formData.append('autor', usuarioActual.NombreVisible || 'Miembro');
        formData.append('contenido', texto);
        if (postRespondiendoId) formData.append('respuestaAId', postRespondiendoId);
        if (inputFotoPostGlobal && inputFotoPostGlobal.files && inputFotoPostGlobal.files[0]) {
            formData.append('imagenPost', inputFotoPostGlobal.files[0]);
        }

        if (btnEnviarPostGlobal) {
            btnEnviarPostGlobal.disabled = true;
            btnEnviarPostGlobal.textContent = 'Publicando...';
        }

        try {
            const res = await fetch(`${API_URL}/publicaciones-globales`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                inputPostGlobal.value = '';
                if (btnQuitarFotoPostGlobal) btnQuitarFotoPostGlobal.click();
                cancelarRespuestaGlobal();
                cargarPostsGlobales();
            } else {
                alert('No se pudo enviar la publicación.');
            }
        } catch (err) {
            console.error(err);
            alert('Error al publicar.');
        } finally {
            if (btnEnviarPostGlobal) {
                btnEnviarPostGlobal.disabled = false;
                btnEnviarPostGlobal.textContent = 'Publicar';
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', cargarPostsGlobales);
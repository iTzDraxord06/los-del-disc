const API_URL = '/api';

let formPostGlobal, inputPostGlobal, inputFotoPostGlobal, inputVideoPostGlobal;
let labelFotoPostGlobal, btnQuitarFotoPostGlobal, feedGlobalPosts, btnEnviarPostGlobal;
let modalVisor, imagenVisorAmpliada, btnCerrarVisor;
let controller = null;
let parametrosActuales = {};
let timers = [];

function usuario() {
    try {
        return JSON.parse(localStorage.getItem('disc_user')) || {};
    } catch {
        return {};
    }
}

function esVideoDrive(url) {
    return typeof url === 'string' && url.includes('drive.google.com');
}

function renderizarMultimedia(url, alt = 'Multimedia') {
    if (!url) return '';
    if (esVideoDrive(url)) {
        const match = url.match(/[?&]id=([^&]+)/);
        if (!match) return '';
        return `<video class="media-reproductor" controls preload="metadata" playsinline><source src="${API_URL}/media-drive/${match[1]}" type="video/mp4">Tu navegador no soporta reproducción de video.</video>`;
    }
    return `<img src="${url}" class="comentario-imagen" alt="${alt}" style="cursor:pointer;">`;
}

async function subirVideoDrive(file) {
    if (!file) return null;
    if (file.size > 30 * 1024 * 1024) throw new Error('El video no puede superar los 30 MB.');

    const fd = new FormData();
    fd.append('archivo', file);

    const res = await fetch(`${API_URL}/media-drive`, {
        method: 'POST',
        body: fd
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo subir el video a Google Drive.');

    return data.url;
}

function abrirVisor(url) {
    if (!url || esVideoDrive(url) || !modalVisor) return;
    imagenVisorAmpliada.src = url;
    modalVisor.classList.remove('oculto');
}

function cerrarVisor() {
    if (!modalVisor) return;
    modalVisor.classList.add('oculto');
    imagenVisorAmpliada.src = '';
}

function limpiarFoto() {
    if (inputFotoPostGlobal) inputFotoPostGlobal.value = '';
    if (labelFotoPostGlobal) {
        labelFotoPostGlobal.textContent = '';
        labelFotoPostGlobal.classList.add('oculto');
    }
    btnQuitarFotoPostGlobal?.classList.add('oculto');
}

function resaltarPost() {
    const id = parametrosActuales.scrollPost;
    if (!id) return;

    const timer = setTimeout(() => {
        const el = document.getElementById(`post-${id}`);
        if (!el) return;

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background-color .5s ease,box-shadow .5s ease';
        el.style.backgroundColor = 'rgba(0,229,255,.22)';
        el.style.boxShadow = '0 0 18px rgba(0,229,255,.4)';

        const t = setTimeout(() => {
            if (!el.isConnected) return;
            el.style.backgroundColor = '';
            el.style.boxShadow = '';
        }, 3000);

        timers.push(t);
    }, 600);

    timers.push(timer);
}

async function borrarPost(post) {
    const u = usuario();

    if (!confirm('¿Deseas eliminar esta publicación?')) return;

    const res = await fetch(
        `${API_URL}/publicaciones-globales/${post.Id}?rolSolicitante=${encodeURIComponent(u.RolApp || '')}&solicitanteNombre=${encodeURIComponent(u.NombreVisible || '')}`,
        { method: 'DELETE' }
    );

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'No se pudo eliminar la publicación.');
        return;
    }

    await cargarPostsGlobales();
}

async function editarPost(post, textoEl, caja, textarea, btnGuardar) {
    const nuevoTexto = textarea.value.trim();
    if (!nuevoTexto) return;

    const u = usuario();

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        const res = await fetch(`${API_URL}/publicaciones-globales/${post.Id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                texto: nuevoTexto,
                rolSolicitante: u.RolApp,
                solicitanteNombre: u.NombreVisible
            })
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.error || 'No se pudo guardar la edición.');
            return;
        }

        textoEl.textContent = nuevoTexto;
        caja.classList.add('oculto');
        textoEl.classList.remove('oculto');
    } catch (error) {
        console.error(error);
        alert('Error al guardar edición.');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
    }
}

function crearNodoPost(post, esHijo = false, padreId = null) {
    const u = usuario();
    const esAdmin = u.RolApp === 'Admin';
    const esAutor = u.NombreVisible && u.NombreVisible === post.Autor;
    const puedeGestionar = esAdmin || esAutor;

    const fecha = post.Fecha
        ? new Date(post.Fecha).toLocaleString('es-ES', {
            dateStyle: 'short',
            timeStyle: 'short'
        })
        : 'Reciente';

    const card = document.createElement('div');
    card.className = `comentario-item ${esHijo ? 'comentario-hijo' : ''}`;
    card.id = `post-${post.Id}`;

    card.innerHTML = `
        <div class="comentario-header" style="display:flex;justify-content:space-between;align-items:center;">
            <div>
                <span class="comentario-autor">${post.Autor || 'Anónimo'}</span>
                <span class="comentario-fecha">${fecha}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button class="btn-responder-comentario">↩ Responder</button>
                ${puedeGestionar ? '<button class="btn-editar-post" style="background:none;border:none;cursor:pointer;color:#00e5ff;font-size:13px;">✏️</button>' : ''}
                ${puedeGestionar ? '<button class="btn-borrar-post-global" style="background:none;border:none;cursor:pointer;color:#ff3366;font-size:14px;">🗑️</button>' : ''}
            </div>
        </div>
        <p class="comentario-texto" id="texto-post-${post.Id}">${post.Texto || ''}</p>
        ${post.ImagenUrl ? renderizarMultimedia(post.ImagenUrl, 'Multimedia del post') : ''}
        <div class="contenedor-edicion oculto" id="edicion-post-${post.Id}" style="margin-top:8px;">
            <textarea class="textarea-edicion" style="width:100%;min-height:60px;background:#0e1015;color:#fff;border:1px solid #00e5ff;border-radius:6px;padding:6px;font-size:.88rem;"></textarea>
            <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:4px;">
                <button class="btn-secundario btn-cancelar-edicion" type="button">Cancelar</button>
                <button class="btn-primary btn-guardar-edicion" type="button">Guardar</button>
            </div>
        </div>
    `;

    const img = card.querySelector('.comentario-imagen');

    img?.addEventListener('click', () => abrirVisor(post.ImagenUrl), {
        signal: controller.signal
    });

    card.querySelector('.btn-responder-comentario')?.addEventListener('click', () => {
        abrirCajaRespuesta(esHijo ? padreId : post.Id, post.Autor);
    }, { signal: controller.signal });

    if (puedeGestionar) {
        const btnEditar = card.querySelector('.btn-editar-post');
        const btnBorrar = card.querySelector('.btn-borrar-post-global');
        const texto = card.querySelector(`#texto-post-${post.Id}`);
        const caja = card.querySelector(`#edicion-post-${post.Id}`);
        const textarea = caja.querySelector('.textarea-edicion');
        const btnCancelar = caja.querySelector('.btn-cancelar-edicion');
        const btnGuardar = caja.querySelector('.btn-guardar-edicion');

        btnEditar.addEventListener('click', () => {
            textarea.value = texto.textContent;
            caja.classList.remove('oculto');
            texto.classList.add('oculto');
            textarea.focus();
        }, { signal: controller.signal });

        btnCancelar.addEventListener('click', () => {
            caja.classList.add('oculto');
            texto.classList.remove('oculto');
        }, { signal: controller.signal });

        btnGuardar.addEventListener('click', () => {
            editarPost(post, texto, caja, textarea, btnGuardar);
        }, { signal: controller.signal });

        btnBorrar.addEventListener('click', () => borrarPost(post), {
            signal: controller.signal
        });
    }

    return card;
}

async function cargarPostsGlobales() {
    if (!feedGlobalPosts) return;

    feedGlobalPosts.innerHTML = '<p class="cargando">Cargando publicaciones...</p>';

    try {
        const res = await fetch(`${API_URL}/publicaciones-globales`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const posts = Array.isArray(data) ? data : [];

        feedGlobalPosts.innerHTML = '';

        if (!posts.length) {
            feedGlobalPosts.innerHTML = '<p class="sin-datos">No hay publicaciones aún. ¡Sé el primero en escribir!</p>';
            return;
        }

        const principales = posts.filter(p => !p.RespuestaAId);
        const respuestas = posts.filter(p => p.RespuestaAId).reverse();

        principales.forEach(padre => {
            const wrapper = document.createElement('div');
            wrapper.className = 'comentario-wrapper';
            wrapper.id = `wrapper-padre-${padre.Id}`;

            wrapper.appendChild(crearNodoPost(padre, false, padre.Id));

            respuestas
                .filter(r => Number(r.RespuestaAId) === Number(padre.Id))
                .forEach(hijo => wrapper.appendChild(crearNodoPost(hijo, true, padre.Id)));

            const inline = document.createElement('div');
            inline.id = `inline-reply-container-${padre.Id}`;
            inline.className = 'comentario-hijo oculto';
            inline.style.marginTop = '6px';

            wrapper.appendChild(inline);
            feedGlobalPosts.appendChild(wrapper);
        });

        resaltarPost();
    } catch (error) {
        console.error(error);
        if (feedGlobalPosts) {
            feedGlobalPosts.innerHTML = '<p class="sin-datos">Error al cargar publicaciones.</p>';
        }
    }
}

function abrirCajaRespuesta(padreId, autor) {
    document.querySelectorAll('[id^="inline-reply-container-"]').forEach(c => {
        c.innerHTML = '';
        c.classList.add('oculto');
    });

    const contenedor = document.getElementById(`inline-reply-container-${padreId}`);
    if (!contenedor) return;

    contenedor.classList.remove('oculto');

    contenedor.innerHTML = `
        <form class="form-respuesta-inline" style="background:#181b22;border:1px solid var(--accent-primary);border-radius:8px;padding:10px;">
            <div style="font-size:.78rem;color:#00e5ff;margin-bottom:6px;">Respondiendo a <strong>@${autor}</strong></div>
            <textarea class="input-inline-texto" placeholder="Escribe tu respuesta..." style="width:100%;min-height:55px;background:#0e1015;color:#fff;border:1px solid #242933;border-radius:6px;padding:8px;font-size:.88rem;resize:vertical;"></textarea>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;flex-wrap:wrap;gap:6px;">
                <div>
                    <label class="btn-secundario" style="cursor:pointer;padding:4px 8px;font-size:.78rem;">📷 Foto<input type="file" class="input-inline-file" accept="image/*" hidden></label>
                    <span class="inline-file-label"></span>
                </div>
                <div>
                    <label class="btn-secundario" style="cursor:pointer;padding:4px 8px;font-size:.78rem;">🎥 Video<input type="file" class="input-inline-video" accept="video/mp4,video/webm" hidden></label>
                    <span class="inline-video-label"></span>
                </div>
                <div style="display:flex;gap:6px;">
                    <button type="button" class="btn-secundario btn-cancelar-inline">Cancelar</button>
                    <button type="submit" class="btn-primary btn-enviar-inline">Responder</button>
                </div>
            </div>
        </form>
    `;

    const form = contenedor.querySelector('form');
    const texto = contenedor.querySelector('.input-inline-texto');
    const foto = contenedor.querySelector('.input-inline-file');
    const video = contenedor.querySelector('.input-inline-video');
    const labelFoto = contenedor.querySelector('.inline-file-label');
    const labelVideo = contenedor.querySelector('.inline-video-label');
    const btnCancelar = contenedor.querySelector('.btn-cancelar-inline');
    const btnEnviar = contenedor.querySelector('.btn-enviar-inline');

    texto.focus();

    foto.addEventListener('change', () => {
        labelFoto.textContent = foto.files[0] ? `📎 ${foto.files[0].name}` : '';
    }, { signal: controller.signal });

    video.addEventListener('change', () => {
        labelVideo.textContent = video.files[0] ? `🎥 ${video.files[0].name}` : '';
    }, { signal: controller.signal });

    btnCancelar.addEventListener('click', () => {
        contenedor.innerHTML = '';
        contenedor.classList.add('oculto');
    }, { signal: controller.signal });

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const contenido = texto.value.trim();
        const archivoFoto = foto.files?.[0];
        const archivoVideo = video.files?.[0];

        if (!contenido && !archivoFoto && !archivoVideo) return;

        const u = usuario();
        const fd = new FormData();

        fd.append('autor', u.NombreVisible || 'Miembro');
        fd.append('contenido', contenido);
        fd.append('respuestaAId', padreId);

        if (archivoFoto) fd.append('imagenPost', archivoFoto);

        btnEnviar.disabled = true;
        btnEnviar.textContent = 'Enviando...';

        try {
            if (archivoVideo) {
                const url = await subirVideoDrive(archivoVideo);
                fd.append('imagenUrlDirecta', url);
            }

            const res = await fetch(`${API_URL}/publicaciones-globales`, {
                method: 'POST',
                body: fd
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'No se pudo enviar la respuesta.');
            }

            await cargarPostsGlobales();
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Responder';
        }
    }, { signal: controller.signal });
}

async function publicarPost(e) {
    e.preventDefault();

    const texto = inputPostGlobal.value.trim();
    const foto = inputFotoPostGlobal?.files?.[0];
    const video = inputVideoPostGlobal?.files?.[0];

    if (!texto && !foto && !video) return;

    const u = usuario();
    const fd = new FormData();

    fd.append('autor', u.NombreVisible || 'Miembro');
    fd.append('contenido', texto);

    if (foto) fd.append('imagenPost', foto);

    btnEnviarPostGlobal.disabled = true;
    btnEnviarPostGlobal.textContent = 'Publicando...';

    try {
        if (video) {
            const url = await subirVideoDrive(video);
            fd.append('imagenUrlDirecta', url);
        }

        const res = await fetch(`${API_URL}/publicaciones-globales`, {
            method: 'POST',
            body: fd
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'No se pudo enviar la publicación.');
        }

        inputPostGlobal.value = '';
        limpiarFoto();

        if (inputVideoPostGlobal) {
            inputVideoPostGlobal.value = '';
            const span = inputVideoPostGlobal.parentElement?.querySelector('.nombre-archivo-video');
            if (span) span.textContent = '';
        }

        await cargarPostsGlobales();
    } catch (error) {
        console.error(error);
        alert(error.message);
    } finally {
        btnEnviarPostGlobal.disabled = false;
        btnEnviarPostGlobal.textContent = 'Publicar';
    }
}

export async function init(parametros = {}) {
    destroy();

    controller = new AbortController();
    parametrosActuales = parametros;

    formPostGlobal = document.getElementById('formPostGlobal');
    inputPostGlobal = document.getElementById('inputPostGlobal');
    inputFotoPostGlobal = document.getElementById('inputFotoPostGlobal');
    inputVideoPostGlobal = document.getElementById('inputVideoPostGlobal');
    labelFotoPostGlobal = document.getElementById('labelFotoPostGlobal');
    btnQuitarFotoPostGlobal = document.getElementById('btnQuitarFotoPostGlobal');
    feedGlobalPosts = document.getElementById('feedGlobalPosts');
    btnEnviarPostGlobal = document.getElementById('btnEnviarPostGlobal');
    modalVisor = document.getElementById('modalVisor');
    imagenVisorAmpliada = document.getElementById('imagenVisorAmpliada');
    btnCerrarVisor = document.getElementById('btnCerrarVisor');

    if (!formPostGlobal || !feedGlobalPosts) return;

    inputFotoPostGlobal?.addEventListener('change', () => {
        const file = inputFotoPostGlobal.files?.[0];

        if (file) {
            labelFotoPostGlobal.textContent = `📎 ${file.name}`;
            labelFotoPostGlobal.classList.remove('oculto');
            btnQuitarFotoPostGlobal.classList.remove('oculto');
        }
    }, { signal: controller.signal });

    inputVideoPostGlobal?.addEventListener('change', () => {
        const span = inputVideoPostGlobal.parentElement?.querySelector('.nombre-archivo-video');
        if (span) {
            span.textContent = inputVideoPostGlobal.files?.[0]
                ? `🎥 ${inputVideoPostGlobal.files[0].name}`
                : '';
        }
    }, { signal: controller.signal });

    btnQuitarFotoPostGlobal?.addEventListener('click', limpiarFoto, {
        signal: controller.signal
    });

    btnCerrarVisor?.addEventListener('click', cerrarVisor, {
        signal: controller.signal
    });

    modalVisor?.addEventListener('click', e => {
        if (e.target === modalVisor) cerrarVisor();
    }, { signal: controller.signal });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') cerrarVisor();
    }, { signal: controller.signal });

    formPostGlobal.addEventListener('submit', publicarPost, {
        signal: controller.signal
    });

    await cargarPostsGlobales();
}

export function destroy() {
    controller?.abort();
    controller = null;

    timers.forEach(clearTimeout);
    timers = [];

    document.querySelectorAll('#appContenido video').forEach(video => {
        video.pause();
        video.removeAttribute('src');
        video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
        video.load();
    });

    parametrosActuales = {};
}
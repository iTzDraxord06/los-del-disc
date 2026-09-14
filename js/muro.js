var API_URL = window.API_URL || '/api';

const formPostGlobal = document.getElementById('formPostGlobal');
const inputPostGlobal = document.getElementById('inputPostGlobal');
const inputFotoPostGlobal = document.getElementById('inputFotoPostGlobal');
const labelFotoPostGlobal = document.getElementById('labelFotoPostGlobal');
const btnQuitarFotoPostGlobal = document.getElementById('btnQuitarFotoPostGlobal');
const feedGlobalPosts = document.getElementById('feedGlobalPosts');
const btnEnviarPostGlobal = document.getElementById('btnEnviarPostGlobal');

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

// Adjunto en el post principal
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

// Cargar posts comunitarios con caja de respuesta inline y edición
async function cargarPostsGlobales() {
    if (!feedGlobalPosts) return;
    feedGlobalPosts.innerHTML = '<p class="cargando">Cargando publicaciones...</p>';

    try {
        const res = await fetch(`${API_URL}/publicaciones-globales`);
        if (!res.ok) throw new Error(`Status ${res.status}`);

        const rawData = await res.json();
        const posts = Array.isArray(rawData) ? rawData : [];

        feedGlobalPosts.innerHTML = '';

        if (posts.length === 0) {
            feedGlobalPosts.innerHTML = '<p class="sin-datos">No hay publicaciones aún. ¡Sé el primero en escribir!</p>';
            return;
        }

        const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};
        const esAdmin = usuarioActual.RolApp === 'Admin';

        // Publicaciones principales (más recientes arriba)
        const principales = posts.filter(p => !p.RespuestaAId);
        // Respuestas en orden cronológico debajo del padre
        const respuestas = posts.filter(p => p.RespuestaAId).reverse();

        function crearNodoPost(p, esHijo = false, padreId = null) {
            const esAutor = usuarioActual.NombreVisible && usuarioActual.NombreVisible === p.Autor;
            const puedeGestionar = esAdmin || esAutor;
            const fechaStr = p.Fecha ? new Date(p.Fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente';

            const card = document.createElement('div');
            card.className = `comentario-item ${esHijo ? 'comentario-hijo' : ''}`;
            card.id = `post-${p.Id}`;

            let imgHtml = p.ImagenUrl ? `<img src="${p.ImagenUrl}" class="comentario-imagen" alt="Foto post" style="cursor: pointer;">` : '';

            card.innerHTML = `
                <div class="comentario-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="comentario-autor">${p.Autor || 'Anónimo'}</span>
                        <span class="comentario-fecha">${fechaStr}</span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn-responder-comentario" data-id="${p.Id}" data-autor="${p.Autor}">↩ Responder</button>
                        ${puedeGestionar ? `<button class="btn-editar-post" data-id="${p.Id}" title="Editar" style="background: none; border: none; cursor: pointer; color: #00e5ff; font-size: 13px;">✏️</button>` : ''}
                        ${puedeGestionar ? `<button class="btn-borrar-post-global" data-id="${p.Id}" title="Eliminar" style="background: none; border: none; cursor: pointer; color: #ff3366; font-size: 14px;">🗑️</button>` : ''}
                    </div>
                </div>
                <p class="comentario-texto" id="texto-post-${p.Id}">${p.Texto || ''}</p>
                ${imgHtml}
                <div class="contenedor-edicion oculto" id="edicion-post-${p.Id}" style="margin-top: 8px;">
                    <textarea class="textarea-edicion" style="width: 100%; min-height: 60px; background: #0e1015; color: #fff; border: 1px solid #00e5ff; border-radius: 6px; padding: 6px; font-size: 0.88rem;"></textarea>
                    <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 4px;">
                        <button class="btn-secundario btn-cancelar-edicion" style="padding: 3px 8px; font-size: 0.78rem;">Cancelar</button>
                        <button class="btn-primary btn-guardar-edicion" style="padding: 3px 10px; font-size: 0.78rem;">Guardar</button>
                    </div>
                </div>
            `;

            const imgEl = card.querySelector('.comentario-imagen');
            if (imgEl) imgEl.addEventListener('click', () => abrirVisor(p.ImagenUrl));

            // Botón Responder: Abre la caja de respuesta directamente abajo
            const btnResp = card.querySelector('.btn-responder-comentario');
            btnResp.addEventListener('click', () => {
                const targetPadreId = esHijo ? padreId : p.Id;
                abrirCajaRespuestaDirecta(targetPadreId, p.Autor);
            });

            // Botón Editar
            if (puedeGestionar) {
                const btnEdit = card.querySelector('.btn-editar-post');
                const textoEl = card.querySelector(`#texto-post-${p.Id}`);
                const cajaEdit = card.querySelector(`#edicion-post-${p.Id}`);
                const textareaEdit = cajaEdit.querySelector('.textarea-edicion');
                const btnCancelar = cajaEdit.querySelector('.btn-cancelar-edicion');
                const btnGuardar = cajaEdit.querySelector('.btn-guardar-edicion');

                btnEdit.addEventListener('click', () => {
                    textareaEdit.value = textoEl.textContent;
                    cajaEdit.classList.remove('oculto');
                    textoEl.classList.add('oculto');
                    textareaEdit.focus();
                });

                btnCancelar.addEventListener('click', () => {
                    cajaEdit.classList.add('oculto');
                    textoEl.classList.remove('oculto');
                });

                btnGuardar.addEventListener('click', async () => {
                    const nuevoTexto = textareaEdit.value.trim();
                    if (!nuevoTexto) return;

                    btnGuardar.disabled = true;
                    btnGuardar.textContent = 'Guardando...';

                    try {
                        const editRes = await fetch(`${API_URL}/publicaciones-globales/${p.Id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                texto: nuevoTexto,
                                rolSolicitante: usuarioActual.RolApp,
                                solicitanteNombre: usuarioActual.NombreVisible
                            })
                        });

                        if (editRes.ok) {
                            textoEl.textContent = nuevoTexto;
                            cajaEdit.classList.add('oculto');
                            textoEl.classList.remove('oculto');
                        } else {
                            alert('No se pudo guardar la edición.');
                        }
                    } catch (err) {
                        console.error(err);
                        alert('Error al guardar edición.');
                    } finally {
                        btnGuardar.disabled = false;
                        btnGuardar.textContent = 'Guardar';
                    }
                });

                // Botón Borrar
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
            wrapper.id = `wrapper-padre-${padre.Id}`;

            wrapper.appendChild(crearNodoPost(padre, false, padre.Id));

            const hijos = respuestas.filter(r => r.RespuestaAId === padre.Id);
            hijos.forEach(hijo => wrapper.appendChild(crearNodoPost(hijo, true, padre.Id)));

            // Contenedor reservado para la caja de respuesta inline
            const containerInline = document.createElement('div');
            containerInline.id = `inline-reply-container-${padre.Id}`;
            containerInline.className = 'comentario-hijo oculto';
            containerInline.style.marginTop = '6px';
            wrapper.appendChild(containerInline);

            feedGlobalPosts.appendChild(wrapper);
        });

        // Auto-scroll y highlight si viene desde una notificación del muro global
        const params = new URLSearchParams(window.location.search);
        const scrollPostId = params.get('scrollPost');
        if (scrollPostId) {
            setTimeout(() => {
                const el = document.getElementById(`post-${scrollPostId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.style.transition = 'background-color 0.5s ease, box-shadow 0.5s ease';
                    el.style.backgroundColor = 'rgba(0, 229, 255, 0.22)';
                    el.style.boxShadow = '0 0 18px rgba(0, 229, 255, 0.4)';
                    setTimeout(() => {
                        el.style.backgroundColor = '';
                        el.style.boxShadow = '';
                    }, 3000);
                }
            }, 600);
        }

    } catch (err) {
        console.error('Error en muro.js:', err);
        feedGlobalPosts.innerHTML = '<p class="sin-datos">Error al cargar publicaciones.</p>';
    }
}

// Función para abrir la caja de texto directamente en la respuesta
function abrirCajaRespuestaDirecta(padreId, autorMencion) {
    document.querySelectorAll('[id^="inline-reply-container-"]').forEach(c => {
        c.innerHTML = '';
        c.classList.add('oculto');
    });

    const contenedor = document.getElementById(`inline-reply-container-${padreId}`);
    if (!contenedor) return;

    contenedor.classList.remove('oculto');
    contenedor.innerHTML = `
        <form class="form-respuesta-inline" style="background: #181b22; border: 1px solid var(--accent-primary); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.78rem; color: #00e5ff; margin-bottom: 6px;">
                Respondiendo a <strong>@${autorMencion}</strong>
            </div>
            <textarea class="input-inline-texto" placeholder="Escribe tu respuesta..." required style="width: 100%; min-height: 55px; background: #0e1015; color: #fff; border: 1px solid #242933; border-radius: 6px; padding: 8px; font-size: 0.88rem; resize: vertical;"></textarea>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <label class="btn-secundario" style="cursor: pointer; padding: 4px 8px; font-size: 0.78rem;">
                        📷 Subir foto
                        <input type="file" class="input-inline-file" accept="image/*" style="display: none;">
                    </label>
                    <span class="inline-file-label" style="font-size: 0.75rem; color: #00e5ff;"></span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="btn-secundario btn-cancelar-inline" style="padding: 4px 10px; font-size: 0.8rem;">Cancelar</button>
                    <button type="submit" class="btn-primary btn-enviar-inline" style="padding: 4px 12px; font-size: 0.8rem;">Responder</button>
                </div>
            </div>
        </form>
    `;

    const form = contenedor.querySelector('.form-respuesta-inline');
    const inputTexto = contenedor.querySelector('.input-inline-texto');
    const inputFile = contenedor.querySelector('.input-inline-file');
    const labelFile = contenedor.querySelector('.inline-file-label');
    const btnCancelar = contenedor.querySelector('.btn-cancelar-inline');
    const btnEnviar = contenedor.querySelector('.btn-enviar-inline');

    inputTexto.focus();

    inputFile.addEventListener('change', () => {
        if (inputFile.files && inputFile.files[0]) {
            labelFile.textContent = `📎 ${inputFile.files[0].name}`;
        }
    });

    btnCancelar.addEventListener('click', () => {
        contenedor.innerHTML = '';
        contenedor.classList.add('oculto');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const texto = inputTexto.value.trim();
        if (!texto) return;

        const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};

        btnEnviar.disabled = true;
        btnEnviar.textContent = 'Enviando...';

        const formData = new FormData();
        formData.append('autor', usuarioActual.NombreVisible || 'Miembro');
        formData.append('contenido', texto);
        formData.append('respuestaAId', padreId);
        if (inputFile.files && inputFile.files[0]) {
            formData.append('imagenPost', inputFile.files[0]);
        }

        try {
            const res = await fetch(`${API_URL}/publicaciones-globales`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                contenedor.innerHTML = '';
                contenedor.classList.add('oculto');
                cargarPostsGlobales();
            } else {
                alert('No se pudo enviar la respuesta.');
            }
        } catch (err) {
            console.error(err);
            alert('Error al responder.');
        } finally {
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Responder';
        }
    });
}

// Formulario principal (crear post nuevo)
if (formPostGlobal) {
    formPostGlobal.addEventListener('submit', async (e) => {
        e.preventDefault();
        const texto = inputPostGlobal.value.trim();
        if (!texto) return;

        const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};

        const formData = new FormData();
        formData.append('autor', usuarioActual.NombreVisible || 'Miembro');
        formData.append('contenido', texto);
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
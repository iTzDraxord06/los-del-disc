var API_URL = window.API_URL || '/api';

let listaAmigosMemoria = [];
let amigoSeleccionado = null;
let amigoSeleccionadoId = null;

// Elementos de la vista central
const vistaGridMiembros = document.getElementById('vistaGridMiembros');
const gridCentralMiembros = document.getElementById('gridCentralMiembros');
const muroDetalleEl = document.getElementById('muroDetalle');
const btnVolverMiembros = document.getElementById('btnVolverMiembros');

const muroAvatar = document.getElementById('muroAvatar');
const muroApodo = document.getElementById('muroApodo');
const muroTag = document.getElementById('muroTag');
const muroRol = document.getElementById('muroRol');
const muroDesc = document.getElementById('muroDesc');
const btnEditarPerfil = document.getElementById('btnEditarPerfil');
const btnEliminarPerfil = document.getElementById('btnEliminarPerfil');
const gridWaifus = document.getElementById('gridWaifus');
const nombreAmigoMuro = document.getElementById('nombreAmigoMuro');

// Comentarios
const listaComentariosEl = document.getElementById('listaComentarios');
const formComentario = document.getElementById('formComentario');
const inputAutor = document.getElementById('inputAutor');
const inputComentario = document.getElementById('inputComentario');
const inputFotoComentario = document.getElementById('inputFotoComentario');
const labelNombreFotoComentario = document.getElementById('labelNombreFotoComentario');
const btnQuitarFotoComentario = document.getElementById('btnQuitarFotoComentario');
const btnEnviarComentario = document.getElementById('btnEnviarComentario');

// Modales
const modalAmigo = document.getElementById('modalAmigo');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const formNuevoAmigo = document.getElementById('formNuevoAmigo');
const modalTitulo = document.getElementById('modalTitulo');
const amigoEditId = document.getElementById('amigoEditId');
const btnGuardarAmigo = document.getElementById('btnGuardarAmigo');
const btnAbrirModal = document.getElementById('btnAbrirModal');
const campoRolServidor = document.getElementById('campoRolServidor');

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
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalVisor && !modalVisor.classList.contains('oculto')) {
        cerrarVisor();
    }
});

// Adjuntos en el comentario principal
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

if (btnQuitarFotoComentario) btnQuitarFotoComentario.addEventListener('click', limpiarAdjuntoComentario);

// Permisos iniciales
if (typeof usuarioSesion !== 'undefined' && usuarioSesion) {
    if (inputAutor) inputAutor.value = usuarioSesion.NombreVisible;
    if (usuarioSesion.RolApp === 'Admin' && btnAbrirModal) {
        btnAbrirModal.classList.remove('oculto');
    }
}

// ================= CARGAR TARJETAS EN EL CENTRO =================
async function cargarAmigos() {
    try {
        const res = await fetch(`${API_URL}/amigos`);
        listaAmigosMemoria = await res.json();
        gridCentralMiembros.innerHTML = '';

        if (!Array.isArray(listaAmigosMemoria) || listaAmigosMemoria.length === 0) {
            gridCentralMiembros.innerHTML = '<p class="sin-datos">No hay integrantes registrados.</p>';
            return;
        }

        listaAmigosMemoria.forEach(amigo => {
            const card = document.createElement('div');
            card.className = 'tarjeta-miembro-central';
            const avatar = amigo.AvatarUrl || 'imagenes/default.png';

            card.innerHTML = `
                <div class="tarjeta-miembro-header">
                    <img src="${avatar}" alt="${amigo.Apodo}">
                    <span class="badge-rol">${amigo.RolServidor || 'Miembro'}</span>
                </div>
                <div class="tarjeta-miembro-body">
                    <h3>${amigo.Apodo}</h3>
                    <span class="tag">@${amigo.DiscordUsername}</span>
                    <p class="desc">${amigo.Descripcion || 'Sin descripción todavía.'}</p>
                </div>
                <button class="btn-ver-perfil">Ver Perfil y Muro →</button>
            `;

            card.addEventListener('click', () => seleccionarAmigo(amigo));
            gridCentralMiembros.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        gridCentralMiembros.innerHTML = '<p class="sin-datos">Error al conectar con la base de datos.</p>';
    }
}

function seleccionarAmigo(amigo) {
    amigoSeleccionado = amigo;
    amigoSeleccionadoId = amigo.Id;

    vistaGridMiembros.classList.add('oculto');
    muroDetalleEl.classList.remove('oculto');

    muroAvatar.src = amigo.AvatarUrl || 'imagenes/default.png';
    muroApodo.textContent = amigo.Apodo;
    muroTag.textContent = `@${amigo.DiscordUsername}`;
    muroRol.textContent = amigo.RolServidor || 'Miembro';
    muroDesc.textContent = amigo.Descripcion || 'Sin biografía.';
    if (nombreAmigoMuro) nombreAmigoMuro.textContent = amigo.Apodo;

    const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};
    const esAdmin = usuarioActual.RolApp === 'Admin';
    const esDueno = amigo.UsuarioId && (amigo.UsuarioId === usuarioActual.Id);

    if (btnEditarPerfil) btnEditarPerfil.classList.toggle('oculto', !(esAdmin || esDueno));
    if (btnEliminarPerfil) btnEliminarPerfil.classList.toggle('oculto', !esAdmin);

    gridWaifus.innerHTML = '';
    const fotos = amigo.Fotos || [];

    fotos.forEach(item => {
        const urlFoto = typeof item === 'string' ? item : item.url;
        const idFoto = typeof item === 'object' ? item.id : null;

        const contenedor = document.createElement('div');
        contenedor.className = 'item-foto-galeria';

        const img = document.createElement('img');
        img.src = urlFoto;
        img.alt = 'Foto Galería';
        img.title = 'Haz clic para ampliar';
        img.addEventListener('click', () => abrirVisor(urlFoto));
        contenedor.appendChild(img);

        if ((esAdmin || esDueno) && idFoto) {
            const btnBorrar = document.createElement('button');
            btnBorrar.className = 'btn-eliminar-foto';
            btnBorrar.innerHTML = '🗑️';
            btnBorrar.title = 'Eliminar imagen';

            btnBorrar.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('¿Eliminar esta foto de la galería?')) return;
                try {
                    const res = await fetch(`${API_URL}/fotos/${idFoto}?rolSolicitante=${encodeURIComponent(usuarioActual.RolApp || '')}&solicitanteId=${usuarioActual.Id || ''}`, { method: 'DELETE' });
                    if (res.ok) {
                        const amRes = await fetch(`${API_URL}/amigos`);
                        listaAmigosMemoria = await amRes.json();
                        const actualizado = listaAmigosMemoria.find(a => a.Id === amigo.Id);
                        if (actualizado) seleccionarAmigo(actualizado);
                    } else {
                        const data = await res.json().catch(() => ({}));
                        alert(data.error || 'No se pudo eliminar la foto.');
                    }
                } catch (err) {
                    console.error(err);
                }
            });
            contenedor.appendChild(btnBorrar);
        }

        gridWaifus.appendChild(contenedor);
    });

    // Lógica Fade / Corte Galería (PC 3, Móvil 2)
    const contenedorFade = document.getElementById('contenedorFadeGaleria');
    const contenedorBoton = document.getElementById('contenedorBotonGaleria');
    const btnToggle = document.getElementById('btnToggleGaleria');
    const textoToggle = document.getElementById('textoToggleGaleria');

    const esPantallaMovil = window.innerWidth <= 768;
    const limiteCorte = esPantallaMovil ? 2 : 3;

    if (contenedorFade && contenedorBoton && btnToggle) {
        if (fotos.length > limiteCorte) {
            contenedorFade.classList.remove('expandido');
            contenedorFade.classList.add('colapsado');
            contenedorBoton.classList.remove('oculto');

            const fotosRestantes = fotos.length - limiteCorte;
            textoToggle.textContent = `▼ Ver más fotos (+${fotosRestantes})`;

            btnToggle.onclick = () => {
                const estaColapsado = contenedorFade.classList.contains('colapsado');
                if (estaColapsado) {
                    contenedorFade.classList.remove('colapsado');
                    contenedorFade.classList.add('expandido');
                    textoToggle.textContent = '▲ Ver menos fotos';
                } else {
                    contenedorFade.classList.remove('expandido');
                    contenedorFade.classList.add('colapsado');
                    textoToggle.textContent = `▼ Ver más fotos (+${fotosRestantes})`;
                }
            };
        } else {
            contenedorFade.classList.remove('colapsado');
            contenedorFade.classList.add('expandido');
            contenedorBoton.classList.add('oculto');
        }
    }

    limpiarAdjuntoComentario();
    cargarComentarios(amigo.Id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

if (btnVolverMiembros) {
    btnVolverMiembros.addEventListener('click', () => {
        muroDetalleEl.classList.add('oculto');
        vistaGridMiembros.classList.remove('oculto');
        amigoSeleccionadoId = null;
        amigoSeleccionado = null;
    });
}

// ================= COMENTARIOS CON HILOS Y EDICIÓN INLINE =================
async function cargarComentarios(amigoId) {
    listaComentariosEl.innerHTML = '<p class="cargando">Cargando comentarios...</p>';
    try {
        const res = await fetch(`${API_URL}/comentarios/${amigoId}`);
        const comentarios = await res.json();
        listaComentariosEl.innerHTML = '';

        if (!Array.isArray(comentarios) || comentarios.length === 0) {
            listaComentariosEl.innerHTML = '<p class="sin-datos">Nadie ha comentado aún. ¡Sé el primero!</p>';
            return;
        }

        const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};
        const esAdmin = usuarioActual.RolApp === 'Admin';

        const principales = comentarios.filter(c => !c.RespuestaAId);
        const respuestas = comentarios.filter(c => c.RespuestaAId).reverse();

        function crearNodoComentario(c, esHijo = false, padreId = null) {
            const rawFecha = c.Fecha || c.FechaPublicacion;
            const fechaStr = rawFecha ? new Date(rawFecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente';
            const esAutor = usuarioActual.NombreVisible === c.Autor;
            const puedeGestionar = esAdmin || esAutor;

            let imgHtml = c.ImagenUrl ? `<img src="${c.ImagenUrl}" class="comentario-imagen" alt="Foto comentario" style="cursor: pointer; margin-top: 8px;">` : '';

            const card = document.createElement('div');
            card.className = `comentario-item ${esHijo ? 'comentario-hijo' : ''}`;
            card.id = `comentario-${c.Id}`;

            card.innerHTML = `
                <div class="comentario-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="comentario-autor">${c.Autor}</span>
                        <span class="comentario-fecha">${fechaStr}</span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn-responder-comentario" data-id="${c.Id}" data-autor="${c.Autor}">↩ Responder</button>
                        ${puedeGestionar ? `<button class="btn-editar-comentario" data-id="${c.Id}" title="Editar" style="background:none; border:none; cursor:pointer; color:#00e5ff; font-size:13px;">✏️</button>` : ''}
                        ${puedeGestionar ? `<button class="btn-borrar-comentario" data-id="${c.Id}" title="Eliminar" style="background:none; border:none; cursor:pointer; color:#ff3366; font-size:14px;">🗑️</button>` : ''}
                    </div>
                </div>
                <p class="comentario-texto" id="texto-comentario-${c.Id}">${c.Texto || ''}</p>
                ${imgHtml}
                <div class="contenedor-edicion oculto" id="edicion-comentario-${c.Id}" style="margin-top: 8px;">
                    <textarea class="textarea-edicion" style="width: 100%; min-height: 60px; background: #0e1015; color: #fff; border: 1px solid #00e5ff; border-radius: 6px; padding: 6px; font-size: 0.88rem;"></textarea>
                    <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 4px;">
                        <button class="btn-secundario btn-cancelar-edicion" style="padding: 3px 8px; font-size: 0.78rem;">Cancelar</button>
                        <button class="btn-primary btn-guardar-edicion" style="padding: 3px 10px; font-size: 0.78rem;">Guardar</button>
                    </div>
                </div>
            `;

            const imgEl = card.querySelector('.comentario-imagen');
            if (imgEl) imgEl.addEventListener('click', () => abrirVisor(c.ImagenUrl));

            const btnResp = card.querySelector('.btn-responder-comentario');
            btnResp.addEventListener('click', () => {
                const targetPadreId = esHijo ? padreId : c.Id;
                abrirCajaRespuestaDirectaComentario(targetPadreId, c.Autor, amigoId);
            });

            if (puedeGestionar) {
                const btnEdit = card.querySelector('.btn-editar-comentario');
                const textoEl = card.querySelector(`#texto-comentario-${c.Id}`);
                const cajaEdit = card.querySelector(`#edicion-comentario-${c.Id}`);
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
                        const editRes = await fetch(`${API_URL}/comentarios/${c.Id}`, {
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

                const btnBorrar = card.querySelector('.btn-borrar-comentario');
                btnBorrar.addEventListener('click', async () => {
                    if (!confirm('¿Deseas eliminar este comentario?')) return;
                    await fetch(`${API_URL}/comentarios/${c.Id}?rolSolicitante=${encodeURIComponent(usuarioActual.RolApp || '')}&solicitanteNombre=${encodeURIComponent(usuarioActual.NombreVisible || '')}`, { method: 'DELETE' });
                    cargarComentarios(amigoId);
                });
            }

            return card;
        }

        principales.forEach(padre => {
            const wrapper = document.createElement('div');
            wrapper.className = 'comentario-wrapper';
            wrapper.id = `wrapper-comentario-${padre.Id}`;

            wrapper.appendChild(crearNodoComentario(padre, false, padre.Id));

            const hijos = respuestas.filter(r => r.RespuestaAId === padre.Id);
            hijos.forEach(hijo => wrapper.appendChild(crearNodoComentario(hijo, true, padre.Id)));

            const containerInline = document.createElement('div');
            containerInline.id = `inline-reply-comentario-${padre.Id}`;
            containerInline.className = 'comentario-hijo oculto';
            containerInline.style.marginTop = '6px';
            wrapper.appendChild(containerInline);

            listaComentariosEl.appendChild(wrapper);
        });

    } catch (err) {
        console.error(err);
        listaComentariosEl.innerHTML = '<p class="sin-datos">Error al cargar comentarios.</p>';
    }
}

function abrirCajaRespuestaDirectaComentario(padreId, autorMencion, amigoId) {
    document.querySelectorAll('[id^="inline-reply-comentario-"]').forEach(c => {
        c.innerHTML = '';
        c.classList.add('oculto');
    });

    const contenedor = document.getElementById(`inline-reply-comentario-${padreId}`);
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
        formData.append('amigoId', amigoId);
        formData.append('autor', usuarioActual.NombreVisible || 'Miembro');
        formData.append('contenido', texto);
        formData.append('respuestaAId', padreId);
        if (inputFile.files && inputFile.files[0]) {
            formData.append('imagenComentario', inputFile.files[0]);
        }

        try {
            const res = await fetch(`${API_URL}/comentarios`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                contenedor.innerHTML = '';
                contenedor.classList.add('oculto');
                cargarComentarios(amigoId);
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

if (formComentario) {
    formComentario.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!amigoSeleccionadoId) return;

        const contenido = inputComentario.value.trim();
        if (!contenido) return;

        const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};

        const formData = new FormData();
        formData.append('amigoId', amigoSeleccionadoId);
        formData.append('autor', usuarioActual.NombreVisible || 'Miembro');
        formData.append('contenido', contenido);
        if (inputFotoComentario && inputFotoComentario.files && inputFotoComentario.files[0]) {
            formData.append('imagenComentario', inputFotoComentario.files[0]);
        }

        if (btnEnviarComentario) {
            btnEnviarComentario.disabled = true;
            btnEnviarComentario.textContent = 'Enviando...';
        }

        try {
            const res = await fetch(`${API_URL}/comentarios`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                inputComentario.value = '';
                limpiarAdjuntoComentario();
                cargarComentarios(amigoSeleccionadoId);
            } else {
                alert('No se pudo publicar el comentario.');
            }
        } catch (err) {
            console.error(err);
            alert('Error al enviar el comentario.');
        } finally {
            if (btnEnviarComentario) {
                btnEnviarComentario.disabled = false;
                btnEnviarComentario.textContent = 'Enviar comentario';
            }
        }
    });
}

// ================= MODAL AMIGO =================
if (btnAbrirModal) {
    btnAbrirModal.addEventListener('click', () => {
        formNuevoAmigo.reset();
        amigoEditId.value = '';
        modalTitulo.textContent = 'Agregar Amigo';
        if (campoRolServidor) campoRolServidor.style.display = 'block';
        modalAmigo.classList.remove('oculto');
    });
}

if (btnCerrarModal) {
    btnCerrarModal.addEventListener('click', () => modalAmigo.classList.add('oculto'));
}

if (btnEditarPerfil) {
    btnEditarPerfil.addEventListener('click', () => {
        if (!amigoSeleccionado) return;
        amigoEditId.value = amigoSeleccionado.Id;
        document.getElementById('nuevoUsername').value = amigoSeleccionado.DiscordUsername;
        document.getElementById('nuevoApodo').value = amigoSeleccionado.Apodo;
        document.getElementById('nuevaDesc').value = amigoSeleccionado.Descripcion || '';

        const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};
        const esAdmin = usuarioActual.RolApp === 'Admin';
        
        if (campoRolServidor) {
            campoRolServidor.style.display = esAdmin ? 'block' : 'none';
            document.getElementById('nuevoRol').value = amigoSeleccionado.RolServidor || 'Miembro';
        }

        modalTitulo.textContent = `Editar perfil de ${amigoSeleccionado.Apodo}`;
        modalAmigo.classList.remove('oculto');
    });
}

formNuevoAmigo.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = amigoEditId.value;
    const formData = new FormData();
    const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};

    formData.append('discordUsername', document.getElementById('nuevoUsername').value.trim());
    formData.append('apodo', document.getElementById('nuevoApodo').value.trim());
    formData.append('rol', document.getElementById('nuevoRol') ? document.getElementById('nuevoRol').value.trim() : 'Miembro');
    formData.append('descripcion', document.getElementById('nuevaDesc').value.trim());
    formData.append('rolSolicitante', usuarioActual.RolApp || 'Lector');
    formData.append('solicitanteId', usuarioActual.Id);

    const avatarInput = document.getElementById('inputAvatarFile');
    if (avatarInput && avatarInput.files[0]) {
        formData.append('avatarFile', avatarInput.files[0]);
    } else if (id && amigoSeleccionado) {
        formData.append('avatarUrlActual', amigoSeleccionado.AvatarUrl || '');
    }

    const waifuInput = document.getElementById('inputWaifuFiles');
    if (waifuInput && waifuInput.files.length > 0) {
        for (let i = 0; i < waifuInput.files.length; i++) {
            formData.append('waifuFiles', waifuInput.files[i]);
        }
    }

    const url = id ? `${API_URL}/amigos/${id}` : `${API_URL}/amigos`;
    const metodo = id ? 'PUT' : 'POST';

    if (btnGuardarAmigo) {
        btnGuardarAmigo.disabled = true;
        btnGuardarAmigo.textContent = 'Guardando...';
    }

    try {
        const res = await fetch(url, { method: metodo, body: formData });
        const resp = await res.json().catch(() => ({}));

        if (res.ok) {
            modalAmigo.classList.add('oculto');
            formNuevoAmigo.reset();
            await cargarAmigos();
            if (id) {
                const amRes = await fetch(`${API_URL}/amigos`);
                listaAmigosMemoria = await amRes.json();
                const actual = listaAmigosMemoria.find(a => a.Id === parseInt(id));
                if (actual) seleccionarAmigo(actual);
            }
        } else {
            alert(resp.error || 'No se pudo guardar el perfil.');
        }
    } catch (err) {
        console.error(err);
        alert('Error al guardar el perfil.');
    } finally {
        if (btnGuardarAmigo) {
            btnGuardarAmigo.disabled = false;
            btnGuardarAmigo.textContent = 'Guardar';
        }
    }
});

if (btnEliminarPerfil) {
    btnEliminarPerfil.addEventListener('click', async () => {
        if (!amigoSeleccionadoId) return;
        if (!confirm(`¿Eliminar a ${amigoSeleccionado.Apodo}?`)) return;

        const usuarioActual = JSON.parse(localStorage.getItem('disc_user')) || {};
        try {
            const res = await fetch(`${API_URL}/amigos/${amigoSeleccionadoId}?rolSolicitante=${encodeURIComponent(usuarioActual.RolApp || '')}`, { method: 'DELETE' });
            if (res.ok) {
                muroDetalleEl.classList.add('oculto');
                vistaGridMiembros.classList.remove('oculto');
                amigoSeleccionadoId = null;
                amigoSeleccionado = null;
                cargarAmigos();
            }
        } catch (err) {
            console.error(err);
        }
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    await cargarAmigos();
    
    // Auto-scroll y highlight desde notificación de perfil
    const params = new URLSearchParams(window.location.search);
    const amigoQueryId = params.get('amigoId');
    const scrollComentarioId = params.get('scrollComentario');

    if (amigoQueryId) {
        const target = listaAmigosMemoria.find(a => a.Id === parseInt(amigoQueryId));
        if (target) seleccionarAmigo(target);
    }

    if (scrollComentarioId) {
        setTimeout(() => {
            const el = document.getElementById(`comentario-${scrollComentarioId}`);
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
        }, 900);
    }
});
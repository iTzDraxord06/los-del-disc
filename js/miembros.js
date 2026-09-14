const API_URL = '/api';

let listaAmigosMemoria = [];
let amigoSeleccionado = null;
let amigoSeleccionadoId = null;
let comentarioRespondiendoId = null;

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
const btnEnviarComentario = document.getElementById('btnEnviarComentario');
const bannerRespuesta = document.getElementById('bannerRespuesta');
const textoRespondiendoA = document.getElementById('textoRespondiendoA');
const btnCancelarRespuesta = document.getElementById('btnCancelarRespuesta');

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

// Permisos iniciales
if (usuarioSesion) {
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

    const esAdmin = usuarioSesion && usuarioSesion.RolApp === 'Admin';
    const esDueno = usuarioSesion && amigo.UsuarioId === usuarioSesion.Id;

    if (btnEditarPerfil) btnEditarPerfil.classList.toggle('oculto', !(esAdmin || esDueno));
    if (btnEliminarPerfil) btnEliminarPerfil.classList.toggle('oculto', !esAdmin);

    // Renderizar Galería
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
                    const res = await fetch(`${API_URL}/fotos/${idFoto}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}`, { method: 'DELETE' });
                    if (res.ok) {
                        const amRes = await fetch(`${API_URL}/amigos`);
                        listaAmigosMemoria = await amRes.json();
                        const actualizado = listaAmigosMemoria.find(a => a.Id === amigo.Id);
                        if (actualizado) seleccionarAmigo(actualizado);
                    }
                } catch (err) {
                    console.error(err);
                }
            });
            contenedor.appendChild(btnBorrar);
        }

        gridWaifus.appendChild(contenedor);
    });

    cancelarRespuesta();
    cargarComentarios(amigo.Id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Botón para regresar a la lista de tarjetas centrales
if (btnVolverMiembros) {
    btnVolverMiembros.addEventListener('click', () => {
        muroDetalleEl.classList.add('oculto');
        vistaGridMiembros.classList.remove('oculto');
        amigoSeleccionadoId = null;
        amigoSeleccionado = null;
    });
}

// ================= COMENTARIOS CON HILOS =================

function cancelarRespuesta() {
    comentarioRespondiendoId = null;
    if (bannerRespuesta) bannerRespuesta.classList.add('oculto');
    if (inputComentario) inputComentario.placeholder = "Escribe un comentario...";
}

if (btnCancelarRespuesta) btnCancelarRespuesta.addEventListener('click', cancelarRespuesta);

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

        const esAdmin = usuarioSesion && usuarioSesion.RolApp === 'Admin';
        const principales = comentarios.filter(c => !c.RespuestaAId);
        const respuestas = comentarios.filter(c => c.RespuestaAId);

        function crearNodoComentario(c, esHijo = false) {
            const rawFecha = c.Fecha || c.FechaPublicacion;
            const fechaStr = rawFecha ? new Date(rawFecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente';
            const esAutor = usuarioSesion && usuarioSesion.NombreVisible === c.Autor;
            const puedeBorrar = esAdmin || esAutor;

            const card = document.createElement('div');
            card.className = `comentario-item ${esHijo ? 'comentario-hijo' : ''}`;
            card.innerHTML = `
                <div class="comentario-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="comentario-autor">${c.Autor}</span>
                        <span class="comentario-fecha">${fechaStr}</span>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="btn-responder-comentario" data-id="${c.Id}" data-autor="${c.Autor}">↩ Responder</button>
                        ${puedeBorrar ? `<button class="btn-borrar-comentario" data-id="${c.Id}" title="Eliminar" style="background:none; border:none; cursor:pointer; color:#ff3366; font-size:14px;">🗑️</button>` : ''}
                    </div>
                </div>
                <p class="comentario-texto">${c.Texto || ''}</p>
            `;

            const btnResp = card.querySelector('.btn-responder-comentario');
            btnResp.addEventListener('click', () => {
                comentarioRespondiendoId = c.Id;
                textoRespondiendoA.textContent = `@${c.Autor}`;
                bannerRespuesta.classList.remove('oculto');
                inputComentario.focus();
                inputComentario.placeholder = `Respondiendo a @${c.Autor}...`;
            });

            if (puedeBorrar) {
                const btnBorrar = card.querySelector('.btn-borrar-comentario');
                btnBorrar.addEventListener('click', async () => {
                    if (!confirm('¿Deseas eliminar este comentario?')) return;
                    await fetch(`${API_URL}/comentarios/${c.Id}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}&solicitanteNombre=${encodeURIComponent(usuarioSesion.NombreVisible)}`, { method: 'DELETE' });
                    cargarComentarios(amigoId);
                });
            }

            return card;
        }

        principales.forEach(padre => {
            const wrapper = document.createElement('div');
            wrapper.className = 'comentario-wrapper';
            wrapper.appendChild(crearNodoComentario(padre, false));

            const hijos = respuestas.filter(r => r.RespuestaAId === padre.Id);
            hijos.forEach(hijo => wrapper.appendChild(crearNodoComentario(hijo, true)));

            listaComentariosEl.appendChild(wrapper);
        });

    } catch (err) {
        console.error(err);
        listaComentariosEl.innerHTML = '<p class="sin-datos">Error al cargar comentarios.</p>';
    }
}

formComentario.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!amigoSeleccionadoId) return;

    const contenido = inputComentario.value.trim();
    if (!contenido) return;

    if (btnEnviarComentario) {
        btnEnviarComentario.disabled = true;
        btnEnviarComentario.textContent = 'Enviando...';
    }

    try {
        const res = await fetch(`${API_URL}/comentarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amigoId: amigoSeleccionadoId,
                autor: usuarioSesion.NombreVisible,
                contenido: contenido,
                respuestaAId: comentarioRespondiendoId
            })
        });

        if (res.ok) {
            inputComentario.value = '';
            cancelarRespuesta();
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

        const esAdmin = usuarioSesion && usuarioSesion.RolApp === 'Admin';
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

    formData.append('discordUsername', document.getElementById('nuevoUsername').value.trim());
    formData.append('apodo', document.getElementById('nuevoApodo').value.trim());
    formData.append('rol', document.getElementById('nuevoRol') ? document.getElementById('nuevoRol').value.trim() : 'Miembro');
    formData.append('descripcion', document.getElementById('nuevaDesc').value.trim());
    formData.append('rolSolicitante', usuarioSesion.RolApp);
    formData.append('solicitanteId', usuarioSesion.Id);

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

        try {
            const res = await fetch(`${API_URL}/amigos/${amigoSeleccionadoId}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}`, { method: 'DELETE' });
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

window.addEventListener('DOMContentLoaded', cargarAmigos);
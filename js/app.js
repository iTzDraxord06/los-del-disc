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

const listaComentariosEl = document.getElementById('listaComentarios');
const formComentario = document.getElementById('formComentario');
const inputAutor = document.getElementById('inputAutor');
const inputComentario = document.getElementById('inputComentario');

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

// Al hacer clic en el usuario, alternar el menú hacia arriba
if (btnToggleMenuUsuario && menuDesplegableUsuario) {
    btnToggleMenuUsuario.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDesplegableUsuario.classList.toggle('oculto');
    });

    // Cerrar el popup al hacer clic en cualquier otra parte
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

    cargarAfiche();
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

// ================= AFICHES =================

async function cargarAfiche() {
    try {
        const res = await fetch(`${API_URL}/anuncio`);
        const anuncios = await res.json();

        if (!feedAfiches) return;
        feedAfiches.innerHTML = '';

        if (Array.isArray(anuncios) && anuncios.length > 0) {
            feedAfiches.classList.remove('oculto');
            if (aficheDefault) aficheDefault.classList.add('oculto');

            const esAdmin = usuarioSesion && usuarioSesion.RolApp === 'Admin';

            anuncios.forEach(item => {
                const tarjeta = document.createElement('div');
                tarjeta.className = 'tarjeta-afiche';

                let botonBorrar = '';
                if (esAdmin) {
                    botonBorrar = `
                        <div style="text-align: right; margin-bottom: 10px;">
                            <button class="btn-borrar-afiche" data-id="${item.Id}" style="background-color: #ed4245; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">🗑️ Quitar</button>
                        </div>
                    `;
                }

                let imgHtml = '';
                if (item.ImagenUrl) {
                    imgHtml = `<img src="${item.ImagenUrl}" alt="Afiche" />`;
                }

                let tituloHtml = item.Titulo ? `<h2>${item.Titulo}</h2>` : '';
                let descHtml = item.Descripcion ? `<p>${item.Descripcion}</p>` : '';

                tarjeta.innerHTML = `${botonBorrar}${imgHtml}${tituloHtml}${descHtml}`;

                if (esAdmin) {
                    const btn = tarjeta.querySelector('.btn-borrar-afiche');
                    btn.addEventListener('click', async () => {
                        const confirmar = confirm('¿Deseas quitar este afiche?');
                        if (!confirmar) return;

                        try {
                            const delRes = await fetch(`${API_URL}/anuncio/${item.Id}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}`, {
                                method: 'DELETE'
                            });
                            if (delRes.ok) {
                                cargarAfiche();
                            } else {
                                alert('No se pudo quitar el afiche.');
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    });
                }

                feedAfiches.appendChild(tarjeta);
            });
        } else {
            feedAfiches.classList.add('oculto');
            if (aficheDefault) aficheDefault.classList.remove('oculto');
        }
    } catch (err) {
        console.error(err);
    }
}

// ================= GESTIÓN DE AMIGOS =================

async function cargarAmigos() {
    try {
        const res = await fetch(`${API_URL}/amigos`);
        listaAmigosMemoria = await res.json();
        listaAmigosEl.innerHTML = '';

        if (listaAmigosMemoria.length === 0) {
            listaAmigosEl.innerHTML = '<p class="sin-datos">No hay amigos registrados.</p>';
            return;
        }

        listaAmigosMemoria.forEach(amigo => {
            const card = document.createElement('div');
            card.className = `amigo-card ${amigoSeleccionadoId === amigo.Id ? 'activo' : ''}`;
            const avatar = amigo.AvatarUrl || 'imagenes/default.png';

            card.innerHTML = `
                <img src="${avatar}" alt="${amigo.Apodo}">
                <div class="amigo-info">
                    <h4>${amigo.Apodo}</h4>
                    <span>@${amigo.DiscordUsername}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                seleccionarAmigo(amigo);
            });
            listaAmigosEl.appendChild(card);
        });

        if (amigoSeleccionadoId) {
            const actual = listaAmigosMemoria.find(a => a.Id === amigoSeleccionadoId);
            if (actual) seleccionarAmigo(actual);
        }
    } catch (err) {
        console.error(err);
        listaAmigosEl.innerHTML = '<p class="sin-datos">Error al conectar con la base de datos.</p>';
    }
}

function seleccionarAmigo(amigo) {
    cerrarMenuLateral();

    amigoSeleccionado = amigo;
    amigoSeleccionadoId = amigo.Id;

    muroVacioEl.classList.add('oculto');
    muroDetalleEl.classList.remove('oculto');

    muroAvatar.src = amigo.AvatarUrl || 'imagenes/default.png';
    muroApodo.textContent = amigo.Apodo;
    muroTag.textContent = `@${amigo.DiscordUsername}`;
    muroRol.textContent = amigo.RolServidor || 'Miembro';
    muroDesc.textContent = amigo.Descripcion || 'Sin biografía.';

    const esAdmin = usuarioSesion && usuarioSesion.RolApp === 'Admin';
    if (btnEditarPerfil) btnEditarPerfil.classList.toggle('oculto', !esAdmin);
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

        // Si el usuario es Admin y la foto tiene Id en la BD
        if (esAdmin && idFoto) {
            const btnBorrar = document.createElement('button');
            btnBorrar.className = 'btn-eliminar-foto';
            btnBorrar.innerHTML = '🗑️';
            btnBorrar.title = 'Eliminar esta foto de la galería';

            btnBorrar.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmar = confirm('¿Estás seguro de que deseas eliminar esta imagen de la galería?');
                if (!confirmar) return;

                try {
                    const res = await fetch(`${API_URL}/fotos/${idFoto}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}`, {
                        method: 'DELETE'
                    });

                    if (res.ok) {
                        await cargarAmigos();
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        alert(errData.error || 'No se pudo eliminar la foto.');
                    }
                } catch (err) {
                    console.error('Error al borrar foto:', err);
                    alert('Error de conexión al eliminar la imagen.');
                }
            });

            contenedor.appendChild(btnBorrar);
        }

        gridWaifus.appendChild(contenedor);
    });

    document.querySelectorAll('.amigo-card').forEach(c => c.classList.remove('activo'));
    cargarComentarios(amigo.Id);
}

if (btnEliminarPerfil) {
    btnEliminarPerfil.addEventListener('click', async () => {
        if (!amigoSeleccionadoId) return;

        const confirmar = confirm(`¿Estás seguro de que deseas eliminar a ${amigoSeleccionado.Apodo}? Esta acción borrará también sus comentarios.`);
        if (!confirmar) return;

        try {
            const res = await fetch(`${API_URL}/amigos/${amigoSeleccionadoId}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (res.ok) {
                volverAlInicio();
                await cargarAmigos();
            } else {
                alert(data.error || 'Error al eliminar el amigo.');
            }
        } catch (err) {
            console.error(err);
            alert('Error al intentar eliminar el amigo.');
        }
    });
}

// ================= COMENTARIOS =================

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

        comentarios.forEach(c => {
            const rawFecha = c.Fecha || c.FechaPublicacion;
            const fechaStr = rawFecha ? new Date(rawFecha).toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short'
            }) : 'Reciente';

            const textoComentario = c.Texto || c.Contenido || '';

            const card = document.createElement('div');
            card.className = 'comentario-item';
            card.innerHTML = `
                <div class="comentario-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="comentario-autor">${c.Autor}</span>
                        <span class="comentario-fecha">${fechaStr}</span>
                    </div>
                    ${esAdmin ? `<button class="btn-borrar-comentario" data-id="${c.Id}" title="Eliminar comentario" style="background: none; border: none; cursor: pointer; color: #ed4245; font-size: 14px; padding: 2px 6px;">🗑️</button>` : ''}
                </div>
                <p class="comentario-texto">${textoComentario}</p>
            `;

            if (esAdmin) {
                const btnBorrar = card.querySelector('.btn-borrar-comentario');
                btnBorrar.addEventListener('click', async () => {
                    const confirmar = confirm('¿Deseas eliminar este comentario?');
                    if (!confirmar) return;

                    try {
                        const deleteRes = await fetch(`${API_URL}/comentarios/${c.Id}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}`, {
                            method: 'DELETE'
                        });
                        const data = await deleteRes.json().catch(() => ({}));

                        if (deleteRes.ok) {
                            cargarComentarios(amigoId);
                        } else {
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

formComentario.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!amigoSeleccionadoId) return;

    const contenido = inputComentario.value.trim();
    if (!contenido) return;

    try {
        const res = await fetch(`${API_URL}/comentarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amigoId: amigoSeleccionadoId,
                autor: usuarioSesion.NombreVisible,
                contenido: contenido
            })
        });

        if (res.ok) {
            inputComentario.value = '';
            cargarComentarios(amigoSeleccionadoId);
        }
    } catch (err) {
        console.error('Error al enviar comentario:', err);
    }
});

// ================= MODAL AMIGO (AGREGAR / EDITAR) =================

if (btnAbrirModal) {
    btnAbrirModal.addEventListener('click', () => {
        formNuevoAmigo.reset();
        amigoEditId.value = '';
        modalTitulo.textContent = 'Agregar Amigo';
        modalAmigo.classList.remove('oculto');
    });
}

if (btnCerrarModal) {
    btnCerrarModal.addEventListener('click', () => {
        modalAmigo.classList.add('oculto');
    });
}

if (btnEditarPerfil) {
    btnEditarPerfil.addEventListener('click', () => {
        if (!amigoSeleccionado) return;
        amigoEditId.value = amigoSeleccionado.Id;
        document.getElementById('nuevoUsername').value = amigoSeleccionado.DiscordUsername;
        document.getElementById('nuevoApodo').value = amigoSeleccionado.Apodo;
        document.getElementById('nuevoRol').value = amigoSeleccionado.RolServidor || 'Miembro';
        document.getElementById('nuevaDesc').value = amigoSeleccionado.Descripcion || '';

        modalTitulo.textContent = `Editar a ${amigoSeleccionado.Apodo}`;
        modalAmigo.classList.remove('oculto');
    });
}

formNuevoAmigo.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = amigoEditId.value;
    const formData = new FormData();

    formData.append('discordUsername', document.getElementById('nuevoUsername').value.trim());
    formData.append('apodo', document.getElementById('nuevoApodo').value.trim());
    formData.append('rol', document.getElementById('nuevoRol').value.trim());
    formData.append('descripcion', document.getElementById('nuevaDesc').value.trim());
    formData.append('rolSolicitante', usuarioSesion.RolApp);

    const avatarInput = document.getElementById('inputAvatarFile');
    if (avatarInput && avatarInput.files && avatarInput.files[0]) {
        formData.append('avatarFile', avatarInput.files[0]);
    } else if (id && amigoSeleccionado) {
        formData.append('avatarUrlActual', amigoSeleccionado.AvatarUrl || '');
    }

    const waifuInput = document.getElementById('inputWaifuFiles');
    if (waifuInput && waifuInput.files && waifuInput.files.length > 0) {
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
        const res = await fetch(url, {
            method: metodo,
            body: formData
        });

        const resp = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));

        if (res.ok) {
            modalAmigo.classList.add('oculto');
            formNuevoAmigo.reset();
            cargarAmigos();
        } else {
            alert(resp.error || 'No se pudo completar la operación.');
        }
    } catch (err) {
        console.error('Detalle del fallo:', err);
        alert('Error al enviar la solicitud: ' + err.message);
    } finally {
        if (btnGuardarAmigo) {
            btnGuardarAmigo.disabled = false;
            btnGuardarAmigo.textContent = 'Guardar';
        }
    }
});

// ================= MODAL AFICHE =================

if (btnAbrirModalAfiche) {
    btnAbrirModalAfiche.addEventListener('click', () => {
        formAfiche.reset();
        modalAfiche.classList.remove('oculto');
    });
}

if (btnCerrarModalAfiche) {
    btnCerrarModalAfiche.addEventListener('click', () => {
        modalAfiche.classList.add('oculto');
    });
}

formAfiche.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('titulo', document.getElementById('aficheInputTitulo').value.trim());
    formData.append('descripcion', document.getElementById('aficheInputDesc').value.trim());
    formData.append('rolSolicitante', usuarioSesion.RolApp);

    const fileInput = document.getElementById('aficheInputFile');
    if (fileInput && fileInput.files[0]) {
        formData.append('imagenAfiche', fileInput.files[0]);
    }

    try {
        const res = await fetch(`${API_URL}/anuncio`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            modalAfiche.classList.add('oculto');
            formAfiche.reset();
            cargarAfiche();
        } else {
            const data = await res.json().catch(() => ({}));
            alert(data.error || 'Error al guardar el afiche');
        }
    } catch (err) {
        console.error(err);
        alert('Error al enviar el afiche');
    }
});

window.addEventListener('DOMContentLoaded', () => {
    cargarAmigos();
    cargarAfiche();
});
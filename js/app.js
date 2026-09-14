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

    cargarAfiche();
    cargarPostsGlobales();
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
                        <div style="text-align: right; margin-bottom: 8px;">
                            <button class="btn-borrar-afiche" data-id="${item.Id}" style="background-color: #ed4245; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.78rem;">🗑️ Quitar</button>
                        </div>
                    `;
                }

                let imgHtml = '';
                if (item.ImagenUrl) {
                    imgHtml = `<img src="${item.ImagenUrl}" alt="Afiche" style="cursor: pointer;" />`;
                }

                let tituloHtml = item.Titulo ? `<h2>${item.Titulo}</h2>` : '';
                let descHtml = item.Descripcion ? `<p>${item.Descripcion}</p>` : '';

                tarjeta.innerHTML = `${botonBorrar}${imgHtml}${tituloHtml}${descHtml}`;

                const imgEl = tarjeta.querySelector('img');
                if (imgEl) imgEl.addEventListener('click', () => abrirVisor(item.ImagenUrl));

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
            
            let imagenHtml = '';
            if (c.ImagenUrl) {
                imagenHtml = `<img src="${c.ImagenUrl}" alt="Imagen de comentario" class="comentario-imagen" title="Clic para ampliar">`;
            }

            card.innerHTML = `
                <div class="comentario-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="comentario-autor">${c.Autor}</span>
                        <span class="comentario-fecha">${fechaStr}</span>
                    </div>
                    ${puedeBorrar ? `<button class="btn-borrar-comentario" data-id="${c.Id}" title="Eliminar comentario" style="background: none; border: none; cursor: pointer; color: #ed4245; font-size: 14px; padding: 2px 6px;">🗑️</button>` : ''}
                </div>
                <p class="comentario-texto">${textoComentario}</p>
                ${imagenHtml}
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

    const formData = new FormData();
    formData.append('amigoId', amigoSeleccionadoId);
    formData.append('autor', usuarioSesion.NombreVisible);
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
            const puedeBorrar = esAdmin || esAutor;

            const card = document.createElement('div');
            card.className = 'comentario-item';
            
            let imgHtml = p.ImagenUrl ? `<img src="${p.ImagenUrl}" class="comentario-imagen" alt="Foto post">` : '';
            
            card.innerHTML = `
                <div class="comentario-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="comentario-autor">${p.Autor}</span>
                        <span class="comentario-fecha">${new Date(p.Fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                    ${puedeBorrar ? `<button class="btn-borrar-post-global" data-id="${p.Id}" title="Eliminar publicación" style="background: none; border: none; cursor: pointer; color: #ed4245; font-size: 14px;">🗑️</button>` : ''}
                </div>
                <p class="comentario-texto">${p.Texto}</p>
                ${imgHtml}
            `;

            const imgEl = card.querySelector('.comentario-imagen');
            if (imgEl) imgEl.addEventListener('click', () => abrirVisor(p.ImagenUrl));

            if (puedeBorrar) {
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
        if (!texto) return;

        const formData = new FormData();
        formData.append('autor', usuarioSesion.NombreVisible);
        formData.append('contenido', texto);
        if (inputFotoPostGlobal.files && inputFotoPostGlobal.files[0]) {
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
            alert('Error de conexión al publicar.');
        } finally {
            if (btnEnviarPostGlobal) {
                btnEnviarPostGlobal.disabled = false;
                btnEnviarPostGlobal.textContent = 'Publicar';
            }
        }
    });
}

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

// --- HELPER PARA SUBIR A GOOGLE DRIVE ---
async function subirArchivoMultimedia(fileInput) {
    const file = fileInput.files[0];
    if (!file) return null;

    const formData = new FormData();
    formData.append('archivo', file);

    const res = await fetch('/api/media-drive', {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al subir a Drive');
    }

    const data = await res.json();
    return data.url; // Retorna https://drive.google.com/uc?id=...
}

// --- RENDERIZADOR UNIFICADO DE MULTIMEDIA (IMAGEN O VIDEO) ---
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
    return `<img src="${url}" alt="Multimedia" class="comentario-imagen" title="Clic para ampliar">`;
}

const inputMed = document.getElementById('inputVideoMedia');
if (inputMed) {
    inputMed.addEventListener('change', () => {
        const label = document.getElementById('nombreArchivoSel');
        if (label) label.textContent = inputMed.files[0] ? inputMed.files[0].name : 'Ningún archivo seleccionado';
    });
}

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
    cargarPostsGlobales();
});
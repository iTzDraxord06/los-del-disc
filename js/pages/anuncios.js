const API_URL = '/api';

let feedAfiches, aficheDefault, btnAbrirModalAfiche, modalAfiche;
let btnCerrarModalAfiche, formAfiche, btnGuardarAfiche;
let aficheInputFile, modalVisor, imagenVisorAmpliada, btnCerrarVisor;
let controller = null;

function obtenerUsuario() {
    try {
        return JSON.parse(localStorage.getItem('disc_user'));
    } catch {
        return null;
    }
}

function abrirVisor(url) {
    if (!url || url.includes('drive.google.com')) return;
    imagenVisorAmpliada.src = url;
    modalVisor.classList.remove('oculto');
}

function cerrarVisor() {
    if (!modalVisor) return;
    modalVisor.classList.add('oculto');
    if (imagenVisorAmpliada) imagenVisorAmpliada.src = '';
}

function renderizarMultimedia(url) {
    if (!url) return '';

    if (url.includes('drive.google.com')) {
        const match = url.match(/[?&]id=([^&]+)/);
        if (!match) return '';

        const fileId = match[1];

        return `
            <video class="media-reproductor" controls playsinline preload="metadata"
                style="width:100%;max-height:380px;border-radius:8px;border:1px solid var(--borde,#444);margin-top:10px;display:block;background:#000;">
                <source src="${API_URL}/media-drive/${fileId}">
                Tu navegador no soporta reproducción de video.
            </video>
        `;
    }

    return `<img src="${url}" alt="Afiche" style="cursor:pointer;max-width:100%;border-radius:8px;display:block;margin-top:10px;">`;
}

async function cargarAfiche() {
    if (!feedAfiches) return;

    feedAfiches.innerHTML = '<p class="cargando">Cargando avisos...</p>';

    try {
        const res = await fetch(`${API_URL}/anuncio`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const anuncios = await res.json();
        const usuario = obtenerUsuario();
        const esAdmin = usuario?.RolApp === 'Admin';

        feedAfiches.innerHTML = '';

        if (!Array.isArray(anuncios) || anuncios.length === 0) {
            feedAfiches.classList.add('oculto');
            aficheDefault?.classList.remove('oculto');
            return;
        }

        feedAfiches.classList.remove('oculto');
        aficheDefault?.classList.add('oculto');

        anuncios.forEach(item => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'tarjeta-afiche';

            const botonBorrar = esAdmin
                ? `<div style="text-align:right;margin-bottom:8px;">
                    <button class="btn-borrar-afiche" data-id="${item.Id}" style="background:#ed4245;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:.78rem;">🗑️ Quitar Anuncio</button>
                   </div>`
                : '';

            const media = item.ImagenUrl ? renderizarMultimedia(item.ImagenUrl) : '';
            const titulo = item.Titulo ? `<h2>${item.Titulo}</h2>` : '';
            const descripcion = item.Descripcion ? `<p>${item.Descripcion}</p>` : '';

            tarjeta.innerHTML = `${botonBorrar}${media}${titulo}${descripcion}`;

            const img = tarjeta.querySelector('img');
            if (img) img.addEventListener('click', () => abrirVisor(item.ImagenUrl), { signal: controller.signal });

            const btnBorrar = tarjeta.querySelector('.btn-borrar-afiche');

            if (btnBorrar) {
                btnBorrar.addEventListener('click', async () => {
                    if (!confirm('¿Deseas quitar este anuncio?')) return;

                    try {
                        const resDelete = await fetch(
                            `${API_URL}/anuncio/${item.Id}?rolSolicitante=${encodeURIComponent(usuario.RolApp)}`,
                            { method: 'DELETE' }
                        );

                        if (!resDelete.ok) {
                            const data = await resDelete.json().catch(() => ({}));
                            alert(data.error || 'No se pudo quitar el anuncio.');
                            return;
                        }

                        await cargarAfiche();
                    } catch (error) {
                        console.error(error);
                        alert('Error al eliminar el anuncio.');
                    }
                }, { signal: controller.signal });
            }

            feedAfiches.appendChild(tarjeta);
        });
    } catch (error) {
        console.error(error);
        feedAfiches.innerHTML = '<p class="sin-datos">Error al cargar los anuncios.</p>';
    }
}

async function publicarAfiche(e) {
    e.preventDefault();

    const usuario = obtenerUsuario();

    if (!usuario || usuario.RolApp !== 'Admin') {
        alert('No tienes permisos para publicar anuncios.');
        return;
    }

    const titulo = document.getElementById('aficheInputTitulo')?.value.trim() || '';
    const descripcion = document.getElementById('aficheInputDesc')?.value.trim() || '';
    const file = aficheInputFile?.files?.[0];

    if (!titulo && !descripcion && !file) return;

    btnGuardarAfiche.disabled = true;
    btnGuardarAfiche.textContent = 'Publicando...';

    try {
        if (file?.type.startsWith('video/') || (file && /\.(mp4|webm|mov)$/i.test(file.name))) {
            const driveData = new FormData();
            driveData.append('archivo', file);

            const resDrive = await fetch(`${API_URL}/media-drive`, {
                method: 'POST',
                body: driveData
            });

            if (!resDrive.ok) throw new Error('Fallo al subir el video a Google Drive');

            const dataDrive = await resDrive.json();

            if (!dataDrive.url) throw new Error('Google Drive no devolvió la URL del video');

            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('descripcion', descripcion);
            formData.append('rolSolicitante', usuario.RolApp);
            formData.append('imagenUrlDirecta', dataDrive.url);

            const res = await fetch(`${API_URL}/anuncio`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Error al guardar el anuncio con video');
            }
        } else {
            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('descripcion', descripcion);
            formData.append('rolSolicitante', usuario.RolApp);

            if (file) formData.append('imagenAfiche', file);

            const res = await fetch(`${API_URL}/anuncio`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Error al publicar el anuncio');
            }
        }

        modalAfiche.classList.add('oculto');
        formAfiche.reset();
        await cargarAfiche();
    } catch (error) {
        console.error(error);
        alert(`Error al publicar el anuncio: ${error.message}`);
    } finally {
        btnGuardarAfiche.disabled = false;
        btnGuardarAfiche.textContent = 'Publicar Anuncio';
    }
}

export async function init() {
    controller?.abort();
    controller = new AbortController();

    feedAfiches = document.getElementById('feedAfiches');
    aficheDefault = document.getElementById('aficheDefault');
    btnAbrirModalAfiche = document.getElementById('btnAbrirModalAfiche');
    modalAfiche = document.getElementById('modalAfiche');
    btnCerrarModalAfiche = document.getElementById('btnCerrarModalAfiche');
    formAfiche = document.getElementById('formAfiche');
    btnGuardarAfiche = document.getElementById('btnGuardarAfiche');
    aficheInputFile = document.getElementById('aficheInputFile');
    modalVisor = document.getElementById('modalVisor');
    imagenVisorAmpliada = document.getElementById('imagenVisorAmpliada');
    btnCerrarVisor = document.getElementById('btnCerrarVisor');

    if (!feedAfiches || !formAfiche) return;

    const usuario = obtenerUsuario();

    if (usuario?.RolApp === 'Admin') {
        btnAbrirModalAfiche?.classList.remove('oculto');
    } else {
        btnAbrirModalAfiche?.classList.add('oculto');
    }

    btnAbrirModalAfiche?.addEventListener('click', () => {
        formAfiche.reset();
        modalAfiche.classList.remove('oculto');
    }, { signal: controller.signal });

    btnCerrarModalAfiche?.addEventListener('click', () => {
        modalAfiche.classList.add('oculto');
    }, { signal: controller.signal });

    modalAfiche?.addEventListener('click', e => {
        if (e.target === modalAfiche) modalAfiche.classList.add('oculto');
    }, { signal: controller.signal });

    btnCerrarVisor?.addEventListener('click', cerrarVisor, { signal: controller.signal });

    modalVisor?.addEventListener('click', e => {
        if (e.target === modalVisor) cerrarVisor();
    }, { signal: controller.signal });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (modalVisor && !modalVisor.classList.contains('oculto')) cerrarVisor();
            if (modalAfiche && !modalAfiche.classList.contains('oculto')) modalAfiche.classList.add('oculto');
        }
    }, { signal: controller.signal });

    formAfiche.addEventListener('submit', publicarAfiche, { signal: controller.signal });

    await cargarAfiche();
}

export function destroy() {
    controller?.abort();
    controller = null;

    document.querySelectorAll('video').forEach(video => {
        video.pause();
        video.removeAttribute('src');
        video.load();
    });

    feedAfiches = null;
    aficheDefault = null;
    btnAbrirModalAfiche = null;
    modalAfiche = null;
    btnCerrarModalAfiche = null;
    formAfiche = null;
    btnGuardarAfiche = null;
    aficheInputFile = null;
    modalVisor = null;
    imagenVisorAmpliada = null;
    btnCerrarVisor = null;
}
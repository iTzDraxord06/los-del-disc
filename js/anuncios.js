const API_URL = '/api';

const feedAfiches = document.getElementById('feedAfiches');
const aficheDefault = document.getElementById('aficheDefault');
const btnAbrirModalAfiche = document.getElementById('btnAbrirModalAfiche');
const modalAfiche = document.getElementById('modalAfiche');
const btnCerrarModalAfiche = document.getElementById('btnCerrarModalAfiche');
const formAfiche = document.getElementById('formAfiche');
const btnGuardarAfiche = document.getElementById('btnGuardarAfiche');
const aficheInputFile = document.getElementById('aficheInputFile');
const labelAficheFile = document.getElementById('labelAficheFile');

// Visor Lightbox
const modalVisor = document.getElementById('modalVisor');
const imagenVisorAmpliada = document.getElementById('imagenVisorAmpliada');
const btnCerrarVisor = document.getElementById('btnCerrarVisor');

function abrirVisor(url) {
    if (!url || url.includes('drive.google.com')) return;
    if (imagenVisorAmpliada) imagenVisorAmpliada.src = url;
    if (modalVisor) modalVisor.classList.remove('oculto');
}

function cerrarVisor() {
    if (modalVisor) modalVisor.classList.add('oculto');
    if (imagenVisorAmpliada) imagenVisorAmpliada.src = '';
}

if (btnCerrarVisor) btnCerrarVisor.addEventListener('click', cerrarVisor);

if (modalVisor) {
    modalVisor.addEventListener('click', (e) => {
        if (e.target === modalVisor) cerrarVisor();
    });
}

function renderizarMultimediaAnuncio(url) {
    if (!url) return '';

    if (url.includes('drive.google.com')) {
        return `
            <video class="media-reproductor" controls preload="metadata"
                style="max-width:100%; max-height:380px; border-radius:8px;
                border:1px solid var(--borde,#444); margin-top:10px;
                display:block; background:#000;">
                <source src="${url}" type="video/mp4">
                Tu navegador no soporta reproducción de video.
            </video>
        `;
    }

    return `
        <img src="${url}" alt="Afiche"
            style="cursor:pointer; max-width:100%; border-radius:8px;">
    `;
}

// Mostrar botón solo a Admin.
if (typeof usuarioSesion !== 'undefined' &&
    usuarioSesion &&
    usuarioSesion.RolApp === 'Admin' &&
    btnAbrirModalAfiche) {
    btnAbrirModalAfiche.classList.remove('oculto');
}

// Mostrar nombre del archivo seleccionado.
if (aficheInputFile && labelAficheFile) {
    aficheInputFile.addEventListener('change', () => {
        const file = aficheInputFile.files[0];

        if (file) {
            labelAficheFile.textContent = file.name;
            labelAficheFile.title = file.name;
        } else {
            labelAficheFile.textContent = 'Ningún archivo seleccionado';
            labelAficheFile.title = '';
        }
    });
}

async function cargarAfiche() {
    try {
        const res = await fetch(`${API_URL}/anuncio`);
        const anuncios = await res.json();

        if (!feedAfiches) return;

        feedAfiches.innerHTML = '';

        if (Array.isArray(anuncios) && anuncios.length > 0) {
            feedAfiches.classList.remove('oculto');

            if (aficheDefault) {
                aficheDefault.classList.add('oculto');
            }

            const esAdmin = typeof usuarioSesion !== 'undefined' &&
                usuarioSesion &&
                usuarioSesion.RolApp === 'Admin';

            anuncios.forEach(item => {
                const tarjeta = document.createElement('div');
                tarjeta.className = 'tarjeta-afiche';

                let botonBorrar = '';

                if (esAdmin) {
                    botonBorrar = `
                        <div style="text-align:right; margin-bottom:8px;">
                            <button class="btn-borrar-afiche"
                                data-id="${item.Id}"
                                style="background-color:#ed4245; color:#fff; border:none;
                                padding:4px 8px; border-radius:4px; cursor:pointer;
                                font-size:0.78rem;">
                                🗑️ Quitar Anuncio
                            </button>
                        </div>
                    `;
                }

                const mediaHtml = item.ImagenUrl
                    ? renderizarMultimediaAnuncio(item.ImagenUrl)
                    : '';

                const tituloHtml = item.Titulo
                    ? `<h2>${item.Titulo}</h2>`
                    : '';

                const descHtml = item.Descripcion
                    ? `<p>${item.Descripcion}</p>`
                    : '';

                tarjeta.innerHTML = `${botonBorrar}${mediaHtml}${tituloHtml}${descHtml}`;

                const imgEl = tarjeta.querySelector('img');

                if (imgEl) {
                    imgEl.addEventListener('click', () => {
                        abrirVisor(item.ImagenUrl);
                    });
                }

                if (esAdmin) {
                    const btn = tarjeta.querySelector('.btn-borrar-afiche');

                    if (btn) {
                        btn.addEventListener('click', async () => {
                            if (!confirm('¿Deseas quitar este anuncio?')) return;

                            try {
                                const delRes = await fetch(
                                    `${API_URL}/anuncio/${item.Id}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}`,
                                    { method: 'DELETE' }
                                );

                                if (!delRes.ok) {
                                    const error = await delRes.json().catch(() => ({}));
                                    throw new Error(error.error || 'No se pudo eliminar el anuncio.');
                                }

                                cargarAfiche();
                            } catch (err) {
                                console.error(err);
                                alert(err.message);
                            }
                        });
                    }
                }

                feedAfiches.appendChild(tarjeta);
            });
        } else {
            feedAfiches.classList.add('oculto');

            if (aficheDefault) {
                aficheDefault.classList.remove('oculto');
            }
        }
    } catch (err) {
        console.error('Error cargando anuncios:', err);
    }
}

if (btnAbrirModalAfiche) {
    btnAbrirModalAfiche.addEventListener('click', () => {
        if (formAfiche) formAfiche.reset();

        if (labelAficheFile) {
            labelAficheFile.textContent = 'Ningún archivo seleccionado';
            labelAficheFile.title = '';
        }

        if (modalAfiche) modalAfiche.classList.remove('oculto');
    });
}

if (btnCerrarModalAfiche) {
    btnCerrarModalAfiche.addEventListener('click', () => {
        if (modalAfiche) modalAfiche.classList.add('oculto');
    });
}

if (formAfiche) {
    formAfiche.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = aficheInputFile && aficheInputFile.files[0];
        const tituloVal = document.getElementById('aficheInputTitulo').value.trim();
        const descVal = document.getElementById('aficheInputDesc').value.trim();

        if (!tituloVal && !descVal && !file) {
            alert('Agrega un título, una descripción o un archivo antes de publicar.');
            return;
        }

        if (file && file.size > 30 * 1024 * 1024) {
            alert('El archivo no puede superar los 30 MB.');
            return;
        }

        if (file) {
            const tipoValido =
                file.type.startsWith('image/') ||
                file.type === 'video/mp4' ||
                file.type === 'video/webm';

            const extensionValida = /\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(file.name);

            if (!tipoValido && !extensionValida) {
                alert('Solo se permiten imágenes, MP4 o WEBM.');
                return;
            }
        }

        if (btnGuardarAfiche) {
            btnGuardarAfiche.disabled = true;
            btnGuardarAfiche.textContent = 'Publicando...';
        }

        try {
            let finalImageUrl = '';

            if (file && (file.type.startsWith('video/') ||
                /\.(mp4|webm)$/i.test(file.name))) {

                const formDataDrive = new FormData();
                formDataDrive.append('archivo', file);

                const resDrive = await fetch(`${API_URL}/media-drive`, {
                    method: 'POST',
                    body: formDataDrive
                });

                if (!resDrive.ok) {
                    const error = await resDrive.json().catch(() => ({}));
                    throw new Error(error.error || 'No se pudo subir el video a Google Drive.');
                }

                const dataDrive = await resDrive.json();

                if (!dataDrive.url) {
                    throw new Error('Google Drive no devolvió la URL del video.');
                }

                finalImageUrl = dataDrive.url;
            } else if (file) {
                const formDataImg = new FormData();

                formDataImg.append('titulo', tituloVal);
                formDataImg.append('descripcion', descVal);
                formDataImg.append('rolSolicitante', usuarioSesion.RolApp);
                formDataImg.append('imagenAfiche', file);

                const resImg = await fetch(`${API_URL}/anuncio`, {
                    method: 'POST',
                    body: formDataImg
                });

                if (!resImg.ok) {
                    const dataErr = await resImg.json().catch(() => ({}));
                    throw new Error(
                        dataErr.error || 'Error al guardar el anuncio con imagen.'
                    );
                }

                if (modalAfiche) modalAfiche.classList.add('oculto');
                formAfiche.reset();

                if (labelAficheFile) {
                    labelAficheFile.textContent = 'Ningún archivo seleccionado';
                    labelAficheFile.title = '';
                }

                await cargarAfiche();
                return;
            }

            // Video de Drive: ahora sí se guarda el anuncio en la BD.
            const resAnuncio = await fetch(`${API_URL}/anuncio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    titulo: tituloVal,
                    descripcion: descVal,
                    rolSolicitante: usuarioSesion.RolApp,
                    imagenUrl: finalImageUrl
                })
            });

            if (!resAnuncio.ok) {
                const dataErr = await resAnuncio.json().catch(() => ({}));
                throw new Error(
                    dataErr.error || 'El video se subió, pero no se pudo guardar el anuncio.'
                );
            }

            if (modalAfiche) modalAfiche.classList.add('oculto');
            formAfiche.reset();

            if (labelAficheFile) {
                labelAficheFile.textContent = 'Ningún archivo seleccionado';
                labelAficheFile.title = '';
            }

            await cargarAfiche();

        } catch (err) {
            console.error('Error al publicar anuncio:', err);
            alert('Error al publicar el anuncio: ' + err.message);
        } finally {
            if (btnGuardarAfiche) {
                btnGuardarAfiche.disabled = false;
                btnGuardarAfiche.textContent = 'Publicar Anuncio';
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', cargarAfiche);

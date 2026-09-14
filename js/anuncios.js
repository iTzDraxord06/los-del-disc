const API_URL = '/api';

const feedAfiches = document.getElementById('feedAfiches');
const aficheDefault = document.getElementById('aficheDefault');
const btnAbrirModalAfiche = document.getElementById('btnAbrirModalAfiche');
const modalAfiche = document.getElementById('modalAfiche');
const btnCerrarModalAfiche = document.getElementById('btnCerrarModalAfiche');
const formAfiche = document.getElementById('formAfiche');
const btnGuardarAfiche = document.getElementById('btnGuardarAfiche');

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

// Botón para Admin
if (usuarioSesion && usuarioSesion.RolApp === 'Admin' && btnAbrirModalAfiche) {
    btnAbrirModalAfiche.classList.remove('oculto');
}

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
                            <button class="btn-borrar-afiche" data-id="${item.Id}" style="background-color: #ed4245; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.78rem;">🗑️ Quitar Anuncio</button>
                        </div>
                    `;
                }

                let imgHtml = item.ImagenUrl ? `<img src="${item.ImagenUrl}" alt="Afiche" style="cursor: pointer;" />` : '';
                let tituloHtml = item.Titulo ? `<h2>${item.Titulo}</h2>` : '';
                let descHtml = item.Descripcion ? `<p>${item.Descripcion}</p>` : '';

                tarjeta.innerHTML = `${botonBorrar}${imgHtml}${tituloHtml}${descHtml}`;

                const imgEl = tarjeta.querySelector('img');
                if (imgEl) imgEl.addEventListener('click', () => abrirVisor(item.ImagenUrl));

                if (esAdmin) {
                    const btn = tarjeta.querySelector('.btn-borrar-afiche');
                    btn.addEventListener('click', async () => {
                        if (!confirm('¿Deseas quitar este anuncio?')) return;
                        try {
                            const delRes = await fetch(`${API_URL}/anuncio/${item.Id}?rolSolicitante=${encodeURIComponent(usuarioSesion.RolApp)}`, {
                                method: 'DELETE'
                            });
                            if (delRes.ok) cargarAfiche();
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

if (btnAbrirModalAfiche) {
    btnAbrirModalAfiche.addEventListener('click', () => {
        formAfiche.reset();
        modalAfiche.classList.remove('oculto');
    });
}

if (btnCerrarModalAfiche) {
    btnCerrarModalAfiche.addEventListener('click', () => modalAfiche.classList.add('oculto'));
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

    if (btnGuardarAfiche) {
        btnGuardarAfiche.disabled = true;
        btnGuardarAfiche.textContent = 'Publicando...';
    }

    try {
        const res = await fetch(`${API_URL}/anuncio`, { method: 'POST', body: formData });
        if (res.ok) {
            modalAfiche.classList.add('oculto');
            formAfiche.reset();
            cargarAfiche();
        } else {
            alert('Error al publicar el anuncio.');
        }
    } catch (err) {
        console.error(err);
        alert('Error de conexión al enviar el anuncio.');
    } finally {
        if (btnGuardarAfiche) {
            btnGuardarAfiche.disabled = false;
            btnGuardarAfiche.textContent = 'Publicar Anuncio';
        }
    }
});

window.addEventListener('DOMContentLoaded', cargarAfiche);
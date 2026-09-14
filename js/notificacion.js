var API_URL = window.API_URL || '/api';

document.addEventListener('DOMContentLoaded', () => {
    const btnNotis = document.getElementById('btnNotis');
    const dropdownNotis = document.getElementById('dropdownNotis');
    const badgeNotis = document.getElementById('badgeNotis');
    const listaNotis = document.getElementById('listaNotis');

    const usuarioSesion = JSON.parse(localStorage.getItem('disc_user'));

    if (btnNotis && dropdownNotis) {
        btnNotis.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownNotis.classList.toggle('oculto');
            if (!dropdownNotis.classList.contains('oculto') && usuarioSesion) {
                cargarNotificaciones(usuarioSesion.Id);
            }
        });

        document.addEventListener('click', (e) => {
            if (!dropdownNotis.contains(e.target) && !btnNotis.contains(e.target)) {
                dropdownNotis.classList.add('oculto');
            }
        });
    }

    async function cargarNotificaciones(usuarioId) {
        if (!listaNotis) return;
        listaNotis.innerHTML = '<p class="cargando" style="font-size:0.8rem; padding:10px;">Cargando...</p>';
        try {
            // Ejemplo de endpoint futuro: GET /api/notificaciones/:usuarioId
            const res = await fetch(`${API_URL}/notificaciones/${usuarioId}`);
            const data = await res.json();
            
            listaNotis.innerHTML = '';
            if (!Array.isArray(data) || data.length === 0) {
                listaNotis.innerHTML = '<p class="sin-datos" style="font-size:0.8rem; padding:10px;">No tienes notificaciones.</p>';
                if (badgeNotis) badgeNotis.classList.add('oculto');
                return;
            }

            // Actualizar badge no leídos
            const noLeidos = data.filter(n => !n.Leido).length;
            if (badgeNotis) {
                if (noLeidos > 0) {
                    badgeNotis.textContent = noLeidos;
                    badgeNotis.classList.remove('oculto');
                } else {
                    badgeNotis.classList.add('oculto');
                }
            }

            data.forEach(item => {
                const el = document.createElement('div');
                el.style.cssText = 'padding: 8px 10px; border-bottom: 1px solid var(--borde); font-size: 0.8rem; cursor: pointer; background: ' + (item.Leido ? 'transparent' : 'rgba(0,229,255,0.08)') + ';';
                el.innerHTML = `<strong>${item.AutorAccion}</strong> respondió: "${item.TextoPrevio || ''}"`;
                
                el.addEventListener('click', () => {
                    // Lógica de redirección a perfil o muro y scroll
                    if (item.Tipo === 'PERFIL') {
                        window.location.href = `miembros.html?amigoId=${item.DestinoId}&scrollComentario=${item.ComentarioId}`;
                    } else {
                        window.location.href = `muro.html?scrollPost=${item.ComentarioId}`;
                    }
                });
                listaNotis.appendChild(el);
            });
        } catch (err) {
            console.error('Error notificaciones:', err);
            listaNotis.innerHTML = '<p class="sin-datos" style="font-size:0.8rem; padding:10px;">Error al cargar.</p>';
        }
    }

    // Opcional: chequear cada 30 segundos si hay un usuario logueado
    if (usuarioSesion && usuarioSesion.Id) {
        // Podrías inicializar un contador rápido aquí si deseas
    }
});
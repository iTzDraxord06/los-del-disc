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
        listaNotis.innerHTML = '<div class="dropdown-notificaciones-vacio">Cargando...</div>';
        
        try {
            const res = await fetch(`${API_URL}/notificaciones/${usuarioId}`);
            const data = await res.json();
            
            listaNotis.innerHTML = '';
            if (!Array.isArray(data) || data.length === 0) {
                listaNotis.innerHTML = `<div class="dropdown-notificaciones-vacio">📭 No tienes notificaciones</div>`;
                if (badgeNotis) badgeNotis.classList.add('oculto');
                return;
            }

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
                el.className = `item-notificacion ${item.Leido ? '' : 'no-leido'}`;
                el.innerHTML = `<strong>${item.AutorAccion}</strong> respondió: "${item.TextoPrevio || ''}"`;
                
                el.addEventListener('click', async () => {
                    await fetch(`${API_URL}/notificaciones/${item.Id}/leer`, { method: 'PUT' });
                    
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
            listaNotis.innerHTML = `<div class="dropdown-notificaciones-vacio">Error al cargar.</div>`;
        }
    }
});
const API_URL = '/api';

const usuarioSesion = JSON.parse(localStorage.getItem('disc_user'));
if (!usuarioSesion) {
    window.location.href = 'login.html';
}

const inputUsername = document.getElementById('inputUsername');
const inputNombreVisible = document.getElementById('inputNombreVisible');
const inputPassActual = document.getElementById('inputPassActual');
const inputPassNuevo = document.getElementById('inputPassNuevo');
const badgeRol = document.getElementById('badgeRol');
const formAjustes = document.getElementById('formAjustes');
const alerta = document.getElementById('alerta');
const btnGuardar = document.getElementById('btnGuardar');

// Cargar datos actuales
inputUsername.value = usuarioSesion.Username || '';
inputNombreVisible.value = usuarioSesion.NombreVisible || '';
badgeRol.textContent = usuarioSesion.RolApp || 'Lector';

function mostrarMensaje(texto, tipo) {
    alerta.textContent = texto;
    alerta.className = `alerta ${tipo}`;
    alerta.classList.remove('oculto');
}

formAjustes.addEventListener('submit', async (e) => {
    e.preventDefault();
    alerta.classList.add('oculto');

    const nuevoUser = inputUsername.value.trim();
    const nuevoNombre = inputNombreVisible.value.trim();
    const passActual = inputPassActual.value;
    const passNuevo = inputPassNuevo.value;

    if (nuevoUser.length < 4) {
        mostrarMensaje('El usuario de inicio de sesión debe tener al menos 4 caracteres.', 'error');
        return;
    }

    if (nuevoNombre.length < 3) {
        mostrarMensaje('El apodo visible debe tener al menos 3 caracteres.', 'error');
        return;
    }

    if (passNuevo && passNuevo.length < 6) {
        mostrarMensaje('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }

    if (passNuevo && !passActual) {
        mostrarMensaje('Debes ingresar tu contraseña actual para autorizar el cambio de clave.', 'error');
        return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        const res = await fetch(`${API_URL}/usuarios/perfil`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: usuarioSesion.Id,
                newUsername: nuevoUser,
                nombreVisible: nuevoNombre,
                passwordActual: passActual,
                nuevoPassword: passNuevo
            })
        });

        const data = await res.json();

        if (res.ok && data.exito) {
            mostrarMensaje('¡Datos actualizados con éxito! Redirigiendo...', 'exito');
            // Actualizar la sesión en localStorage para que en index.html ya salga el nuevo usuario
            localStorage.setItem('disc_user', JSON.stringify(data.usuario));

            inputPassActual.value = '';
            inputPassNuevo.value = '';

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1200);
        } else {
            mostrarMensaje(data.error || 'No se pudo actualizar la información.', 'error');
        }
    } catch (err) {
        console.error('Error al actualizar:', err);
        mostrarMensaje('Error de conexión con el servidor.', 'error');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Cambios';
    }
});
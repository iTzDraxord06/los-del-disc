const API_URL = '/api';

// Elementos de la interfaz de login
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const formLogin = document.getElementById('formLogin');
const formRegister = document.getElementById('formRegister');
const loginError = document.getElementById('loginError');
const regMsg = document.getElementById('regMsg');

// Alternar entre Login y Registro
tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.remove('oculto');
    formRegister.classList.add('oculto');
    loginError.classList.add('oculto');
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.remove('oculto');
    formLogin.classList.add('oculto');
    regMsg.classList.add('oculto');
});

// Manejar Inicio de Sesión
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('oculto');

    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value.trim();

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.exito) {
            // Guardamos la sesión en el navegador
            localStorage.setItem('disc_user', JSON.stringify(data.usuario));
            // Redirigir al muro principal
            window.location.href = 'index.html';
        } else {
            loginError.textContent = data.mensaje || 'Error al iniciar sesión';
            loginError.classList.remove('oculto');
        }
    } catch (err) {
        loginError.textContent = 'No se pudo conectar con el servidor (¿node server.js está corriendo?)';
        loginError.classList.remove('oculto');
    }
});

// Manejar Registro
formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    regMsg.classList.add('oculto');

    const nombreVisible = document.getElementById('regNombre').value.trim();
    const username = document.getElementById('regUser').value.trim();
    const password = document.getElementById('regPass').value.trim();

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombreVisible, username, password })
        });

        const data = await res.json();

        if (res.ok && data.exito) {
            alert(data.mensaje);
            formRegister.reset();
            tabLogin.click(); // Volver a la pestaña de login
        } else {
            regMsg.textContent = data.error || 'No se pudo registrar el usuario';
            regMsg.style.color = 'var(--error)';
            regMsg.classList.remove('oculto');
        }
    } catch (err) {
        regMsg.textContent = 'Error de conexión con el servidor.';
        regMsg.style.color = 'var(--error)';
        regMsg.classList.remove('oculto');
    }
});
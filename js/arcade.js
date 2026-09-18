const API_URL = '/api';

const canvas = document.getElementById('arcadeCanvas');
const ctx = canvas.getContext('2d');
const labelScore = document.getElementById('labelScoreActual');
const labelInstruccion = document.getElementById('labelInstruccion');
const subtituloLeaderboard = document.getElementById('subtituloLeaderboard');
const listaLeaderboard = document.getElementById('listaLeaderboard');
const tabs = document.querySelectorAll('.btn-game-tab');

let juegoActual = 'snake';
let puntajeActual = 0;
let loopJuego = null;

// ================= ESTADO DE SNAKE =================
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

let snake = [];
let direccion = { x: 0, y: 0 };
let comida = { x: 10, y: 10 };
let juegoCorriendo = false;

function iniciarSnake() {
    clearInterval(loopJuego);
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    direccion = { x: 0, y: -1 };
    puntajeActual = 0;
    labelScore.textContent = `Puntaje: ${puntajeActual}`;
    generarComida();
    juegoCorriendo = true;
    loopJuego = setInterval(actualizarSnake, 120);
}

function generarComida() {
    comida = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };
    for (let segmento of snake) {
        if (segmento.x === comida.x && segmento.y === comida.y) {
            generarComida();
            break;
        }
    }
}

function actualizarSnake() {
    if (!juegoCorriendo) return;

    const cabeza = { x: snake[0].x + direccion.x, y: snake[0].y + direccion.y };

    // Colisión con paredes
    if (cabeza.x < 0 || cabeza.x >= TILE_COUNT || cabeza.y < 0 || cabeza.y >= TILE_COUNT) {
        terminarPartida();
        return;
    }

    // Colisión consigo misma
    for (let segmento of snake) {
        if (segmento.x === cabeza.x && segmento.y === cabeza.y) {
            terminarPartida();
            return;
        }
    }

    snake.unshift(cabeza);

    // Comer fruta
    if (cabeza.x === comida.x && cabeza.y === comida.y) {
        puntajeActual += 10;
        labelScore.textContent = `Puntaje: ${puntajeActual}`;
        generarComida();
    } else {
        snake.pop();
    }

    dibujarSnake();
}

function dibujarSnake() {
    ctx.fillStyle = '#0f1012';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Comida
    ctx.fillStyle = '#ed4245';
    ctx.beginPath();
    ctx.arc(
        comida.x * GRID_SIZE + GRID_SIZE / 2,
        comida.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Cuerpo de la serpiente
    snake.forEach((segmento, i) => {
        ctx.fillStyle = i === 0 ? '#5865F2' : '#3ba55d';
        ctx.fillRect(
            segmento.x * GRID_SIZE + 1,
            segmento.y * GRID_SIZE + 1,
            GRID_SIZE - 2,
            GRID_SIZE - 2
        );
    });
}

function terminarPartida() {
    juegoCorriendo = false;
    clearInterval(loopJuego);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('¡GAME OVER!', canvas.width / 2, canvas.height / 2 - 10);

    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#dbdee1';
    ctx.fillText(`Puntaje obtenido: ${puntajeActual}`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Presiona cualquier flecha o botón para reiniciar', canvas.width / 2, canvas.height / 2 + 50);

    if (puntajeActual > 0 && typeof usuarioSesion !== 'undefined' && usuarioSesion?.Id) {
        guardarRecord(juegoActual, puntajeActual);
    }
}

// ================= SINCRONIZACIÓN CON BACKEND =================
async function guardarRecord(juego, puntos) {
    try {
        const res = await fetch(`${API_URL}/juegos/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: usuarioSesion.Id,
                juego: juego,
                puntuacion: puntos
            })
        });
        if (res.ok) {
            cargarLeaderboard(juego);
        }
    } catch (err) {
        console.error('Error guardando puntaje:', err);
    }
}

async function cargarLeaderboard(juego) {
    subtituloLeaderboard.textContent = juego.toUpperCase();
    listaLeaderboard.innerHTML = '<li class="leaderboard-item" style="color: #949ba4;">Cargando marcas...</li>';

    try {
        const res = await fetch(`${API_URL}/juegos/leaderboard/${juego}`);
        const data = await res.json();

        listaLeaderboard.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
            listaLeaderboard.innerHTML = '<li class="leaderboard-item" style="color: #949ba4;">Sin récords aún. ¡Sé el primero!</li>';
            return;
        }

        data.forEach((item, index) => {
            const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
            const li = document.createElement('li');
            li.className = 'leaderboard-item';
            li.innerHTML = `
                <div>
                    <span class="posicion">${medalla}</span>
                    <span style="color: #fff;">${item.NombreVisible || item.Username}</span>
                </div>
                <span class="puntos">${item.Puntuacion} pts</span>
            `;
            listaLeaderboard.appendChild(li);
        });
    } catch (err) {
        console.error(err);
        listaLeaderboard.innerHTML = '<li class="leaderboard-item" style="color: #ed4245;">Error cargando marcas.</li>';
    }
}

// ================= CONTROLES (TECLADO Y TÁCTIL) =================
function manejarDireccion(tecla) {
    if (!juegoCorriendo && juegoActual === 'snake') {
        iniciarSnake();
        return;
    }

    if (juegoActual === 'snake') {
        if ((tecla === 'ArrowUp' || tecla === 'KeyW') && direccion.y === 0) {
            direccion = { x: 0, y: -1 };
        } else if ((tecla === 'ArrowDown' || tecla === 'KeyS') && direccion.y === 0) {
            direccion = { x: 0, y: 1 };
        } else if ((tecla === 'ArrowLeft' || tecla === 'KeyA') && direccion.x === 0) {
            direccion = { x: -1, y: 0 };
        } else if ((tecla === 'ArrowRight' || tecla === 'KeyD') && direccion.x === 0) {
            direccion = { x: 1, y: 0 };
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    manejarDireccion(e.code);
});

function vincularBotonTouch(id, tecla) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const handler = (e) => {
        e.preventDefault();
        manejarDireccion(tecla);
    };

    el.addEventListener('touchstart', handler, { passive: false });
    el.addEventListener('mousedown', handler);
}

vincularBotonTouch('btnTouchArriba', 'ArrowUp');
vincularBotonTouch('btnTouchAbajo', 'ArrowDown');
vincularBotonTouch('btnTouchIzq', 'ArrowLeft');
vincularBotonTouch('btnTouchDer', 'ArrowRight');
vincularBotonTouch('btnTouchAccion', 'Space');

// ================= TABS DE JUEGOS =================
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('activo'));
        tab.classList.add('activo');
        juegoActual = tab.dataset.game;

        clearInterval(loopJuego);
        cargarLeaderboard(juegoActual);

        if (juegoActual === 'snake') {
            labelInstruccion.textContent = 'Usa las flechas o la cruceta virtual';
            iniciarSnake();
        } else {
            ctx.fillStyle = '#0f1012';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#dbdee1';
            ctx.font = '16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Cargando ${juegoActual.toUpperCase()}...`, canvas.width / 2, canvas.height / 2);
            labelInstruccion.textContent = 'Próximamente disponible';
        }
    });
});

// Inicialización
window.addEventListener('DOMContentLoaded', () => {
    cargarLeaderboard('snake');
    iniciarSnake();
});
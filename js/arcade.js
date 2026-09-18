const BASE_API = window.API_URL || '/api';

const canvas = document.getElementById('arcadeCanvas');
const ctx = canvas.getContext('2d');
const labelScore = document.getElementById('labelScoreActual');
const labelInstruccion = document.getElementById('labelInstruccion');
const subtituloLeaderboard = document.getElementById('subtituloLeaderboard');
const listaLeaderboard = document.getElementById('listaLeaderboard');
const tabs = document.querySelectorAll('.btn-game-tab');
const contenedorJuego = document.getElementById('contenedorJuego');

let juegoActual = 'snake';
let puntajeActual = 0;
let loopJuego = null;
let juegoCorriendo = false;

// ==========================================
// 1. MOTOR SNAKE
// ==========================================
const SNAKE_GRID = 20;
const SNAKE_TILES = canvas.width / SNAKE_GRID;
let snake = [];
let snakeDir = { x: 0, y: -1 };
let comida = { x: 10, y: 10 };

function iniciarSnake() {
    limpiarLoops();
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    snakeDir = { x: 0, y: -1 };
    puntajeActual = 0;
    labelScore.textContent = `Puntaje: 0`;
    labelInstruccion.textContent = 'Flechas/Cruceta para moverte';
    generarComidaSnake();
    juegoCorriendo = true;
    loopJuego = setInterval(actualizarSnake, 120);
}

function generarComidaSnake() {
    comida = {
        x: Math.floor(Math.random() * SNAKE_TILES),
        y: Math.floor(Math.random() * SNAKE_TILES)
    };
    for (let seg of snake) {
        if (seg.x === comida.x && seg.y === comida.y) {
            generarComidaSnake();
            break;
        }
    }
}

function actualizarSnake() {
    if (!juegoCorriendo) return;
    const cabeza = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };

    if (cabeza.x < 0 || cabeza.x >= SNAKE_TILES || cabeza.y < 0 || cabeza.y >= SNAKE_TILES) {
        return gameOverSnake();
    }
    for (let s of snake) {
        if (s.x === cabeza.x && s.y === cabeza.y) return gameOverSnake();
    }

    snake.unshift(cabeza);
    if (cabeza.x === comida.x && cabeza.y === comida.y) {
        puntajeActual += 10;
        labelScore.textContent = `Puntaje: ${puntajeActual}`;
        generarComidaSnake();
    } else {
        snake.pop();
    }

    dibujarSnake();
}

function dibujarSnake() {
    ctx.fillStyle = '#0f1012';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ed4245';
    ctx.beginPath();
    ctx.arc(comida.x * SNAKE_GRID + 10, comida.y * SNAKE_GRID + 10, 8, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? '#5865F2' : '#3ba55d';
        ctx.fillRect(seg.x * SNAKE_GRID + 1, seg.y * SNAKE_GRID + 1, SNAKE_GRID - 2, SNAKE_GRID - 2);
    });
}

function gameOverSnake() {
    juegoCorriendo = false;
    clearInterval(loopJuego);
    pantallaGameOver('Snake');
}

// ==========================================
// 2. MOTOR TETRIS
// ==========================================
const TETRIS_ROWS = 20;
const TETRIS_COLS = 10;
const BLOCK_SIZE = 20; // 200x400 centrado en el canvas de 400x400
const TETRIS_OFFSET_X = (canvas.width - (TETRIS_COLS * BLOCK_SIZE)) / 2; // 100px

let tetrisTablero = [];
let piezaActual = null;
let piezaX = 0;
let piezaY = 0;

const PIEZAS = [
    { shape: [[1, 1, 1, 1]], color: '#00f0f0' }, // I
    { shape: [[1, 1], [1, 1]], color: '#f0f000' }, // O
    { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' }, // T
    { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' }, // J
    { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' }, // L
    { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' }, // S
    { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' }  // Z
];

function iniciarTetris() {
    limpiarLoops();
    tetrisTablero = Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(0));
    puntajeActual = 0;
    labelScore.textContent = `Puntaje: 0`;
    labelInstruccion.textContent = '◀ ▶ Mover | ▲/Botón A: Rotar | ▼ Caída';
    juegoCorriendo = true;
    nuevaPiezaTetris();
    loopJuego = setInterval(actualizarTetris, 500);
}

function nuevaPiezaTetris() {
    const random = PIEZAS[Math.floor(Math.random() * PIEZAS.length)];
    piezaActual = { shape: random.shape, color: random.color };
    piezaX = Math.floor((TETRIS_COLS - piezaActual.shape[0].length) / 2);
    piezaY = 0;

    if (colisionTetris(piezaActual.shape, piezaX, piezaY)) {
        juegoCorriendo = false;
        clearInterval(loopJuego);
        pantallaGameOver('Tetris');
    }
}

function colisionTetris(shape, offX, offY) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const newX = offX + c;
                const newY = offY + r;
                if (newX < 0 || newX >= TETRIS_COLS || newY >= TETRIS_ROWS) return true;
                if (newY >= 0 && tetrisTablero[newY][newX]) return true;
            }
        }
    }
    return false;
}

function rotarMatriz(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
}

function fijarPiezaTetris() {
    for (let r = 0; r < piezaActual.shape.length; r++) {
        for (let c = 0; c < piezaActual.shape[r].length; c++) {
            if (piezaActual.shape[r][c]) {
                tetrisTablero[piezaY + r][piezaX + c] = piezaActual.color;
            }
        }
    }

    // Limpiar líneas completas
    let lineas = 0;
    for (let r = TETRIS_ROWS - 1; r >= 0; r--) {
        if (tetrisTablero[r].every(celda => celda !== 0)) {
            tetrisTablero.splice(r, 1);
            tetrisTablero.unshift(Array(TETRIS_COLS).fill(0));
            lineas++;
            r++; // Volver a revisar la misma fila
        }
    }

    if (lineas > 0) {
        puntajeActual += lineas * 100 * lineas; // Bonificación combo
        labelScore.textContent = `Puntaje: ${puntajeActual}`;
    }

    nuevaPiezaTetris();
}

function actualizarTetris() {
    if (!juegoCorriendo) return;
    if (!colisionTetris(piezaActual.shape, piezaX, piezaY + 1)) {
        piezaY++;
    } else {
        fijarPiezaTetris();
    }
    dibujarTetris();
}

function dibujarTetris() {
    ctx.fillStyle = '#0f1012';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fondo del área de juego
    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(TETRIS_OFFSET_X, 0, TETRIS_COLS * BLOCK_SIZE, TETRIS_ROWS * BLOCK_SIZE);
    ctx.strokeStyle = '#35363c';
    ctx.strokeRect(TETRIS_OFFSET_X, 0, TETRIS_COLS * BLOCK_SIZE, TETRIS_ROWS * BLOCK_SIZE);

    // Tablero fijo
    for (let r = 0; r < TETRIS_ROWS; r++) {
        for (let c = 0; c < TETRIS_COLS; c++) {
            if (tetrisTablero[r][c]) {
                ctx.fillStyle = tetrisTablero[r][c];
                ctx.fillRect(TETRIS_OFFSET_X + c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            }
        }
    }

    // Pieza cayendo
    if (piezaActual) {
        ctx.fillStyle = piezaActual.color;
        for (let r = 0; r < piezaActual.shape.length; r++) {
            for (let c = 0; c < piezaActual.shape[r].length; c++) {
                if (piezaActual.shape[r][c]) {
                    ctx.fillRect(
                        TETRIS_OFFSET_X + (piezaX + c) * BLOCK_SIZE + 1,
                        (piezaY + r) * BLOCK_SIZE + 1,
                        BLOCK_SIZE - 2,
                        BLOCK_SIZE - 2
                    );
                }
            }
        }
    }
}

// ==========================================
// 3. MOTOR BUSCAMINAS
// ==========================================
const MINAS_ROWS = 10;
const MINAS_COLS = 10;
const MINAS_CANTIDAD = 12;
const MINA_SIZE = 40; // 400 / 10
let buscaminasGrid = [];
let banderasRestantes = MINAS_CANTIDAD;
let celdasReveladas = 0;

function iniciarBuscaminas() {
    limpiarLoops();
    puntajeActual = 0;
    celdasReveladas = 0;
    banderasRestantes = MINAS_CANTIDAD;
    labelScore.textContent = `Minas restantes: ${banderasRestantes}`;
    labelInstruccion.textContent = 'Toca una celda. Botón A cambia a modo Bandera 🚩';
    juegoCorriendo = true;
    modoBandera = false;

    // Generar matriz
    buscaminasGrid = Array.from({ length: MINAS_ROWS }, () =>
        Array.from({ length: MINAS_COLS }, () => ({
            mina: false,
            revelada: false,
            bandera: false,
            vecinas: 0
        }))
    );

    // Colocar minas aleatorias
    let minasPuestas = 0;
    while (minasPuestas < MINAS_CANTIDAD) {
        const r = Math.floor(Math.random() * MINAS_ROWS);
        const c = Math.floor(Math.random() * MINAS_COLS);
        if (!buscaminasGrid[r][c].mina) {
            buscaminasGrid[r][c].mina = true;
            minasPuestas++;
        }
    }

    // Calcular números
    for (let r = 0; r < MINAS_ROWS; r++) {
        for (let c = 0; c < MINAS_COLS; c++) {
            if (!buscaminasGrid[r][c].mina) {
                let cuenta = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < MINAS_ROWS && nc >= 0 && nc < MINAS_COLS && buscaminasGrid[nr][nc].mina) {
                            cuenta++;
                        }
                    }
                }
                buscaminasGrid[r][c].vecinas = cuenta;
            }
        }
    }

    dibujarBuscaminas();
}

let modoBandera = false;
function clickCeldaBuscaminas(col, row, esClickDerecho = false) {
    if (!juegoCorriendo || row < 0 || row >= MINAS_ROWS || col < 0 || col >= MINAS_COLS) return;
    const celda = buscaminasGrid[row][col];
    if (celda.revelada) return;

    if (esClickDerecho || modoBandera) {
        // Poner / quitar bandera
        celda.bandera = !celda.bandera;
        banderasRestantes += celda.bandera ? -1 : 1;
        labelScore.textContent = `Minas restantes: ${banderasRestantes}`;
        dibujarBuscaminas();
        return;
    }

    if (celda.bandera) return;

    if (celda.mina) {
        // Explotó
        juegoCorriendo = false;
        revelarTodasLasMinas();
        dibujarBuscaminas();
        pantallaGameOver('Buscaminas', false);
        return;
    }

    revelarCelda(row, col);
    dibujarBuscaminas();

    // Condición de victoria
    if (celdasReveladas === (MINAS_ROWS * MINAS_COLS - MINAS_CANTIDAD)) {
        juegoCorriendo = false;
        puntajeActual = 500; // Puntos por ganar
        pantallaGameOver('Buscaminas', true);
    }
}

function revelarCelda(r, c) {
    if (r < 0 || r >= MINAS_ROWS || c < 0 || c >= MINAS_COLS) return;
    const celda = buscaminasGrid[r][c];
    if (celda.revelada || celda.bandera) return;

    celda.revelada = true;
    celdasReveladas++;
    puntajeActual += 5;
    labelScore.textContent = `Puntos: ${puntajeActual}`;

    if (celda.vecinas === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr !== 0 || dc !== 0) revelarCelda(r + dr, c + dc);
            }
        }
    }
}

function revelarTodasLasMinas() {
    for (let r = 0; r < MINAS_ROWS; r++) {
        for (let c = 0; c < MINAS_COLS; c++) {
            if (buscaminasGrid[r][c].mina) buscaminasGrid[r][c].revelada = true;
        }
    }
}

function dibujarBuscaminas() {
    ctx.fillStyle = '#0f1012';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < MINAS_ROWS; r++) {
        for (let c = 0; c < MINAS_COLS; c++) {
            const celda = buscaminasGrid[r][c];
            const x = c * MINA_SIZE;
            const y = r * MINA_SIZE;

            ctx.strokeStyle = '#2b2d31';
            ctx.strokeRect(x, y, MINA_SIZE, MINA_SIZE);

            if (!celda.revelada) {
                ctx.fillStyle = '#3f4147';
                ctx.fillRect(x + 1, y + 1, MINA_SIZE - 2, MINA_SIZE - 2);
                if (celda.bandera) {
                    ctx.font = '20px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🚩', x + MINA_SIZE / 2, y + MINA_SIZE / 2 + 7);
                }
            } else {
                ctx.fillStyle = celda.mina ? '#ed4245' : '#1e1f22';
                ctx.fillRect(x + 1, y + 1, MINA_SIZE - 2, MINA_SIZE - 2);

                if (celda.mina) {
                    ctx.font = '20px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('💣', x + MINA_SIZE / 2, y + MINA_SIZE / 2 + 7);
                } else if (celda.vecinas > 0) {
                    const colores = ['', '#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245'];
                    ctx.fillStyle = colores[celda.vecinas] || '#fff';
                    ctx.font = 'bold 18px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(celda.vecinas, x + MINA_SIZE / 2, y + MINA_SIZE / 2 + 7);
                }
            }
        }
    }
}

// Clics directos al canvas para Buscaminas
canvas.addEventListener('click', (e) => {
    if (juegoActual !== 'buscaminas') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const col = Math.floor(((e.clientX - rect.left) * scaleX) / MINA_SIZE);
    const row = Math.floor(((e.clientY - rect.top) * scaleY) / MINA_SIZE);
    clickCeldaBuscaminas(col, row, false);
});

canvas.addEventListener('contextmenu', (e) => {
    if (juegoActual !== 'buscaminas') return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const col = Math.floor(((e.clientX - rect.left) * scaleX) / MINA_SIZE);
    const row = Math.floor(((e.clientY - rect.top) * scaleY) / MINA_SIZE);
    clickCeldaBuscaminas(col, row, true);
});

// ==========================================
// 4. MOTOR DOOM (EMBEBIDO)
// ==========================================
let dosboxInstance = null;

function cargarDoom() {
    limpiarLoops();
    labelInstruccion.textContent = 'Mover: Flechas | Disparar: S | Usar/Puertas: W | Correr: Espacio';
    labelScore.textContent = 'Modo Campaña (DOOM 1993)';

    canvas.style.display = 'none';

    let dosboxWrapper = document.getElementById('dosboxWrapper');
    if (!dosboxWrapper) {
        dosboxWrapper = document.createElement('div');
        dosboxWrapper.id = 'dosboxWrapper';
        dosboxWrapper.innerHTML = '<div id="dosbox"></div>';
        contenedorJuego.appendChild(dosboxWrapper);
    } else {
        dosboxWrapper.style.display = 'block';
    }

    if (!dosboxInstance && typeof Dosbox !== 'undefined') {
        dosboxInstance = new Dosbox({
            id: "dosbox",
            onload: function (dosbox) {
                // Opción 1: Ejecutar directamente sin './'
                dosbox.run("https://js-dos.com/cdn/upload/DOOM-@evilution.zip", "DOOM.EXE");
            },
            onrun: function (dosbox, app) {
                console.log("DOOM 1993 iniciado correctamente.");
            }
        });
    }
}

function limpiarLoops() {
    clearInterval(loopJuego);
    juegoCorriendo = false;
    canvas.style.display = 'block';

    const dosboxWrapper = document.getElementById('dosboxWrapper');
    if (dosboxWrapper) {
        dosboxWrapper.style.display = 'none';
    }
}

function simularEventoTeclado(tipo, tecla, codigo) {
    const canvasDoom = document.querySelector('#dosbox canvas');
    const objetivo = canvasDoom || window;

    const evento = new KeyboardEvent(tipo, {
        key: tecla,
        code: codigo,
        bubbles: true,
        cancelable: true
    });
    objetivo.dispatchEvent(evento);
}

// Enlace de las acciones del D-Pad a los controles de DOOM
function ejecutarComandoDoom(accion, tipoEvento) {
    if (juegoActual !== 'doom') return;

    if (accion === 'ArrowUp') simularEventoTeclado(tipoEvento, 'ArrowUp', 'ArrowUp');
    if (accion === 'ArrowDown') simularEventoTeclado(tipoEvento, 'ArrowDown', 'ArrowDown');
    if (accion === 'ArrowLeft') simularEventoTeclado(tipoEvento, 'ArrowLeft', 'ArrowLeft');
    if (accion === 'ArrowRight') simularEventoTeclado(tipoEvento, 'ArrowRight', 'ArrowRight');
    if (accion === 'Space') simularEventoTeclado(tipoEvento, 's', 'KeyS'); // Botón A dispara
}

// Conectar toques tanto al presionar como al soltar el botón
function vincularTouch(id, tecla) {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        manejarAccion(tecla);
        ejecutarComandoDoom(tecla, 'keydown');
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
        e.preventDefault();
        ejecutarComandoDoom(tecla, 'keyup');
    }, { passive: false });

    el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        manejarAccion(tecla);
        ejecutarComandoDoom(tecla, 'keydown');
    });

    el.addEventListener('mouseup', (e) => {
        e.preventDefault();
        ejecutarComandoDoom(tecla, 'keyup');
    });
}

async function restaurarPartidasDoom(usuarioId) {
    try {
        const res = await fetch(`${BASE_API}/juegos/doom/cargar/${usuarioId}`);
        const partidas = await res.json();

        if (Array.isArray(partidas) && typeof FS !== 'undefined') {
            partidas.forEach(p => {
                const binario = Uint8Array.from(atob(p.datosBase64), c => c.charCodeAt(0));
                // DOOMSAV0.DSG representa la primera ranura
                FS.writeFile(`DOOMSAV${p.slot}.DSG`, binario);
            });
            console.log("Partidas sincronizadas desde la base de datos.");
        }
    } catch (e) {
        console.warn("No se pudieron restaurar partidas:", e);
    }
}

// Sincronizar un save local hacia SQL Server
async function sincronizarSaveASql(usuarioId, slot = 0) {
    if (typeof FS === 'undefined') return;
    try {
        const nombreArchivo = `DOOMSAV${slot}.DSG`;
        if (FS.analyzePath(nombreArchivo).exists) {
            const data = FS.readFile(nombreArchivo);
            let binary = '';
            for (let i = 0; i < data.byteLength; i++) {
                binary += String.fromCharCode(data[i]);
            }
            const base64 = btoa(binary);

            await fetch(`${BASE_API}/juegos/doom/guardar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuarioId: usuarioId,
                    slot: slot,
                    datosBase64: base64
                })
            });
            console.log(`Partida (Slot ${slot}) respaldada en la nube.`);
        }
    } catch (e) {
        console.error("Error al subir save de Doom:", e);
    }
}


// ==========================================
// PANTALLA GAME OVER & LEADERBOARD
// ==========================================
function pantallaGameOver(nombreJuego, victoria = false) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = victoria ? '#57F287' : '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(victoria ? '¡VICTORIA!' : '¡GAME OVER!', canvas.width / 2, canvas.height / 2 - 15);

    ctx.fillStyle = '#dbdee1';
    ctx.font = '15px Inter, sans-serif';
    ctx.fillText(`Puntaje obtenido: ${puntajeActual}`, canvas.width / 2, canvas.height / 2 + 15);
    ctx.fillText('Toca cualquier control o botón para reiniciar', canvas.width / 2, canvas.height / 2 + 45);

    if (puntajeActual > 0 && typeof usuarioSesion !== 'undefined' && usuarioSesion?.Id) {
        guardarRecord(juegoActual, puntajeActual);
    }
}

async function guardarRecord(juego, puntos) {
    try {
        const res = await fetch(`${BASE_API}/juegos/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: usuarioSesion.Id,
                juego: juego,
                puntuacion: puntos
            })
        });
        if (res.ok) cargarLeaderboard(juego);
    } catch (err) {
        console.error('Error guardando récord:', err);
    }
}

async function cargarLeaderboard(juego) {
    subtituloLeaderboard.textContent = juego.toUpperCase();
    listaLeaderboard.innerHTML = '<li class="leaderboard-item" style="color: #949ba4;">Cargando marcas...</li>';

    try {
        const res = await fetch(`${BASE_API}/juegos/leaderboard/${juego}`);
        const data = await res.json();

        listaLeaderboard.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
            listaLeaderboard.innerHTML = '<li class="leaderboard-item" style="color: #949ba4;">Sin marcas registradas.</li>';
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
        listaLeaderboard.innerHTML = '<li class="leaderboard-item" style="color: #ed4245;">Error al cargar.</li>';
    }
}

// ==========================================
// CONTROLES Y ENLACE DE EVENTOS
// ==========================================
function manejarAccion(tecla) {
    if (!juegoCorriendo) {
        if (juegoActual === 'snake') iniciarSnake();
        else if (juegoActual === 'tetris') iniciarTetris();
        else if (juegoActual === 'buscaminas') iniciarBuscaminas();
        return;
    }

    if (juegoActual === 'snake') {
        if ((tecla === 'ArrowUp' || tecla === 'KeyW') && snakeDir.y === 0) snakeDir = { x: 0, y: -1 };
        else if ((tecla === 'ArrowDown' || tecla === 'KeyS') && snakeDir.y === 0) snakeDir = { x: 0, y: 1 };
        else if ((tecla === 'ArrowLeft' || tecla === 'KeyA') && snakeDir.x === 0) snakeDir = { x: -1, y: 0 };
        else if ((tecla === 'ArrowRight' || tecla === 'KeyD') && snakeDir.x === 0) snakeDir = { x: 1, y: 0 };
    } 
    else if (juegoActual === 'tetris') {
        if (tecla === 'ArrowLeft' || tecla === 'KeyA') {
            if (!colisionTetris(piezaActual.shape, piezaX - 1, piezaY)) piezaX--;
        } else if (tecla === 'ArrowRight' || tecla === 'KeyD') {
            if (!colisionTetris(piezaActual.shape, piezaX + 1, piezaY)) piezaX++;
        } else if (tecla === 'ArrowDown' || tecla === 'KeyS') {
            if (!colisionTetris(piezaActual.shape, piezaX, piezaY + 1)) piezaY++;
        } else if (tecla === 'ArrowUp' || tecla === 'KeyW' || tecla === 'Space') {
            // Rotar
            const rotada = rotarMatriz(piezaActual.shape);
            if (!colisionTetris(rotada, piezaX, piezaY)) piezaActual.shape = rotada;
        }
        dibujarTetris();
    } 
    else if (juegoActual === 'buscaminas') {
        if (tecla === 'Space' || tecla === 'KeyF') {
            modoBandera = !modoBandera;
            labelInstruccion.textContent = modoBandera ? '🚩 MODO BANDERA ACTIVO: Toca para marcar minas' : '⛏️ MODO EXCAVAR: Toca para revelar casillas';
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    manejarAccion(e.code);
});

function vincularTouch(id, tecla) {
    const el = document.getElementById(id);
    if (!el) return;
    const clickHandler = (e) => {
        e.preventDefault();
        manejarAccion(tecla);
    };
    el.addEventListener('touchstart', clickHandler, { passive: false });
    el.addEventListener('mousedown', clickHandler);
}

vincularTouch('btnTouchArriba', 'ArrowUp');
vincularTouch('btnTouchAbajo', 'ArrowDown');
vincularTouch('btnTouchIzq', 'ArrowLeft');
vincularTouch('btnTouchDer', 'ArrowRight');
vincularTouch('btnTouchAccion', 'Space');

// TABS DE SELECCIÓN
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('activo'));
        tab.classList.add('activo');
        juegoActual = tab.dataset.game;

        limpiarLoops();
        cargarLeaderboard(juegoActual);

        if (juegoActual === 'snake') iniciarSnake();
        else if (juegoActual === 'tetris') iniciarTetris();
        else if (juegoActual === 'buscaminas') iniciarBuscaminas();
        else if (juegoActual === 'doom') cargarDoom();
    });
});

window.addEventListener('DOMContentLoaded', () => {
    cargarLeaderboard('snake');
    iniciarSnake();
});
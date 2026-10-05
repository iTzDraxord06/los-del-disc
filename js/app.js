import { inicializarSesion } from './session.js';
import { inicializarNotificaciones } from './notificacion.js';

const PAGINAS = {
    inicio: {
        html: 'html/inicio.html',
        css: 'css/pages/inicio.css',
        modulo: null,
        titulo: 'Inicio'
    },
    muro: {
        html: 'html/muro.html',
        css: 'css/pages/muro.css',
        modulo: './pages/muro.js',
        titulo: 'Muro'
    },
    miembros: {
        html: 'html/miembros.html',
        css: 'css/pages/miembros.css',
        modulo: './pages/miembros.js',
        titulo: 'Miembros'
    },
    anuncios: {
        html: 'html/anuncios.html',
        css: 'css/pages/anuncios.css',
        modulo: './pages/anuncios.js',
        titulo: 'Anuncios'
    },
    arcade: {
        html: 'html/arcade.html',
        css: 'css/pages/arcade.css',
        modulo: './pages/arcade.js',
        titulo: 'Arcade'
    }
};

let paginaActual = null;
let moduloActual = null;
let parametrosActuales = {};

async function cargarHTML(ruta) {
    const res = await fetch(ruta);
    if (!res.ok) throw new Error(`No se pudo cargar ${ruta}`);
    return await res.text();
}

async function cargarComponentesGlobales() {
    const header = document.getElementById('appHeader');
    const sidebar = document.getElementById('appSidebar');

    if (!header || !sidebar) throw new Error('No existen appHeader o appSidebar.');

    const [htmlHeader, htmlSidebar] = await Promise.all([
        cargarHTML('components/header.html'),
        cargarHTML('components/sidebar.html')
    ]);

    header.innerHTML = htmlHeader;
    sidebar.innerHTML = htmlSidebar;
}

function cargarCSSPagina(ruta) {
    let link = document.getElementById('cssPaginaActual');

    if (!link) {
        link = document.createElement('link');
        link.id = 'cssPaginaActual';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    link.href = ruta;
}

function destruirModuloActual() {
    if (moduloActual && typeof moduloActual.destroy === 'function') {
        try {
            moduloActual.destroy();
        } catch (error) {
            console.error('Error cerrando módulo:', error);
        }
    }

    moduloActual = null;
}

function mostrarErrorPagina(error) {
    const contenedor = document.getElementById('appContenido');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="estado-error-pagina">
            <h2>😵 Algo salió mal</h2>
            <p>No se pudo cargar esta sección.</p>
            <button type="button" class="btn-primary" data-page="inicio">Volver al inicio</button>
        </div>
    `;

    console.error(error);
}

function actualizarNavegacionActiva(pagina) {
    document.querySelectorAll('.nav-link[data-page]').forEach(el => {
        el.classList.toggle('activo-nav', el.dataset.page === pagina);
    });

    document.querySelectorAll('.btn-canal[data-page]').forEach(el => {
        el.classList.toggle('canal-activo', el.dataset.page === pagina);
    });
}

function cerrarSidebarMovil() {
    document.getElementById('barraLateral')?.classList.remove('abierto');
}

function actualizarURL(pagina, parametros = {}, reemplazar = false) {
    const url = new URL(window.location.href);

    url.hash = pagina;
    url.search = '';

    Object.entries(parametros).forEach(([clave, valor]) => {
        if (valor !== undefined && valor !== null) {
            url.searchParams.set(clave, valor);
        }
    });

    if (reemplazar) {
        history.replaceState({ pagina, parametros }, '', url);
    } else {
        history.pushState({ pagina, parametros }, '', url);
    }
}

export async function navegarA(pagina, parametros = {}, opciones = {}) {
    if (!PAGINAS[pagina]) pagina = 'inicio';

    const config = PAGINAS[pagina];
    const contenedor = document.getElementById('appContenido');

    if (!contenedor) return;

    if (
        paginaActual === pagina &&
        JSON.stringify(parametrosActuales) === JSON.stringify(parametros) &&
        !opciones.forzar
    ) {
        cerrarSidebarMovil();
        return;
    }

    destruirModuloActual();

    contenedor.innerHTML = `
        <div class="cargando-pagina">
            <p>Cargando ${config.titulo}...</p>
        </div>
    `;

    try {
        const html = await cargarHTML(config.html);

        cargarCSSPagina(config.css);
        contenedor.innerHTML = html;

        paginaActual = pagina;
        parametrosActuales = parametros;

        actualizarNavegacionActiva(pagina);
        cerrarSidebarMovil();

        document.title = `${config.titulo} | Los del Disc`;

        if (!opciones.noActualizarURL) {
            actualizarURL(pagina, parametros, opciones.reemplazar);
        }

        if (config.modulo) {
            moduloActual = await import(config.modulo);

            if (typeof moduloActual.init === 'function') {
                await moduloActual.init(parametros);
            }
        }

        window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
        mostrarErrorPagina(error);
    }
}

function configurarNavegacion() {
    document.addEventListener('click', e => {
        if (e.target.closest('#btnMenu')) return;

        const elemento = e.target.closest('[data-page]');
        if (!elemento) return;

        const pagina = elemento.dataset.page;
        if (!PAGINAS[pagina]) return;

        e.preventDefault();
        navegarA(pagina);
    });
}

function configurarNavegacionGlobal() {
    window.addEventListener('navegar-app', e => {
        const pagina = e.detail?.pagina;
        const parametros = e.detail?.parametros || {};

        if (pagina) navegarA(pagina, parametros);
    });
}

function configurarTecladoLogo() {
    document.addEventListener('keydown', e => {
        const logo = e.target.closest('.logo[data-page]');
        if (!logo) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navegarA('inicio');
        }
    });
}

function obtenerRutaInicial() {
    const hash = window.location.hash.replace('#', '').trim();
    const pagina = PAGINAS[hash] ? hash : 'inicio';
    const search = new URLSearchParams(window.location.search);
    const parametros = {};

    search.forEach((valor, clave) => {
        parametros[clave] = valor;
    });

    return { pagina, parametros };
}

function configurarHistorial() {
    window.addEventListener('popstate', () => {
        const ruta = obtenerRutaInicial();

        navegarA(ruta.pagina, ruta.parametros, {
            noActualizarURL: true,
            forzar: true
        });
    });
}

async function verificarPopupAnuncio() {
    const popup = document.getElementById('popupAnuncio');
    if (!popup) return;

    try {
        const res = await fetch('/api/anuncio');
        if (!res.ok) return;

        const anuncios = await res.json();
        if (!Array.isArray(anuncios) || anuncios.length === 0) return;

        const ultimo = anuncios[0];
        const vistoId = localStorage.getItem('anuncio_visto_id');

        if (vistoId && parseInt(vistoId) === ultimo.Id) return;

        const titulo = document.getElementById('popupTitulo');
        const resumen = document.getElementById('popupResumen');

        if (titulo) titulo.textContent = ultimo.Titulo || 'Aviso importante';

        if (resumen) {
            const desc = (ultimo.Descripcion || '').trim();
            resumen.textContent = desc.length > 95
                ? desc.substring(0, 95) + '...'
                : desc || 'Entra para ver los detalles.';
        }

        popup.classList.remove('oculto');

        const descartar = () => {
            popup.classList.add('oculto');
            localStorage.setItem('anuncio_visto_id', ultimo.Id);
        };

        const btnDesc = document.getElementById('btnDescartarAnuncio');
        const btnX = document.getElementById('btnCerrarPopupX');
        const btnIr = document.getElementById('btnIrAnuncio');

        if (btnDesc) btnDesc.onclick = descartar;
        if (btnX) btnX.onclick = descartar;

        if (btnIr) {
            btnIr.onclick = () => {
                localStorage.setItem('anuncio_visto_id', ultimo.Id);
                popup.classList.add('oculto');
                navegarA('anuncios');
            };
        }
    } catch (error) {
        console.error('Error verificando anuncio:', error);
    }
}

async function iniciarAplicacion() {
    try {
        const usuario = JSON.parse(localStorage.getItem('disc_user'));

        if (!usuario) {
            window.location.href = 'login.html';
            return;
        }

        await cargarComponentesGlobales();

        inicializarSesion();
        inicializarNotificaciones();
        configurarNavegacion();
        configurarNavegacionGlobal();
        configurarTecladoLogo();
        configurarHistorial();

        const ruta = obtenerRutaInicial();

        await navegarA(ruta.pagina, ruta.parametros, {
            reemplazar: true
        });

        verificarPopupAnuncio();
    } catch (error) {
        console.error('Error iniciando Los del Disc:', error);

        const contenido = document.getElementById('appContenido');

        if (contenido) {
            contenido.innerHTML = `
                <div class="estado-error-pagina">
                    <h2>Error al iniciar</h2>
                    <p>No se pudo cargar Los del Disc.</p>
                    <button type="button" class="btn-primary" onclick="location.reload()">Reintentar</button>
                </div>
            `;
        }
    }
}

iniciarAplicacion();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const {
    subirADrive,
    obtenerVideoDrive,
    obtenerInfoVideoDrive,
    obtenerUrlAutorizacion,
    procesarCallback
} = require('./driveStorage');

process.on('uncaughtException', (err) => console.error('ERROR NO CONTROLADO:', err));
process.on('unhandledRejection', (err) => console.error('PROMESA NO CONTROLADA:', err));

const app = express();
app.use(cors());
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// 1. Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 't0q7ltll',
    api_key: process.env.CLOUDINARY_API_KEY || '421676215584541',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'RBJuAR6QFd4D0EjOGvvwmBPtiGg'
});

// 2. Storage de Multer flexible para imágenes (Cloudinary)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'los-del-disc',
        resource_type: 'auto'
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }
});

// Multer en memoria para archivos pesados / Google Drive (hasta 30 MB)
const uploadMemory = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 }
});

const manejarSubida = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            console.error('Error al procesar archivos en Cloudinary/Multer:', err);
            return res.status(400).json({ error: 'Error al subir la imagen: ' + err.message });
        }
        next();
    });
};

const rutaImagenes = path.join(__dirname, 'imagenes');
if (!fs.existsSync(rutaImagenes)) {
    fs.mkdirSync(rutaImagenes, { recursive: true });
}
app.use('/imagenes', express.static(rutaImagenes));
app.use(express.static(path.join(__dirname)));

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_DATABASE || 'DiscordFriendsDB',
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

let pool;
sql.connect(dbConfig)
    .then(p => {
        pool = p;
        console.log('Conectado a SQL Server (DiscordFriendsDB)');
    })
    .catch(err => console.error('Error BD:', err.message));

// ================= RUTAS DE VISTAS =================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/miembros', (req, res) => res.sendFile(path.join(__dirname, 'miembros.html')));
app.get('/muro', (req, res) => res.sendFile(path.join(__dirname, 'muro.html')));
app.get('/anuncios', (req, res) => res.sendFile(path.join(__dirname, 'anuncios.html')));
app.get('/configuracion', (req, res) => res.sendFile(path.join(__dirname, 'configuracion.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

app.get('/ping', (req, res) => res.status(200).send('pong'));

// ================= GOOGLE DRIVE OAUTH =================

// Paso 1: iniciar autorización con Google
app.get('/api/drive/auth', (req, res) => {
    try {
        const url = obtenerUrlAutorizacion();

        res.redirect(url);
    } catch (err) {
        console.error('Error iniciando OAuth de Google Drive:', err);
        res.status(500).send(`
            <h1>Error iniciando autorización</h1>
            <p>${err.message}</p>
        `);
    }
});

// Paso 2: Google devuelve el código de autorización
app.get('/api/drive/callback', async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).send(`
                <h1>Error de autorización</h1>
                <p>Google no devolvió el código de autorización.</p>
            `);
        }

        const tokens = await procesarCallback(code);

        if (!tokens.refresh_token) {
            return res.status(500).send(`
                <h1>No se obtuvo el Refresh Token</h1>
                <p>
                    Google no devolvió un refresh token.
                    Vuelve a iniciar el proceso de autorización.
                </p>
            `);
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Google Drive autorizado</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background: #111;
                        color: white;
                        padding: 40px;
                    }

                    .contenedor {
                        max-width: 800px;
                        margin: auto;
                        background: #222;
                        padding: 30px;
                        border-radius: 12px;
                    }

                    code {
                        display: block;
                        background: #000;
                        padding: 15px;
                        margin-top: 15px;
                        word-break: break-all;
                        border-radius: 8px;
                    }

                    .advertencia {
                        color: #ffcc00;
                    }
                </style>
            </head>

            <body>
                <div class="contenedor">
                    <h1>✅ Google Drive autorizado</h1>

                    <p>
                        Google autorizó correctamente el acceso a tu Drive.
                    </p>

                    <p>
                        Copia el siguiente valor y agrégalo en Render como:
                    </p>

                    <h2>GOOGLE_REFRESH_TOKEN</h2>

                    <code>${tokens.refresh_token}</code>

                    <p class="advertencia">
                        ⚠️ No compartas este token con nadie.
                    </p>

                    <p>
                        Después de agregarlo en Render, haz un nuevo deploy
                        y prueba subir un video.
                    </p>
                </div>
            </body>
            </html>
        `);

    } catch (err) {
        console.error('Error en callback OAuth de Google Drive:', err);

        res.status(500).send(`
            <h1>Error durante la autorización</h1>
            <p>${err.message}</p>
        `);
    }
});

// ================= AUTENTICACIÓN Y PERFIL =================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    try {
        const result = await pool.request()
            .input('u', sql.NVarChar, username)
            .input('p', sql.NVarChar, password)
            .query('SELECT Id, Username, NombreVisible, RolApp FROM UsuariosWeb WHERE Username = @u AND Password = @p');

        if (result.recordset.length > 0) {
            res.json({ exito: true, usuario: result.recordset[0] });
        } else {
            res.status(401).json({ exito: false, mensaje: 'Usuario o contraseña incorrectos' });
        }
    } catch (err) {
        console.error('Error en /api/login:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { username, password, nombreVisible } = req.body || {};
    try {
        const uLimpio = (username || '').trim();
        const pLimpio = (password || '').trim();
        const nLimpio = (nombreVisible || '').trim();

        if (uLimpio.length < 4 || pLimpio.length < 6 || nLimpio.length < 3) {
            return res.status(400).json({ error: 'Datos no válidos para el registro.' });
        }

        const insertUser = await pool.request()
            .input('u', sql.NVarChar, uLimpio)
            .input('p', sql.NVarChar, pLimpio)
            .input('n', sql.NVarChar, nLimpio)
            .input('r', sql.NVarChar, 'Lector')
            .query(`INSERT INTO UsuariosWeb (Username, Password, NombreVisible, RolApp) 
                    OUTPUT INSERTED.Id 
                    VALUES (@u, @p, @n, @r)`);

        const nuevoUserId = insertUser.recordset[0].Id;

        await pool.request()
            .input('tag', sql.NVarChar, uLimpio)
            .input('nombre', sql.NVarChar, nLimpio)
            .input('rol', sql.NVarChar, 'Miembro')
            .input('foto', sql.NVarChar, 'imagenes/default.png')
            .input('desc', sql.NVarChar, '¡Nuevo miembro en el servidor!')
            .input('userId', sql.Int, nuevoUserId)
            .query(`INSERT INTO Amigos (DiscordTag, NombreVisible, RolServidor, FotoRuta, Descripcion, UsuarioId)
                    VALUES (@tag, @nombre, @rol, @foto, @desc, @userId)`);

        res.json({ exito: true, mensaje: 'Usuario y perfil creados con éxito.' });
    } catch (err) {
        console.error('Error en /api/register:', err);
        res.status(400).json({ error: 'El usuario ya existe o hubo un problema.' });
    }
});

app.put('/api/usuarios/perfil', async (req, res) => {
    try {
        const { userId, newUsername, nombreVisible, passwordActual, nuevoPassword } = req.body || {};
        if (!userId) return res.status(400).json({ error: 'Falta el ID del usuario.' });

        const userCheck = await pool.request()
            .input('id', sql.Int, userId)
            .query('SELECT Id, Username, Password, RolApp, NombreVisible FROM UsuariosWeb WHERE Id = @id');

        if (userCheck.recordset.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });

        const usuarioDB = userCheck.recordset[0];
        const oldNombreVisible = usuarioDB.NombreVisible;

        let usernameFinal = usuarioDB.Username;
        if (newUsername && newUsername.trim() !== '') {
            const cleanUser = newUsername.trim();
            if (cleanUser.length < 4) return res.status(400).json({ error: 'El usuario debe tener al menos 4 caracteres.' });

            if (cleanUser.toLowerCase() !== usuarioDB.Username.toLowerCase()) {
                const existe = await pool.request()
                    .input('u', sql.NVarChar, cleanUser)
                    .input('id', sql.Int, userId)
                    .query('SELECT Id FROM UsuariosWeb WHERE LOWER(Username) = LOWER(@u) AND Id <> @id');

                if (existe.recordset.length > 0) return res.status(400).json({ error: 'Ese usuario ya está en uso.' });
            }
            usernameFinal = cleanUser;
        }

        const nombreFinal = (nombreVisible && nombreVisible.trim() !== '') ? nombreVisible.trim() : usuarioDB.NombreVisible;
        if (nombreFinal.length < 3) return res.status(400).json({ error: 'El apodo debe tener al menos 3 caracteres.' });

        let passwordFinal = usuarioDB.Password;
        if (nuevoPassword && nuevoPassword.trim() !== '') {
            if (nuevoPassword.trim().length < 6) return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres.' });
            if (!passwordActual || passwordActual !== usuarioDB.Password) return res.status(400).json({ error: 'Contraseña actual incorrecta.' });
            passwordFinal = nuevoPassword.trim();
        }

        await pool.request()
            .input('id', sql.Int, userId)
            .input('u', sql.NVarChar, usernameFinal)
            .input('nombre', sql.NVarChar, nombreFinal)
            .input('pass', sql.NVarChar, passwordFinal)
            .query('UPDATE UsuariosWeb SET Username = @u, NombreVisible = @nombre, Password = @pass WHERE Id = @id');

        if (oldNombreVisible && oldNombreVisible !== nombreFinal) {
            await pool.request()
                .input('nuevoAutor', sql.NVarChar, nombreFinal)
                .input('viejoAutor', sql.NVarChar, oldNombreVisible)
                .query(`
                    UPDATE Comentarios SET Autor = @nuevoAutor WHERE Autor = @viejoAutor;
                    UPDATE PublicacionesGlobales SET Autor = @nuevoAutor WHERE Autor = @viejoAutor;
                    UPDATE Amigos SET NombreVisible = @nuevoAutor WHERE UsuarioId = ${userId};
                `);
        }

        res.json({
            exito: true,
            mensaje: 'Datos actualizados.',
            usuario: { Id: usuarioDB.Id, Username: usernameFinal, NombreVisible: nombreFinal, RolApp: usuarioDB.RolApp }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno en la BD.' });
    }
});

// ================= AMIGOS / INTEGRANTES =================
app.get('/api/amigos', async (req, res) => {
    try {
        const amigosResult = await pool.request().query('SELECT * FROM Amigos ORDER BY Id ASC');
        const fotosResult = await pool.request().query('SELECT Id, AmigoId, FotoUrl FROM FotosAmigo ORDER BY Id ASC');

        const amigos = amigosResult.recordset.map(amigo => {
            let fotos = fotosResult.recordset
                .filter(f => f.AmigoId === amigo.Id)
                .map(f => ({ id: f.Id, url: f.FotoUrl }));

            if (fotos.length === 0) {
                if (amigo.Waifu1) fotos.push({ id: null, url: amigo.Waifu1 });
                if (amigo.Waifu2) fotos.push({ id: null, url: amigo.Waifu2 });
                if (amigo.Waifu3) fotos.push({ id: null, url: amigo.Waifu3 });
            }

            return {
                ...amigo,
                DiscordUsername: amigo.DiscordTag || '',
                Apodo: amigo.NombreVisible || 'Sin nombre',
                AvatarUrl: amigo.FotoRuta || 'imagenes/default.png',
                RolServidor: amigo.RolServidor || amigo.Rol || 'Miembro',
                Fotos: fotos
            };
        });
        res.json(amigos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/amigos', manejarSubida, async (req, res) => {
    try {
        const body = req.body || {};
        const files = req.files || [];
        if (body.rolSolicitante !== 'Admin') return res.status(403).json({ error: 'Solo Admin puede agregar amigos.' });

        const avatarF = files.find(f => f.fieldname === 'avatarFile');
        const waifuFiles = files.filter(f => f.fieldname === 'waifuFiles');
        const fotoRuta = avatarF ? avatarF.path : 'imagenes/default.png';

        const insertRes = await pool.request()
            .input('tag', sql.NVarChar, body.discordUsername || '')
            .input('nombre', sql.NVarChar, body.apodo || '')
            .input('rol', sql.NVarChar, body.rol || 'Miembro')
            .input('foto', sql.NVarChar, fotoRuta)
            .input('desc', sql.NVarChar, body.descripcion || '')
            .query(`INSERT INTO Amigos (DiscordTag, NombreVisible, RolServidor, FotoRuta, Descripcion) 
                    OUTPUT INSERTED.Id VALUES (@tag, @nombre, @rol, @foto, @desc)`);

        const amigoId = insertRes.recordset[0].Id;
        for (const file of waifuFiles) {
            await pool.request()
                .input('amigoId', sql.Int, amigoId)
                .input('fotoUrl', sql.NVarChar, file.path)
                .query('INSERT INTO FotosAmigo (AmigoId, FotoUrl) VALUES (@amigoId, @fotoUrl)');
        }

        const waifuUrlDirectas = Array.isArray(body.waifuUrlDirectas)
            ? body.waifuUrlDirectas
            : (body.waifuUrlDirectas ? [body.waifuUrlDirectas] : []);
        for (const url of waifuUrlDirectas) {
            if (url) {
                await pool.request()
                    .input('amigoId', sql.Int, amigoId)
                    .input('fotoUrl', sql.NVarChar, url)
                    .query('INSERT INTO FotosAmigo (AmigoId, FotoUrl) VALUES (@amigoId, @fotoUrl)');
            }
        }
        res.json({ mensaje: 'Amigo agregado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/amigos/:id', manejarSubida, async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};
        const files = req.files || [];

        const amigoCheck = await pool.request().input('id', sql.Int, id).query('SELECT Id, UsuarioId, FotoRuta FROM Amigos WHERE Id = @id');
        if (amigoCheck.recordset.length === 0) return res.status(404).json({ error: 'Perfil no encontrado.' });

        const amigoActual = amigoCheck.recordset[0];
        const esAdmin = body.rolSolicitante === 'Admin';
        const esDueno = body.solicitanteId && parseInt(body.solicitanteId) === amigoActual.UsuarioId;

        if (!esAdmin && !esDueno) return res.status(403).json({ error: 'Sin permiso para editar este perfil.' });

        const avatarF = files.find(f => f.fieldname === 'avatarFile');
        const waifuFiles = files.filter(f => f.fieldname === 'waifuFiles');
        const fotoRuta = avatarF ? avatarF.path : (body.avatarUrlActual || amigoActual.FotoRuta || 'imagenes/default.png');

        let queryUpdate = `UPDATE Amigos SET DiscordTag = @tag, NombreVisible = @nombre, FotoRuta = @foto, Descripcion = @desc`;
        if (esAdmin) queryUpdate += `, RolServidor = @rol `;
        queryUpdate += ` WHERE Id = @id`;

        const requestUpdate = pool.request()
            .input('id', sql.Int, id)
            .input('tag', sql.NVarChar, body.discordUsername || '')
            .input('nombre', sql.NVarChar, body.apodo || '')
            .input('foto', sql.NVarChar, fotoRuta)
            .input('desc', sql.NVarChar, body.descripcion || '');

        if (esAdmin) requestUpdate.input('rol', sql.NVarChar, body.rol || 'Miembro');
        await requestUpdate.query(queryUpdate);

        for (const file of waifuFiles) {
            await pool.request()
                .input('amigoId', sql.Int, id)
                .input('fotoUrl', sql.NVarChar, file.path)
                .query('INSERT INTO FotosAmigo (AmigoId, FotoUrl) VALUES (@amigoId, @fotoUrl)');
        }

        const waifuUrlDirectas = Array.isArray(body.waifuUrlDirectas)
            ? body.waifuUrlDirectas
            : (body.waifuUrlDirectas ? [body.waifuUrlDirectas] : []);
        for (const url of waifuUrlDirectas) {
            if (url) {
                await pool.request()
                    .input('amigoId', sql.Int, id)
                    .input('fotoUrl', sql.NVarChar, url)
                    .query('INSERT INTO FotosAmigo (AmigoId, FotoUrl) VALUES (@amigoId, @fotoUrl)');
            }
        }
        res.json({ mensaje: 'Perfil actualizado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/amigos/:id', async (req, res) => {
    if (req.query.rolSolicitante !== 'Admin') return res.status(403).json({ error: 'Solo administradores.' });
    try {
        await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Amigos WHERE Id = @id');
        res.json({ mensaje: 'Amigo eliminado' });
    } catch (err) {
        res.status(500).json({ error: 'No se pudo eliminar.' });
    }
});

app.delete('/api/fotos/:id', async (req, res) => {
    const { id } = req.params;
    const { rolSolicitante, solicitanteId } = req.query;

    try {
        const check = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT f.Id, a.UsuarioId 
                FROM FotosAmigo f 
                INNER JOIN Amigos a ON f.AmigoId = a.Id 
                WHERE f.Id = @id
            `);

        if (check.recordset.length === 0) {
            return res.status(404).json({ error: 'Foto no encontrada.' });
        }

        const fotoInfo = check.recordset[0];
        const esAdmin = rolSolicitante === 'Admin';
        const esDueno = solicitanteId && parseInt(solicitanteId) === fotoInfo.UsuarioId;

        if (!esAdmin && !esDueno) {
            return res.status(403).json({ error: 'No tienes permiso para borrar esta foto.' });
        }

        await pool.request().input('id', sql.Int, id).query('DELETE FROM FotosAmigo WHERE Id = @id');
        res.json({ mensaje: 'Foto eliminada correctamente' });
    } catch (err) {
        console.error('Error al borrar foto:', err);
        res.status(500).json({ error: 'No se pudo eliminar la foto.' });
    }
});

// ================= MURO GLOBAL =================
app.get('/api/publicaciones-globales', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT * FROM PublicacionesGlobales ORDER BY Id DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/publicaciones-globales', upload.single('imagenPost'), async (req, res) => {
    const { autor, contenido, respuestaAId, imagenUrlDirecta } = req.body || {};
    try {
        // Las imágenes pasan por Cloudinary; los videos llegan previamente desde Google Drive.
        const imgUrl = req.file ? req.file.path : (imagenUrlDirecta || null);
        const insertRes = await pool.request()
            .input('autor', sql.NVarChar, autor)
            .input('texto', sql.NVarChar, contenido || '')
            .input('img', sql.NVarChar, imgUrl)
            .input('parent', sql.Int, respuestaAId ? parseInt(respuestaAId) : null)
            .query('INSERT INTO PublicacionesGlobales (Autor, Texto, Fecha, ImagenUrl, RespuestaAId) OUTPUT INSERTED.Id VALUES (@autor, @texto, GETDATE(), @img, @parent)');

        const newPostId = insertRes.recordset[0].Id;

        if (respuestaAId) {
            const padreInfo = await pool.request()
                .input('pId', sql.Int, respuestaAId)
                .query('SELECT Autor FROM PublicacionesGlobales WHERE Id = @pId');
            if (padreInfo.recordset.length > 0) {
                const nombrePadre = padreInfo.recordset[0].Autor;
                const destCheck = await pool.request()
                    .input('nom', sql.NVarChar, nombrePadre)
                    .query('SELECT TOP 1 UsuarioId FROM Amigos WHERE NombreVisible = @nom AND UsuarioId IS NOT NULL');
                console.log('DEBUG MURO - Autor padre:', nombrePadre);
                console.log('DEBUG MURO - Usuario encontrado:', destCheck.recordset);       
                if (destCheck.recordset.length > 0 && destCheck.recordset[0].UsuarioId) {
                    await pool.request()
                        .input('uDest', sql.Int, destCheck.recordset[0].UsuarioId)
                        .input('autor', sql.NVarChar, autor || 'Alguien')
                        .input('comId', sql.Int, newPostId)
                        .input('txt', sql.NVarChar, (contenido || '').substring(0, 100))
                        .query(`INSERT INTO Notificaciones (UsuarioDestinoId, AutorAccion, Tipo, DestinoId, ComentarioId, TextoPrevio)
                                VALUES (@uDest, @autor, 'MURO', @comId, @comId, @txt)`);
                }
            }
        }

        res.json({ mensaje: 'Publicación enviada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/publicaciones-globales/:id', async (req, res) => {
    const { id } = req.params;
    const { texto, rolSolicitante, solicitanteNombre } = req.body || {};

    if (!texto || !texto.trim()) return res.status(400).json({ error: 'El texto no puede estar vacío.' });

    try {
        const check = await pool.request().input('id', sql.Int, id).query('SELECT Autor FROM PublicacionesGlobales WHERE Id = @id');
        if (check.recordset.length === 0) return res.status(404).json({ error: 'Publicación no encontrada.' });

        const autor = check.recordset[0].Autor;
        if (rolSolicitante !== 'Admin' && solicitanteNombre !== autor) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta publicación.' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('texto', sql.NVarChar, texto.trim())
            .query('UPDATE PublicacionesGlobales SET Texto = @texto WHERE Id = @id');

        res.json({ mensaje: 'Publicación editada correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al editar publicación.' });
    }
});

app.delete('/api/publicaciones-globales/:id', async (req, res) => {
    const { id } = req.params;
    const { rolSolicitante, solicitanteNombre } = req.query;
    try {
        const check = await pool.request().input('id', sql.Int, id).query('SELECT Autor FROM PublicacionesGlobales WHERE Id = @id');
        if (check.recordset.length === 0) return res.status(404).json({ error: 'Publicación no encontrada.' });

        const autor = check.recordset[0].Autor;
        if (rolSolicitante !== 'Admin' && solicitanteNombre !== autor) {
            return res.status(403).json({ error: 'Sin permiso para borrar esta publicación.' });
        }

        await pool.request().input('id', sql.Int, id).query('DELETE FROM PublicacionesGlobales WHERE Id = @id');
        res.json({ mensaje: 'Publicación eliminada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar publicación.' });
    }
});

// ================= COMENTARIOS EN PERFILES =================
app.get('/api/comentarios/:amigoId', async (req, res) => {
    try {
        const result = await pool.request()
            .input('amigoId', sql.Int, req.params.amigoId)
            .query('SELECT Id, AmigoId, Autor, Texto, Fecha, RespuestaAId, ImagenUrl FROM Comentarios WHERE AmigoId = @amigoId ORDER BY Id DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/comentarios', upload.single('imagenComentario'), async (req, res) => {
    const { amigoId, autor, contenido, respuestaAId, imagenUrlDirecta } = req.body || {};
    try {
        const imgUrl = req.file ? req.file.path : (imagenUrlDirecta || null);
        if ((!contenido || !contenido.trim()) && !imgUrl) {
            return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
        }

        const insertRes = await pool.request()
            .input('amigoId', sql.Int, amigoId)
            .input('autor', sql.NVarChar, autor)
            .input('texto', sql.NVarChar, (contenido || '').trim())
            .input('parent', sql.Int, respuestaAId ? parseInt(respuestaAId) : null)
            .input('img', sql.NVarChar, imgUrl)
            .query('INSERT INTO Comentarios (AmigoId, Autor, Texto, Fecha, RespuestaAId, ImagenUrl) OUTPUT INSERTED.Id VALUES (@amigoId, @autor, @texto, GETDATE(), @parent, @img)');

        const newComId = insertRes.recordset[0].Id;

        // Buscar el UsuarioId del dueño del perfil (`amigoId`)
        const duenoCheck = await pool.request()
            .input('aId', sql.Int, amigoId)
            .query('SELECT UsuarioId FROM Amigos WHERE Id = @aId');

        const duenoUsuarioId = duenoCheck.recordset.length > 0 ? duenoCheck.recordset[0].UsuarioId : null;

        // Buscar el UsuarioId de quien comento (si existe en Amigos mediante NombreVisible/autor)
        const autorCheck = await pool.request()
            .input('aut', sql.NVarChar, autor)
            .query('SELECT TOP 1 UsuarioId FROM Amigos WHERE NombreVisible = @aut AND UsuarioId IS NOT NULL');

        const autorUsuarioId = autorCheck.recordset.length > 0 ? autorCheck.recordset[0].UsuarioId : null;

        // 1. Notificar si es respuesta anidada a otro comentario
        if (respuestaAId) {
            const padreInfo = await pool.request()
                .input('pId', sql.Int, respuestaAId)
                .query('SELECT Autor FROM Comentarios WHERE Id = @pId');
            if (padreInfo.recordset.length > 0) {
                const nombrePadre = padreInfo.recordset[0].Autor;
                const destCheck = await pool.request()
                    .input('nom', sql.NVarChar, nombrePadre)
                    .query('SELECT TOP 1 UsuarioId FROM Amigos WHERE NombreVisible = @nom AND UsuarioId IS NOT NULL');
                if (destCheck.recordset.length > 0 && destCheck.recordset[0].UsuarioId) {
                    const targetUId = destCheck.recordset[0].UsuarioId;
                    if (targetUId !== autorUsuarioId) {
                        await pool.request()
                            .input('uDest', sql.Int, targetUId)
                            .input('autor', sql.NVarChar, autor || 'Alguien')
                            .input('destId', sql.Int, amigoId)
                            .input('comId', sql.Int, newComId)
                            .input('txt', sql.NVarChar, (contenido || '').substring(0, 100))
                            .query(`INSERT INTO Notificaciones (UsuarioDestinoId, AutorAccion, Tipo, DestinoId, ComentarioId, TextoPrevio)
                                    VALUES (@uDest, @autor, 'PERFIL', @destId, @comId, @txt)`);
                    }
                }
            }
        }
        // 2. Si NO es respuesta anidada, notificar al dueño del perfil
        else if (duenoUsuarioId && duenoUsuarioId !== autorUsuarioId) {
            await pool.request()
                .input('uDest', sql.Int, duenoUsuarioId)
                .input('autor', sql.NVarChar, autor || 'Alguien')
                .input('destId', sql.Int, amigoId)
                .input('comId', sql.Int, newComId)
                .input('txt', sql.NVarChar, (contenido || '').substring(0, 100))
                .query(`INSERT INTO Notificaciones (UsuarioDestinoId, AutorAccion, Tipo, DestinoId, ComentarioId, TextoPrevio)
                        VALUES (@uDest, @autor, 'PERFIL', @destId, @comId, @txt)`);
        }

        res.json({ mensaje: 'Comentario publicado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/comentarios/:id', async (req, res) => {
    const { id } = req.params;
    const { texto, rolSolicitante, solicitanteNombre } = req.body || {};

    if (!texto || !texto.trim()) return res.status(400).json({ error: 'El texto no puede estar vacío.' });

    try {
        const check = await pool.request().input('id', sql.Int, id).query('SELECT Autor FROM Comentarios WHERE Id = @id');
        if (check.recordset.length === 0) return res.status(404).json({ error: 'Comentario no encontrado.' });

        const autor = check.recordset[0].Autor;
        if (rolSolicitante !== 'Admin' && solicitanteNombre !== autor) {
            return res.status(403).json({ error: 'No tienes permiso para editar este comentario.' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('texto', sql.NVarChar, texto.trim())
            .query('UPDATE Comentarios SET Texto = @texto WHERE Id = @id');

        res.json({ mensaje: 'Comentario editado correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al editar comentario.' });
    }
});

app.delete('/api/comentarios/:id', async (req, res) => {
    const { id } = req.params;
    const { rolSolicitante, solicitanteNombre } = req.query;
    try {
        const check = await pool.request().input('id', sql.Int, id).query('SELECT Autor FROM Comentarios WHERE Id = @id');
        if (check.recordset.length === 0) return res.status(404).json({ error: 'Comentario no encontrado.' });

        const autor = check.recordset[0].Autor;
        if (rolSolicitante !== 'Admin' && solicitanteNombre !== autor) {
            return res.status(403).json({ error: 'Sin permiso para borrar este comentario.' });
        }

        await pool.request().input('id', sql.Int, id).query('DELETE FROM Comentarios WHERE Id = @id');
        res.json({ mensaje: 'Comentario eliminado' });
    } catch (err) {
        res.status(500).json({ error: 'No se pudo eliminar el comentario.' });
    }
});

// ================= GOOGLE DRIVE MEDIA (VIDEOS/ARCHIVOS PESADOS) =================
app.post('/api/media-drive', uploadMemory.single('archivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envió ningún archivo.' });
        }
        const nombreUnico = `media_${Date.now()}_${req.file.originalname}`;
        const driveUrl = await subirADrive(req.file.buffer, nombreUnico, req.file.mimetype);
        res.json({ mensaje: 'Subido a Google Drive con éxito', url: driveUrl });
    } catch (err) {
        console.error('Error subiendo a Drive:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/media-drive/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const range = req.headers.range;

        const info = await obtenerInfoVideoDrive(fileId);
        const tamaño = Number(info.size);

        if (!tamaño) {
            return res.status(500).json({
                error: 'No se pudo obtener el tamaño del video.'
            });
        }

        if (!range) {
            const response = await obtenerVideoDrive(fileId);

            res.status(200);
            res.setHeader('Content-Type', info.mimeType || 'video/mp4');
            res.setHeader('Content-Length', tamaño);
            res.setHeader('Accept-Ranges', 'bytes');

            response.data.pipe(res);
            return;
        }

        const match = range.match(/bytes=(\d+)-(\d*)/);

        if (!match) {
            return res.status(416).json({
                error: 'Rango de video no válido.'
            });
        }

        const inicio = Number(match[1]);
        let fin = match[2] ? Number(match[2]) : tamaño - 1;

        if (inicio >= tamaño) {
            res.status(416);
            res.setHeader('Content-Range', `bytes */${tamaño}`);
            return res.end();
        }

        if (fin >= tamaño) {
            fin = tamaño - 1;
        }

        const rangoDrive = `bytes=${inicio}-${fin}`;

        const response = await obtenerVideoDrive(
            fileId,
            rangoDrive
        );

        const longitud = fin - inicio + 1;

        res.status(206);
        res.setHeader(
            'Content-Range',
            `bytes ${inicio}-${fin}/${tamaño}`
        );
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', longitud);
        res.setHeader(
            'Content-Type',
            info.mimeType || 'video/mp4'
        );

        response.data.pipe(res);

    } catch (err) {
        console.error('Error reproduciendo video de Drive:', err);

        res.status(500).json({
            error: 'No se pudo reproducir el video.'
        });
    }
});

// ================= NOTIFICACIONES =================
app.get('/api/notificaciones/:usuarioId', async (req, res) => {
    try {
        const result = await pool.request()
            .input('uId', sql.Int, req.params.usuarioId)
            .query('SELECT TOP 30 * FROM Notificaciones WHERE UsuarioDestinoId = @uId ORDER BY Fecha DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error GET /api/notificaciones:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notificaciones/:id/leer', async (req, res) => {
    try {
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('UPDATE Notificaciones SET Leido = 1 WHERE Id = @id');
        res.json({ mensaje: 'Notificación leída' });
    } catch (err) {
        console.error('Error PUT /api/notificaciones/leer:', err);
        res.status(500).json({ error: err.message });
    }
});

// ================= ANUNCIOS =================
app.get('/api/anuncio', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT * FROM AnuncioGlobal ORDER BY Id DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/anuncio', upload.single('imagenAfiche'), async (req, res) => {
    try {
        const { titulo, descripcion, rolSolicitante, imagenUrlDirecta } = req.body || {};

        if (rolSolicitante !== 'Admin') {
            return res.status(403).json({ error: 'Solo Admin.' });
        }

        // Si viene una URL directa (por ejemplo, Google Drive), usamos esa.
        // Si no, usamos la URL generada por Cloudinary.

        let imgUrl = imagenUrlDirecta || (req.file ? req.file.path : '');

        if (imgUrl.startsWith('[') && imgUrl.includes('](')) {
            const coincidencia = imgUrl.match(/\]\((.*?)\)/);

            if (coincidencia) {
                imgUrl = coincidencia[1];
            }
        }

        await pool.request()
            .input('t', sql.NVarChar, titulo || '')
            .input('d', sql.NVarChar, descripcion || '')
            .input('img', sql.NVarChar, imgUrl)
            .query(`
                INSERT INTO AnuncioGlobal 
                (Titulo, Descripcion, ImagenUrl, Activo) 
                VALUES (@t, @d, @img, 1)
            `);

        res.json({ mensaje: 'Afiche publicado' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/anuncio/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rolSolicitante } = req.query;

        if (rolSolicitante !== 'Admin') {
            return res.status(403).json({ error: 'Solo Admin.' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                DELETE FROM AnuncioGlobal
                WHERE Id = @id
            `);

        res.json({ mensaje: 'Anuncio eliminado correctamente' });

    } catch (err) {
        console.error('Error eliminando anuncio:', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    const INTERVALO_PING = 10 * 60 * 1000;
    const URL_SERVICIO = process.env.RENDER_EXTERNAL_URL;

    if (URL_SERVICIO) {
        setInterval(async () => {
            try {
                const respuesta = await fetch(`${URL_SERVICIO}/ping`);
                console.log(`[KEEP-ALIVE] Ping: ${respuesta.status} - ${new Date().toLocaleTimeString()}`);
            } catch (err) {
                console.warn('[KEEP-ALIVE] Ping fallido:', err.message);
            }
        }, INTERVALO_PING);
    }
});
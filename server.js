const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');

process.on('uncaughtException', (err) => console.error('ERROR NO CONTROLADO:', err));
process.on('unhandledRejection', (err) => console.error('PROMESA NO CONTROLADA:', err));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const rutaImagenes = path.join(__dirname, 'imagenes');
if (!fs.existsSync(rutaImagenes)) {
    fs.mkdirSync(rutaImagenes, { recursive: true });
}
// Servir imágenes con caché en el navegador por 1 día
app.use('/imagenes', express.static(rutaImagenes, { maxAge: '1d' }));

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Multer almacena temporalmente en memoria para que Sharp lo procese
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Función auxiliar para convertir a WebP y redimensionar
async function procesarImagenWebp(file, prefijo = 'img') {
    if (!file) return null;
    const nombreArchivo = `${prefijo}-${Date.now()}-${Math.round(Math.random() * 1E6)}.webp`;
    const rutaDestino = path.join(rutaImagenes, nombreArchivo);

    // Si es un GIF, podemos guardarlo tal cual o procesarlo animado
    const esGif = file.mimetype === 'image/gif';

    if (esGif) {
        await sharp(file.buffer, { animated: true })
            .webp({ quality: 75 })
            .toFile(rutaDestino);
    } else {
        await sharp(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true }) // Evita que suban imágenes gigantescas de 4000px
            .webp({ quality: 80 })
            .toFile(rutaDestino);
    }

    return `imagenes/${nombreArchivo}`;
}

const dbConfig = {
    user: 'admin_discord',
    password: 'ClaveFuerte.2026!',
    server: 'servidor-discord-eduardo.database.windows.net',
    port: 1433,
    database: 'DiscordFriendsDB',
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

let pool;
sql.connect(dbConfig)
    .then(p => {
        pool = p;
        console.log('Conectado a Azure SQL (DiscordFriendsDB)');
    })
    .catch(err => console.error('Error BD:', err.message));

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
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { username, password, nombreVisible } = req.body || {};
    try {
        await pool.request()
            .input('u', sql.NVarChar, username)
            .input('p', sql.NVarChar, password)
            .input('n', sql.NVarChar, nombreVisible)
            .input('r', sql.NVarChar, 'Lector')
            .query('INSERT INTO UsuariosWeb (Username, Password, NombreVisible, RolApp) VALUES (@u, @p, @n, @r)');
        res.json({ exito: true, mensaje: 'Usuario registrado con éxito.' });
    } catch (err) {
        res.status(400).json({ error: 'El usuario ya existe o hubo un problema.' });
    }
});

app.get('/api/amigos', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT Id, DiscordTag AS DiscordUsername, NombreVisible AS Apodo, FotoRuta AS AvatarUrl, Descripcion, Waifu1, Waifu2, Waifu3 FROM Amigos ORDER BY Id ASC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/amigos', upload.any(), async (req, res) => {
    try {
        const body = req.body || {};
        const files = req.files || [];

        if (body.rolSolicitante !== 'Admin') {
            return res.status(403).json({ error: 'Acceso denegado: Solo Admin puede agregar amigos.' });
        }

        const avatarF = files.find(f => f.fieldname === 'avatarFile');
        const waifuFiles = files.filter(f => f.fieldname === 'waifuFiles');

        // Convertir fotos a .webp
        const avatarUrl = avatarF ? await procesarImagenWebp(avatarF, 'avatar') : 'imagenes/default.png';
        const w1 = waifuFiles[0] ? await procesarImagenWebp(waifuFiles[0], 'waifu1') : '';
        const w2 = waifuFiles[1] ? await procesarImagenWebp(waifuFiles[1], 'waifu2') : '';
        const w3 = waifuFiles[2] ? await procesarImagenWebp(waifuFiles[2], 'waifu3') : '';

        await pool.request()
            .input('username', sql.NVarChar, body.discordUsername || '')
            .input('apodo', sql.NVarChar, body.apodo || '')
            .input('avatar', sql.NVarChar, avatarUrl)
            .input('desc', sql.NVarChar, body.descripcion || '')
            .input('w1', sql.NVarChar, w1)
            .input('w2', sql.NVarChar, w2)
            .input('w3', sql.NVarChar, w3)
            .query(`INSERT INTO Amigos (DiscordTag, NombreVisible, FotoRuta, Descripcion, Waifu1, Waifu2, Waifu3) 
                    VALUES (@username, @apodo, @avatar, @desc, @w1, @w2, @w3)`);

        res.json({ mensaje: 'Amigo agregado exitosamente' });
    } catch (err) {
        if (err.number === 2627) {
            return res.status(400).json({ error: 'Ese usuario de Discord (@) ya se encuentra registrado.' });
        }
        res.status(500).json({ error: 'Error interno en la base de datos.' });
    }
});

app.put('/api/amigos/:id', upload.any(), async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};
        const files = req.files || [];

        if (body.rolSolicitante !== 'Admin') {
            return res.status(403).json({ error: 'Acceso denegado: Solo Admin puede editar.' });
        }

        const avatarF = files.find(f => f.fieldname === 'avatarFile');
        const waifuFiles = files.filter(f => f.fieldname === 'waifuFiles');

        // Si sube imagen nueva la convierte a webp, de lo contrario conserva la actual
        const avatarUrl = avatarF ? await procesarImagenWebp(avatarF, 'avatar') : (body.avatarUrlActual || 'imagenes/default.png');
        const w1 = waifuFiles[0] ? await procesarImagenWebp(waifuFiles[0], 'waifu1') : (body.waifu1Actual || '');
        const w2 = waifuFiles[1] ? await procesarImagenWebp(waifuFiles[1], 'waifu2') : (body.waifu2Actual || '');
        const w3 = waifuFiles[2] ? await procesarImagenWebp(waifuFiles[2], 'waifu3') : (body.waifu3Actual || '');

        await pool.request()
            .input('id', sql.Int, id)
            .input('username', sql.NVarChar, body.discordUsername || '')
            .input('apodo', sql.NVarChar, body.apodo || '')
            .input('avatar', sql.NVarChar, avatarUrl)
            .input('desc', sql.NVarChar, body.descripcion || '')
            .input('w1', sql.NVarChar, w1)
            .input('w2', sql.NVarChar, w2)
            .input('w3', sql.NVarChar, w3)
            .query(`UPDATE Amigos SET 
                        DiscordTag = @username,
                        NombreVisible = @apodo,
                        FotoRuta = @avatar,
                        Descripcion = @desc,
                        Waifu1 = @w1,
                        Waifu2 = @w2,
                        Waifu3 = @w3
                    WHERE Id = @id`);

        res.json({ mensaje: 'Perfil actualizado exitosamente' });
    } catch (err) {
        if (err.number === 2627) {
            return res.status(400).json({ error: 'Ese usuario de Discord (@) ya pertenece a otro miembro.' });
        }
        res.status(500).json({ error: 'Error interno en la base de datos.' });
    }
});

app.delete('/api/amigos/:id', async (req, res) => {
    const { id } = req.params;
    const { rolSolicitante } = req.query;

    if (rolSolicitante !== 'Admin') {
        return res.status(403).json({ error: 'Solo los administradores pueden eliminar perfiles.' });
    }

    try {
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Amigos WHERE Id = @id');

        res.json({ mensaje: 'Amigo eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'No se pudo eliminar el registro.' });
    }
});

app.get('/api/comentarios/:amigoId', async (req, res) => {
    try {
        const result = await pool.request()
            .input('amigoId', sql.Int, req.params.amigoId)
            .query('SELECT Id, AmigoId, Autor, Texto AS Contenido, Fecha AS FechaPublicacion FROM Comentarios WHERE AmigoId = @amigoId ORDER BY Fecha DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/comentarios', async (req, res) => {
    const { amigoId, autor, contenido } = req.body || {};
    try {
        await pool.request()
            .input('amigoId', sql.Int, amigoId)
            .input('autor', sql.NVarChar, autor)
            .input('texto', sql.NVarChar, contenido)
            .query('INSERT INTO Comentarios (AmigoId, Autor, Texto) VALUES (@amigoId, @autor, @texto)');
        res.json({ mensaje: 'Comentario publicado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/comentarios/:id', async (req, res) => {
    const { id } = req.params;
    const { rolSolicitante } = req.query;

    if (rolSolicitante !== 'Admin') {
        return res.status(403).json({ error: 'Solo los administradores pueden eliminar comentarios.' });
    }

    try {
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Comentarios WHERE Id = @id');

        res.json({ mensaje: 'Comentario eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'No se pudo eliminar el comentario.' });
    }
});

app.get('/api/anuncio', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT Id, Titulo, Descripcion, ImagenUrl, FechaCreacion 
            FROM AnuncioGlobal 
            WHERE Activo = 1 
            ORDER BY FechaCreacion DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/anuncio', upload.single('imagenAfiche'), async (req, res) => {
    try {
        const { titulo, descripcion, rolSolicitante } = req.body || {};

        if (rolSolicitante !== 'Admin') {
            return res.status(403).json({ error: 'Solo los administradores pueden subir afiches.' });
        }

        // Convertir afiche a .webp
        const imagenUrl = req.file ? await procesarImagenWebp(req.file, 'afiche') : null;

        await pool.request()
            .input('t', sql.NVarChar, titulo || '')
            .input('d', sql.NVarChar, descripcion || '')
            .input('img', sql.NVarChar, imagenUrl)
            .query('INSERT INTO AnuncioGlobal (Titulo, Descripcion, ImagenUrl, Activo) VALUES (@t, @d, @img, 1)');

        res.json({ mensaje: 'Afiche guardado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/anuncio/:id', async (req, res) => {
    const { id } = req.params;
    const { rolSolicitante } = req.query;

    if (rolSolicitante !== 'Admin') {
        return res.status(403).json({ error: 'Solo los administradores pueden quitar el afiche.' });
    }

    try {
        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE AnuncioGlobal SET Activo = 0 WHERE Id = @id');
        res.json({ mensaje: 'Afiche desactivado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
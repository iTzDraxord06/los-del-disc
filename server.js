const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

process.on('uncaughtException', (err) => console.error('ERROR NO CONTROLADO:', err));
process.on('unhandledRejection', (err) => console.error('PROMESA NO CONTROLADA:', err));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Configuración y entrega de imágenes subidas
const rutaImagenes = path.join(__dirname, 'imagenes');
if (!fs.existsSync(rutaImagenes)) {
    fs.mkdirSync(rutaImagenes, { recursive: true });
}
app.use('/imagenes', express.static(rutaImagenes));

// 2. Servir archivos estáticos del frontend (index.html, login.html, css, js, logos, etc.)
app.use(express.static(path.join(__dirname)));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, rutaImagenes),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1E6) + ext);
    }
});
const upload = multer({ storage });

const dbConfig = {
    user: process.env.DB_USER || 'admin_discord',                     // Tu usuario de Azure (o local)
    password: process.env.DB_PASSWORD || 'ClaveFuerte.2026!',         // Tu contraseña
    server: process.env.DB_SERVER || 'servidordiscord-eduardo.database.windows.net', // Tu servidor de Azure
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME || 'DiscordFriendsDB',
    options: {
        encrypt: true,                         // OBLIGATORIO para Azure (true)
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

// Ruta principal por defecto: sirve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ================= AUTENTICACIÓN =================

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

// ================= AMIGOS Y FOTOS ILIMITADAS =================

app.get('/api/amigos', async (req, res) => {
    try {
        const amigosResult = await pool.request().query('SELECT * FROM Amigos ORDER BY Id ASC');
        const fotosResult = await pool.request().query('SELECT Id, AmigoId, FotoUrl FROM FotosAmigo ORDER BY Id ASC');

        const amigos = amigosResult.recordset.map(amigo => {
            const fotos = fotosResult.recordset
                .filter(f => f.AmigoId === amigo.Id)
                .map(f => f.FotoUrl);
            return {
                ...amigo,
                Fotos: fotos
            };
        });

        res.json(amigos);
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

        const avatarUrl = avatarF ? `imagenes/${avatarF.filename}` : 'imagenes/default.png';

        const insertRes = await pool.request()
            .input('username', sql.NVarChar, body.discordUsername || '')
            .input('apodo', sql.NVarChar, body.apodo || '')
            .input('rol', sql.NVarChar, body.rol || 'Miembro')
            .input('avatar', sql.NVarChar, avatarUrl)
            .input('desc', sql.NVarChar, body.descripcion || '')
            .query(`INSERT INTO Amigos (DiscordUsername, Apodo, RolServidor, AvatarUrl, Descripcion) 
                    OUTPUT INSERTED.Id
                    VALUES (@username, @apodo, @rol, @avatar, @desc)`);

        const amigoId = insertRes.recordset[0].Id;

        for (const file of waifuFiles) {
            await pool.request()
                .input('amigoId', sql.Int, amigoId)
                .input('fotoUrl', sql.NVarChar, `imagenes/${file.filename}`)
                .query('INSERT INTO FotosAmigo (AmigoId, FotoUrl) VALUES (@amigoId, @fotoUrl)');
        }

        res.json({ mensaje: 'Amigo agregado exitosamente' });
    } catch (err) {
        if (err.number === 2627) {
            return res.status(400).json({ error: 'Ese usuario de Discord (@) ya se encuentra registrado.' });
        }
        console.error('Error al insertar:', err);
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

        const avatarUrl = avatarF ? `imagenes/${avatarF.filename}` : (body.avatarUrlActual || 'imagenes/default.png');

        await pool.request()
            .input('id', sql.Int, id)
            .input('username', sql.NVarChar, body.discordUsername || '')
            .input('apodo', sql.NVarChar, body.apodo || '')
            .input('rol', sql.NVarChar, body.rol || 'Miembro')
            .input('avatar', sql.NVarChar, avatarUrl)
            .input('desc', sql.NVarChar, body.descripcion || '')
            .query(`UPDATE Amigos SET 
                        DiscordUsername = @username,
                        Apodo = @apodo,
                        RolServidor = @rol,
                        AvatarUrl = @avatar,
                        Descripcion = @desc
                    WHERE Id = @id`);

        for (const file of waifuFiles) {
            await pool.request()
                .input('amigoId', sql.Int, id)
                .input('fotoUrl', sql.NVarChar, `imagenes/${file.filename}`)
                .query('INSERT INTO FotosAmigo (AmigoId, FotoUrl) VALUES (@amigoId, @fotoUrl)');
        }

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

// ================= COMENTARIOS =================

app.get('/api/comentarios/:amigoId', async (req, res) => {
    try {
        const result = await pool.request()
            .input('amigoId', sql.Int, req.params.amigoId)
            .query('SELECT * FROM Comentarios WHERE AmigoId = @amigoId ORDER BY FechaPublicacion DESC');
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
            .input('contenido', sql.NVarChar, contenido)
            .query('INSERT INTO Comentarios (AmigoId, Autor, Contenido) VALUES (@amigoId, @autor, @contenido)');
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
        console.error('Error al eliminar comentario:', err);
        res.status(500).json({ error: 'No se pudo eliminar el comentario.' });
    }
});

// ================= AFICHES / ANUNCIOS =================

app.get('/api/anuncio', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT * FROM Afiches ORDER BY Id DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/anuncio', upload.single('imagenAfiche'), async (req, res) => {
    try {
        const { titulo, descripcion, rolSolicitante } = req.body || {};
        if (rolSolicitante !== 'Admin') {
            return res.status(403).json({ error: 'Acceso denegado: Solo Admin.' });
        }
        const imgUrl = req.file ? `imagenes/${req.file.filename}` : '';
        await pool.request()
            .input('t', sql.NVarChar, titulo || '')
            .input('d', sql.NVarChar, descripcion || '')
            .input('img', sql.NVarChar, imgUrl)
            .query('INSERT INTO Afiches (Titulo, Descripcion, ImagenUrl) VALUES (@t, @d, @img)');
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
            return res.status(403).json({ error: 'Acceso denegado: Solo Admin.' });
        }
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Afiches WHERE Id = @id');
        res.json({ mensaje: 'Afiche eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Puerto dinámico para Render (PORT) con respaldo a 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
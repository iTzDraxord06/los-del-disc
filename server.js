const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

process.on('uncaughtException', (err) => console.error('ERROR NO CONTROLADO:', err));
process.on('unhandledRejection', (err) => console.error('PROMESA NO CONTROLADA:', err));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 't0q7ltll',
    api_key: process.env.CLOUDINARY_API_KEY || '421676215584541',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'RBJuAR6QFd4D0EjOGvvwmBPtiGg'
});

// 2. Storage de Multer flexible para imágenes de móvil y PC
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'los-del-disc',
        resource_type: 'auto'
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } // Hasta 15MB
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
        console.log('Conectado a SQL Server (DiscordFriendsDB)');
    })
    .catch(err => console.error('Error BD:', err.message));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ================= AUTENTICACIÓN Y PERFIL DE USUARIO =================

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
        await pool.request()
            .input('u', sql.NVarChar, username)
            .input('p', sql.NVarChar, password)
            .input('n', sql.NVarChar, nombreVisible)
            .input('r', sql.NVarChar, 'Lector')
            .query('INSERT INTO UsuariosWeb (Username, Password, NombreVisible, RolApp) VALUES (@u, @p, @n, @r)');
        res.json({ exito: true, mensaje: 'Usuario registrado con éxito.' });
    } catch (err) {
        console.error('Error en /api/register:', err);
        res.status(400).json({ error: 'El usuario ya existe o hubo un problema.' });
    }
});

// Actualizar perfil de usuario (Username, NombreVisible y/o Contraseña)
app.put('/api/usuarios/perfil', async (req, res) => {
    try {
        const { userId, newUsername, nombreVisible, passwordActual, nuevoPassword } = req.body || {};

        if (!userId) {
            return res.status(400).json({ error: 'Falta el identificador del usuario.' });
        }

        // 1. Obtener datos actuales del usuario
        const userCheck = await pool.request()
            .input('id', sql.Int, userId)
            .query('SELECT Id, Username, Password, RolApp, NombreVisible FROM UsuariosWeb WHERE Id = @id');

        if (userCheck.recordset.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const usuarioDB = userCheck.recordset[0];
        const oldNombre = usuarioDB.NombreVisible;

        // 2. Validación de Username (Mínimo 4 caracteres y sin duplicados)
        let usernameFinal = usuarioDB.Username;
        if (newUsername && newUsername.trim() !== '') {
            const cleanUser = newUsername.trim();
            if (cleanUser.length < 4) {
                return res.status(400).json({ error: 'El usuario de inicio de sesión debe tener al menos 4 caracteres.' });
            }

            if (cleanUser.toLowerCase() !== usuarioDB.Username.toLowerCase()) {
                const existe = await pool.request()
                    .input('u', sql.NVarChar, cleanUser)
                    .input('id', sql.Int, userId)
                    .query('SELECT Id FROM UsuariosWeb WHERE LOWER(Username) = LOWER(@u) AND Id <> @id');

                if (existe.recordset.length > 0) {
                    return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso por otra persona.' });
                }
            }
            usernameFinal = cleanUser;
        }

        // 3. Validación de Nombre Visible (Mínimo 3 caracteres)
        const nombreFinal = (nombreVisible && nombreVisible.trim() !== '') 
            ? nombreVisible.trim() 
            : usuarioDB.NombreVisible;

        if (nombreFinal.length < 3) {
            return res.status(400).json({ error: 'El apodo visible debe tener al menos 3 caracteres.' });
        }

        // 4. Validación de Contraseña
        let passwordFinal = usuarioDB.Password;
        if (nuevoPassword && nuevoPassword.trim() !== '') {
            if (nuevoPassword.trim().length < 6) {
                return res.status(400).json({ error: 'La nueva contraseña debe tener mínimo 6 caracteres.' });
            }
            if (!passwordActual || passwordActual !== usuarioDB.Password) {
                return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
            }
            passwordFinal = nuevoPassword.trim();
        }

        // 5. Actualizar en UsuariosWeb
        await pool.request()
            .input('id', sql.Int, userId)
            .input('u', sql.NVarChar, usernameFinal)
            .input('nombre', sql.NVarChar, nombreFinal)
            .input('pass', sql.NVarChar, passwordFinal)
            .query('UPDATE UsuariosWeb SET Username = @u, NombreVisible = @nombre, Password = @pass WHERE Id = @id');

        // 6. ACTUALIZAR COMENTARIOS ANTERIORES
        if (oldNombre !== nombreFinal) {
            await pool.request()
                .input('nuevoAutor', sql.NVarChar, nombreFinal)
                .input('viejoAutor', sql.NVarChar, oldNombre)
                .query('UPDATE Comentarios SET Autor = @nuevoAutor WHERE Autor = @viejoAutor');
        }

        res.json({
            exito: true,
            mensaje: 'Datos actualizados correctamente.',
            usuario: {
                Id: usuarioDB.Id,
                Username: usernameFinal,
                NombreVisible: nombreFinal,
                RolApp: usuarioDB.RolApp
            }
        });
    } catch (err) {
        console.error('Error al actualizar perfil de usuario:', err);
        res.status(500).json({ error: 'Error interno en la base de datos.' });
    }
});

// ================= AMIGOS Y FOTOS ILIMITADAS =================

app.get('/api/amigos', async (req, res) => {
    try {
        const amigosResult = await pool.request().query('SELECT * FROM Amigos ORDER BY Id ASC');
        const fotosResult = await pool.request().query('SELECT Id, AmigoId, FotoUrl FROM FotosAmigo ORDER BY Id ASC');

        const amigos = amigosResult.recordset.map(amigo => {
            // Guardamos el Id y la URL de cada foto
            let fotos = fotosResult.recordset
                .filter(f => f.AmigoId === amigo.Id)
                .map(f => ({ id: f.Id, url: f.FotoUrl }));

            // Respaldo por si quedaron waifus antiguas en columnas fijas
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
        console.error('Error en GET /api/amigos:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/amigos', manejarSubida, async (req, res) => {
    try {
        const body = req.body || {};
        const files = req.files || [];

        if (body.rolSolicitante !== 'Admin') {
            return res.status(403).json({ error: 'Acceso denegado: Solo Admin puede agregar amigos.' });
        }

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
                    OUTPUT INSERTED.Id
                    VALUES (@tag, @nombre, @rol, @foto, @desc)`);

        const amigoId = insertRes.recordset[0].Id;

        for (const file of waifuFiles) {
            await pool.request()
                .input('amigoId', sql.Int, amigoId)
                .input('fotoUrl', sql.NVarChar, file.path)
                .query('INSERT INTO FotosAmigo (AmigoId, FotoUrl) VALUES (@amigoId, @fotoUrl)');
        }

        res.json({ mensaje: 'Amigo agregado exitosamente' });
    } catch (err) {
        console.error('Error en POST /api/amigos:', err);
        res.status(500).json({ error: err.message || 'Error interno en la base de datos.' });
    }
});

app.put('/api/amigos/:id', manejarSubida, async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body || {};
        const files = req.files || [];

        if (body.rolSolicitante !== 'Admin') {
            return res.status(403).json({ error: 'Acceso denegado: Solo Admin puede editar.' });
        }

        const avatarF = files.find(f => f.fieldname === 'avatarFile');
        const waifuFiles = files.filter(f => f.fieldname === 'waifuFiles');

        const fotoRuta = avatarF ? avatarF.path : (body.avatarUrlActual || 'imagenes/default.png');

        await pool.request()
            .input('id', sql.Int, id)
            .input('tag', sql.NVarChar, body.discordUsername || '')
            .input('nombre', sql.NVarChar, body.apodo || '')
            .input('rol', sql.NVarChar, body.rol || 'Miembro')
            .input('foto', sql.NVarChar, fotoRuta)
            .input('desc', sql.NVarChar, body.descripcion || '')
            .query(`UPDATE Amigos SET 
                        DiscordTag = @tag,
                        NombreVisible = @nombre,
                        RolServidor = @rol,
                        FotoRuta = @foto,
                        Descripcion = @desc
                    WHERE Id = @id`);

        for (const file of waifuFiles) {
            await pool.request()
                .input('amigoId', sql.Int, id)
                .input('fotoUrl', sql.NVarChar, file.path)
                .query('INSERT INTO FotosAmigo (AmigoId, FotoUrl) VALUES (@amigoId, @fotoUrl)');
        }

        res.json({ mensaje: 'Perfil actualizado exitosamente' });
    } catch (err) {
        console.error('Error en PUT /api/amigos:', err);
        res.status(500).json({ error: err.message || 'Error interno en la base de datos.' });
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
        console.error('Error en DELETE /api/amigos:', err);
        res.status(500).json({ error: 'No se pudo eliminar el registro.' });
    }
});

// Eliminar foto individual de la galería
app.delete('/api/fotos/:id', async (req, res) => {
    const { id } = req.params;
    const { rolSolicitante } = req.query;

    if (rolSolicitante !== 'Admin') {
        return res.status(403).json({ error: 'Acceso denegado: Solo Admin puede borrar fotos.' });
    }

    try {
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM FotosAmigo WHERE Id = @id');

        res.json({ mensaje: 'Foto eliminada correctamente' });
    } catch (err) {
        console.error('Error al borrar foto:', err);
        res.status(500).json({ error: 'No se pudo eliminar la foto de la base de datos.' });
    }
});

// ================= COMENTARIOS =================

app.get('/api/comentarios/:amigoId', async (req, res) => {
    try {
        const result = await pool.request()
            .input('amigoId', sql.Int, req.params.amigoId)
            .query('SELECT Id, AmigoId, Autor, Texto, Fecha FROM Comentarios WHERE AmigoId = @amigoId ORDER BY Id DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error en GET /api/comentarios:', err);
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
            .query('INSERT INTO Comentarios (AmigoId, Autor, Texto, Fecha) VALUES (@amigoId, @autor, @texto, GETDATE())');
        res.json({ mensaje: 'Comentario publicado' });
    } catch (err) {
        console.error('Error en POST /api/comentarios:', err);
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

// ================= ANUNCIOS =================

app.get('/api/anuncio', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT * FROM AnuncioGlobal ORDER BY Id DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error en GET /api/anuncio:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/anuncio', upload.single('imagenAfiche'), async (req, res) => {
    try {
        const { titulo, descripcion, rolSolicitante } = req.body || {};
        if (rolSolicitante !== 'Admin') {
            return res.status(403).json({ error: 'Acceso denegado: Solo Admin.' });
        }
        const imgUrl = req.file ? req.file.path : '';
        await pool.request()
            .input('t', sql.NVarChar, titulo || '')
            .input('d', sql.NVarChar, descripcion || '')
            .input('img', sql.NVarChar, imgUrl)
            .query('INSERT INTO AnuncioGlobal (Titulo, Descripcion, ImagenUrl, Activo) VALUES (@t, @d, @img, 1)');
        res.json({ mensaje: 'Afiche publicado' });
    } catch (err) {
        console.error('Error en POST /api/anuncio:', err);
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
            .query('DELETE FROM AnuncioGlobal WHERE Id = @id');
        res.json({ mensaje: 'Afiche eliminado' });
    } catch (err) {
        console.error('Error en DELETE /api/anuncio:', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
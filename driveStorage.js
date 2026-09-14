const { google } = require('googleapis');
const stream = require('stream');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1oRs20DVKv7xbG2Ey9PNjTXL4zOz3CgYb';

let oauth2Client = null;

function crearOAuthClient() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error(
            'Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en las variables de entorno.'
        );
    }

    if (!process.env.GOOGLE_REDIRECT_URI) {
        throw new Error(
            'Falta GOOGLE_REDIRECT_URI en las variables de entorno.'
        );
    }

    if (!oauth2Client) {
        oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
    }

    return oauth2Client;
}

// ================= OBTENER URL DE AUTORIZACIÓN =================
function obtenerUrlAutorizacion() {
    const client = crearOAuthClient();

    return client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });
}

// ================= PROCESAR CALLBACK DE GOOGLE =================
async function procesarCallback(codigo) {
    if (!codigo) {
        throw new Error('Google no devolvió ningún código de autorización.');
    }

    const client = crearOAuthClient();

    const { tokens } = await client.getToken(codigo);

    if (!tokens.refresh_token) {
        throw new Error(
            'Google no devolvió GOOGLE_REFRESH_TOKEN. Vuelve a autorizar usando prompt=consent.'
        );
    }

    client.setCredentials(tokens);

    return tokens;
}

// ================= CONFIGURAR AUTENTICACIÓN PARA DRIVE =================
function obtenerClienteDrive() {
    const client = crearOAuthClient();

    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!refreshToken) {
        throw new Error(
            'Falta GOOGLE_REFRESH_TOKEN. Primero autoriza Google mediante /api/drive/auth y agrega el token obtenido en Render.'
        );
    }

    client.setCredentials({
        refresh_token: refreshToken
    });

    return client;
}

// ================= SUBIR ARCHIVO A GOOGLE DRIVE =================
async function subirADrive(fileBuffer, fileName, mimeType) {
    const auth = obtenerClienteDrive();

    const drive = google.drive({
        version: 'v3',
        auth
    });

    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const fileMetadata = {
        name: fileName,
        parents: [FOLDER_ID]
    };

    const media = {
        mimeType,
        body: bufferStream
    };

    const response = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, webContentLink, webViewLink'
    });

    await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    });

    return `https://drive.google.com/uc?export=download&id=${response.data.id}`;
}

module.exports = {
    subirADrive,
    obtenerUrlAutorizacion,
    procesarCallback,
    obtenerVideoDrive
};

async function obtenerVideoDrive(fileId, range) {
    const auth = obtenerClienteDrive();

    const drive = google.drive({
        version: 'v3',
        auth
    });

    const opciones = {
        responseType: 'stream'
    };

    if (range) {
        opciones.headers = {
            Range: range
        };
    }

    const response = await drive.files.get(
        {
            fileId: fileId,
            alt: 'media'
        },
        opciones
    );

    return response;
}
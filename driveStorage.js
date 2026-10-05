const { google } = require('googleapis');
const stream = require('stream');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1oRs20DVKv7xbG2Ey9PNjTXL4zOz3CgYb';

let oauth2Client = null;

function crearOAuthClient() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en las variables de entorno.');
    }

    if (!process.env.GOOGLE_REDIRECT_URI) {
        throw new Error('Falta GOOGLE_REDIRECT_URI en las variables de entorno.');
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

function obtenerUrlAutorizacion() {
    const client = crearOAuthClient();

    return client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });
}

async function procesarCallback(codigo) {
    if (!codigo) {
        throw new Error('Google no devolvió ningún código de autorización.');
    }

    const client = crearOAuthClient();
    const { tokens } = await client.getToken(codigo);

    if (!tokens.refresh_token) {
        throw new Error('Google no devolvió GOOGLE_REFRESH_TOKEN. Vuelve a autorizar usando prompt=consent.');
    }

    client.setCredentials(tokens);
    return tokens;
}

function obtenerClienteDrive() {
    const client = crearOAuthClient();
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!refreshToken) {
        throw new Error('Falta GOOGLE_REFRESH_TOKEN.');
    }

    client.setCredentials({
        refresh_token: refreshToken
    });

    return client;
}

async function subirADrive(fileBuffer, fileName, mimeType) {
    const auth = obtenerClienteDrive();
    const drive = google.drive({
        version: 'v3',
        auth
    });

    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [FOLDER_ID]
        },
        media: {
            mimeType,
            body: bufferStream
        },
        fields: 'id,name,mimeType,size,webContentLink,webViewLink'
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

    return await drive.files.get(
        {
            fileId,
            alt: 'media',
            supportsAllDrives: true
        },
        opciones
    );
}

async function obtenerInfoVideoDrive(fileId) {
    const auth = obtenerClienteDrive();
    const drive = google.drive({
        version: 'v3',
        auth
    });

    const response = await drive.files.get({
        fileId,
        fields: 'id,name,size,mimeType',
        supportsAllDrives: true
    });

    return response.data;
}

module.exports = {
    subirADrive,
    obtenerVideoDrive,
    obtenerInfoVideoDrive,
    obtenerUrlAutorizacion,
    procesarCallback
};
const { google } = require('googleapis');
const stream = require('stream');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1oRs20DVKv7xbG2Ey9PNjTXL4zOz3CgYb';

function crearAuthDrive() {
    // Opción recomendada para Render: guardar el JSON completo en una variable.
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    }

    // Opción alternativa: variables separadas.
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        const credentials = {
            type: 'service_account',
            project_id: process.env.GOOGLE_PROJECT_ID,
            private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            token_uri: 'https://oauth2.googleapis.com/token'
        };
        return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    }

    // Desarrollo local: permite usar drive-key.json si existe.
    const fs = require('fs');
    const path = require('path');
    const keyPath = path.join(__dirname, 'drive-key.json');
    if (fs.existsSync(keyPath)) {
        return new google.auth.GoogleAuth({ keyFile: keyPath, scopes: SCOPES });
    }

    throw new Error('No hay credenciales de Google Drive. Configura GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY en Render.');
}

const auth = crearAuthDrive();
const drive = google.drive({ version: 'v3', auth });

async function subirADrive(fileBuffer, fileName, mimeType) {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const fileMetadata = {
        name: fileName,
        parents: [FOLDER_ID],
    };

    const media = {
        mimeType,
        body: bufferStream,
    };

    const response = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, webContentLink, webViewLink',
    });

    await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
            role: 'reader',
            type: 'anyone',
        },
    });

    return `https://drive.google.com/uc?id=${response.data.id}`;
}

module.exports = { subirADrive };

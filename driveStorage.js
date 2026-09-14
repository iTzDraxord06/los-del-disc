const { google } = require('googleapis');
const stream = require('stream');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY
            ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : undefined,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
    scopes: SCOPES,
});

const drive = google.drive({
    version: 'v3',
    auth,
});

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

async function subirADrive(fileBuffer, fileName, mimeType) {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const fileMetadata = {
        name: fileName,
        parents: [FOLDER_ID],
    };

    const media = {
        mimeType: mimeType,
        body: bufferStream,
    };

    const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
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
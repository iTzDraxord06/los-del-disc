const { google } = require('googleapis');
const path = require('path');
const stream = require('stream');

const KEYFILEPATH = path.join(__dirname, 'drive-key.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });
const FOLDER_ID = '1oRs20DVKv7xbG2Ey9PNjTXL4zOz3CgYb';

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
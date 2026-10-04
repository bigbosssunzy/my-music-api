require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'bigboss_music_secret_2026';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Temporary download directory
const downloadsDir = path.join(__dirname, 'temp_downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

app.use('/downloads', express.static(downloadsDir));

// Auth Middleware
const authorize = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or missing API key' });
    }
    next();
};

// Test endpoints to confirm server is reachable
app.get('/', (req, res) => res.status(200).send('Joker Music API Live'));
app.get('/ping', (req, res) => res.status(200).send('OK'));

// MAIN API ENDPOINT
app.get('/api/play', authorize, (req, res) => {
    let { query } = req.query;

    if (!query) {
        return res.status(400).json({ success: false, message: 'Query parameter is required.' });
    }

    // Strip remaining prefixes as fallback
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    if (!isUrl) {
        query = query.replace(/^[\.\/\\!]?\s*(song|play)\s*/i, '').trim();
    }

    const timestamp = Date.now();
    const outputFileName = `audio_${timestamp}.mp3`;
    const outputPath = path.join(downloadsDir, outputFileName);

    const target = isUrl ? `"${query}"` : `"ytsearch1:${query.replace(/"/g, '')}"`;
    const command = `yt-dlp --extractor-args "youtube:player_client=android,ios,mweb" ${target} -x --audio-format mp3 --audio-quality 0 --no-playlist -o "${outputPath}" --print "%(title)s"`;

    console.log(`[MUSIC API] Executing search for: ${target}`);

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error('[MUSIC API] Exec Error:', stderr || error.message);
            return res.status(500).json({ success: false, error: 'Failed to download or process audio.' });
        }

        const outputLines = stdout.trim().split('\n');
        const trackTitle = outputLines[outputLines.length - 1] || 'Unknown Track';

        const host = req.get('host');
        const protocol = req.protocol;
        const downloadUrl = `${protocol}://${host}/downloads/${outputFileName}`;

        res.json({
            success: true,
            title: trackTitle,
            downloadUrl: downloadUrl
        });

        // Auto cleanup local file
        setTimeout(() => {
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        }, 10 * 60 * 1000);
    });
});

app.listen(PORT, () => console.log(`🚀 Music API running on port ${PORT}`));

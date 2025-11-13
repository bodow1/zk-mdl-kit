/**
 * Example web demo server
 * Serves a minimal web interface for testing the verifier
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.EXAMPLE_PORT || 8080;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 Example demo running on http://localhost:${PORT}`);
  console.log(`📱 Open this URL in Chrome 141+ to test Digital Credentials API`);
});

export default app;


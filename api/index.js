// backend/api/index.js
import app from '../index.js';

export default function handler(req, res) {
    // Hand the request/response to your Express app
    return app(req, res);
}
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as ai from './routes/ai.js';
import * as documents from './routes/documents.js';
import * as changes from './routes/changes.js';
import * as analyzeChange from './routes/analyze-change.js';
const routes = {
    '/api/health': { GET: () => Response.json({ status: 'ok', service: 'tuydui-backend' }) },
    '/api/ai': { GET: ai.GET, POST: ai.POST },
    '/api/documents': { POST: documents.POST },
    '/api/changes': { POST: changes.POST },
    '/api/ai/analyze-change': { POST: analyzeChange.POST },
};
export function createApiServer(maxBodyBytes = 13 * 1024 * 1024) {
    const server = createServer(async (incoming, outgoing) => {
        try {
            const url = new URL(incoming.url || '/', 'http://localhost');
            const route = routes[url.pathname];
            const method = incoming.method || 'GET';
            let response;
            if (!route) {
                incoming.resume();
                response = Response.json({ error: 'Not found.' }, { status: 404 });
            }
            else if (!route[method]) {
                incoming.resume();
                response = Response.json({ error: 'Method not allowed.' }, {
                    status: 405, headers: { Allow: Object.keys(route).join(', ') },
                });
            }
            else {
                const headers = new Headers();
                for (const [name, value] of Object.entries(incoming.headers)) {
                    if (Array.isArray(value))
                        value.forEach((item) => headers.append(name, item));
                    else if (value !== undefined)
                        headers.set(name, value);
                }
                const chunks = [];
                let size = 0;
                let tooLarge = Number(incoming.headers['content-length'] || 0) > maxBodyBytes;
                if (!tooLarge) {
                    // Enforce the limit for chunked uploads as well as Content-Length bodies.
                    for await (const chunk of incoming.iterator({ destroyOnReturn: false })) {
                        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                        size += bytes.length;
                        if (size > maxBodyBytes) {
                            tooLarge = true;
                            break;
                        }
                        chunks.push(bytes);
                    }
                }
                if (tooLarge) {
                    incoming.resume();
                    response = Response.json({ error: 'Request body is too large.' }, { status: 413 });
                }
                else {
                    const request = new Request(url, {
                        method, headers,
                        body: method === 'GET' || method === 'HEAD' ? undefined : new Uint8Array(Buffer.concat(chunks)),
                    });
                    response = await route[method](request);
                }
            }
            outgoing.statusCode = response.status;
            response.headers.forEach((value, name) => outgoing.setHeader(name, value));
            if (response.body)
                await pipeline(Readable.fromWeb(response.body), outgoing);
            else
                outgoing.end();
        }
        catch (error) {
            console.error('API request failed:', error instanceof Error ? error.message : 'Unknown error');
            if (outgoing.headersSent) {
                outgoing.destroy();
                return;
            }
            outgoing.writeHead(500, { 'Content-Type': 'application/json' });
            outgoing.end(JSON.stringify({ error: 'Internal server error.' }));
        }
    });
    server.requestTimeout = 300_000;
    return server;
}

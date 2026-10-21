import { createApiServer } from './http.js';

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');

const server = createApiServer();
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Backend listening on http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => process.exit());
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}

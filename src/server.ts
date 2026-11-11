import { createServer } from 'node:http';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.PPT_HOST || '127.0.0.1';
const port = Number.parseInt(process.env.PORT || '5000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (request, response) => {
    try {
      await handle(request, response);
    } catch (error) {
      console.error('request_failed', {
        path: request.url,
        error: error instanceof Error ? error.name : 'UnknownError',
      });
      response.statusCode = 500;
      response.end('Internal server error');
    }
  });
  server.once('error', error => {
    console.error(error);
    process.exit(1);
  });
  server.listen(port, hostname, () => {
    console.log(`YuLing AI PPT listening at http://${hostname}:${port}`);
  });
});

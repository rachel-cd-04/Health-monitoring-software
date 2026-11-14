import 'dotenv/config';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';
import { openapi } from './openapi.js';
import { syncRules } from './controllers/common.js';
import { registerRoutes } from './routes/index.js';
import { sendError } from './utils/http.js';

const require = createRequire(import.meta.url);
const swaggerUiDistPath = dirname(require.resolve('swagger-ui-dist/package.json'));

export const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/docs/openapi.json', (_req, res) => res.json(openapi));
app.use('/docs', express.static(swaggerUiDistPath));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

registerRoutes(app);

app.use((_req, res) => sendError(res, 404, 'NOT_FOUND', 'Endpoint not found.'));
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (err instanceof z.ZodError) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'The request parameters are invalid.', err.flatten());
  }
  if (err && typeof err === 'object' && 'type' in err && (err as { type?: string }).type === 'entity.parse.failed') {
    return sendError(res, 400, 'VALIDATION_ERROR', 'The request body contains invalid JSON.');
  }
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2025') {
    return sendError(res, 404, 'NOT_FOUND', 'The requested resource was not found.');
  }
  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected backend error occurred.');
});

async function start() {
  void syncRules().catch((err) => console.error('Rule synchronization failed:', err));
  app.listen(port, () => {
    console.log(`Astro Health Monitor backend listening on port ${port}`);
    console.log(`Swagger UI available at http://localhost:${port}/docs/`);
    console.log(`OpenAPI JSON available at http://localhost:${port}/docs/openapi.json`);
  });
}

if (process.env.VERCEL !== '1') {
  void start();
} else {
  void syncRules().catch((err) => console.error('Rule synchronization failed:', err));
}

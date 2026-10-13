import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import { swaggerSpec } from './swagger.js';

export function mountApiDocs(app: Express, mode = process.env.NODE_ENV) {
  if (mode === 'production') return;
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
  // Swagger uses same-origin external scripts and inline styles. Keep Helmet's
  // script restrictions; only disable HTTPS upgrades for the local docs page.
  app.use('/api-docs', helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: { directives: {
      upgradeInsecureRequests: null,
      connectSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    } },
  }), swaggerUi.serve, swaggerUi.setup(undefined, {
    swaggerUrl: '/api-docs.json',
    customSiteTitle: 'TokoMart API documentation',
    swaggerOptions: { validatorUrl: null, persistAuthorization: false, deepLinking: true, filter: true, displayRequestDuration: true, queryConfigEnabled: false },
  }));
}

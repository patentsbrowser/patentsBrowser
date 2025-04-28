import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json' with { type: "json" };
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import type { Express } from 'express-serve-static-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const setupSwagger = (app: Express) => {
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'PatentsBrowser API',
        version: '1.0.0',
        description: 'API documentation for PatentsBrowser',
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3000}/api`,
          description: 'Development server',
        },
      ],
    },
    apis: ['./src/routes/*.ts'],
  };

  const swaggerDocs = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}; 
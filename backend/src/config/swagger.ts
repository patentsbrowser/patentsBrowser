import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../swagger.json' assert { type: "json" };
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const setupSwagger = (app: any) => {
  try {
    console.log('Setting up Swagger UI...');
    console.log('Swagger document:', JSON.stringify(swaggerDocument, null, 2));

    // Serve Swagger UI
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: "Patents Browser API Documentation",
      customfavIcon: "/favicon.ico"
    }));

    // Serve the raw swagger.json file
    app.get('/api-docs.json', (req: any, res: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });

    console.log('Swagger UI setup complete');
  } catch (error) {
    console.error('Error setting up Swagger UI:', error);
  }
}; 
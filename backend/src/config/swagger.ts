import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../../../backend/swagger.json' assert { type: "json" };

export const setupSwagger = (app: any) => {
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
}; 
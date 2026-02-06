import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { Express } from 'express';

/**
 * Setup Swagger UI Documentation
 * Route: GET /api/docs
 * 
 * This does NOT modify any controller logic - only adds documentation route.
 */
export function setupSwagger(app: Express): void {
    try {
        // Load OpenAPI spec from YAML file
        const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, 'swagger.yaml'), 'utf8'));

        // Swagger UI options
        const options: swaggerUi.SwaggerUiOptions = {
            customCss: `
                .swagger-ui .topbar { display: none }
                .swagger-ui .info .title { color: #2c3e50; }
            `,
            customSiteTitle: 'Pharmacy SaaS API Docs',
            customfavIcon: '/favicon.ico',
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                docExpansion: 'none',
                filter: true,
                showExtensions: true,
                defaultModelsExpandDepth: 1,
            },
        };

        // Mount Swagger UI at /api/docs
        app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument as any, options));

        console.log('📚 Swagger UI mounted at /api/docs');
    } catch (error) {
        console.error('❌ Failed to load Swagger spec:', error);
    }
}

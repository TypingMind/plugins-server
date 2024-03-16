import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { articleReaderRegistry } from '@/routes/articleReader/articleReaderRouter';
import { healthCheckRegistry } from '@/routes/healthCheck/healthCheckRouter';
import { transcriptRegistry } from '@/routes/youtubeTranscript/transcriptRouter';

export function generateOpenAPIDocument() {
  const registry = new OpenAPIRegistry([healthCheckRegistry, transcriptRegistry, articleReaderRegistry]);
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Swagger API',
    },
    externalDocs: {
      description: 'View the raw OpenAPI Specification in JSON format',
      url: '/swagger.json',
    },
  });
}

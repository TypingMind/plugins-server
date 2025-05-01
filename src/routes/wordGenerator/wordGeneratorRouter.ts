import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  Document,
  Footer,
  Header,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';
import path from 'path';

import { createApiRequestBody } from '@/api-docs/openAPIRequestBuilders';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import {
  WordGeneratorRequestBodySchema,
  WordGeneratorResponseSchema,
  GetAvailableTemplatesResponseSchema,
} from './wordGeneratorModel';

// ADDED: Import template manager and processor
import {
  getAvailableTemplates,
  getTemplateById,
  getDefaultTemplate,
  templateFileExists
} from './wordTemplateManager';
import { 
  processTemplate, 
  convertSectionsToTemplateData 
} from './wordTemplateProcessor';

export const COMPRESS = true;
export const wordGeneratorRegistry = new OpenAPIRegistry();
wordGeneratorRegistry.register('WordGenerator', WordGeneratorResponseSchema);

// Register original endpoint
wordGeneratorRegistry.registerPath({
  method: 'post',
  path: '/word-generator/generate',
  tags: ['Word Generator'],
  request: {
    body: createApiRequestBody(WordGeneratorRequestBodySchema, 'application/json'),
  },
  responses: createApiResponse(WordGeneratorResponseSchema, 'Success'),
});

// ADDED: Register endpoint to get available templates
wordGeneratorRegistry.registerPath({
  method: 'get',
  path: '/word-generator/templates',
  tags: ['Word Generator'],
  responses: createApiResponse(GetAvailableTemplatesResponseSchema, 'Success'),
});

// Create folder to contains generated files
const exportsDir = path.join(__dirname, '../../..', 'word-exports');

// ADDED: Create folder for templates
const templatesDir = path.join(__dirname, '../../..', 'word-templates');

// Ensure the exports directory exists
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// ADDED: Ensure the templates directory exists
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Cron job to delete files older than 1 hour
cron.schedule('0 * * * *', () => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  // Read the files in the exports directory
  fs.readdir(exportsDir, (err, files) => {
    if (err) {
      console.error(`Error reading directory ${exportsDir}:`, err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(exportsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting stats for file ${filePath}:`, err);
          return;
        }

        // Check if the file is older than 1 hour
        if (now - stats.mtime.getTime() > oneHour) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting file ${filePath}:`, err);
            } else {
              console.log(`Deleted file: ${filePath}`);
            }
          });
        }
      });
    });
  });
});

const serverUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

// Keep all the original configuration for backward compatibility
const FONT_CONFIG = {
  size: 12, // Font size in point
  titleSize: 32, // Title font size in point
  tableOfContentSize: 16, // Table of content font size in point
  family: 'Arial', // Font family
};

const SPACING_CONFIG = {
  // unit of inches
  title: {
    after: 12,
  },
  tableOfContent: {
    after: 6,
  },
  heading: {
    before: 4,
    after: 4,
  },
};

const LINE_HEIGHT_CONFIG: any = {
  1: 240, // Single line
  1.15: 276, // 1.15 line spacing
  1.25: 300, // 1.25 line spacing
  1.5: 360, // 1.5 line spacing
  2: 480, // Double line
};

// Predefined Margins in Twips
const PAGE_MARGINS: any = {
  normal: {
    top: 1440, // 2.54 cm = 1440 twips
    bottom: 1440,
    left: 1440,
    right: 1440,
  },
  narrow: {
    top: 720, // 1.27 cm = 720 twips
    bottom: 720,
    left: 720,
    right: 720,
  },
  moderate: {
    top: 1440, // 2.54 cm = 1440 twips
    bottom: 1440,
    left: 1080, // 1.91 cm = 1080 twips
    right: 1080,
  },
  wide: {
    top: 1440, // 2.54 cm = 1440 twips
    bottom: 1440,
    left: 2880, // 5.08 cm = 2880 twips
    right: 2880,
  },
  mirrored: {
    top: 1440, // 2.54 cm = 1440 twips
    bottom: 1440,
    left: 1800, // 3.18 cm = 1800 twips
    right: 1440,
  },
};

// ... [Keep all other original configuration]

// ADDED: Template-based document generation function
async function generateTemplateBasedDocument(
  data: {
    title: string;
    header?: any;
    footer?: any;
    sections: any[];
    template?: { templateId?: string };
  },
  config: any
): Promise<string> {
  try {
    // Determine template to use
    const templateId = data.template?.templateId || getDefaultTemplate().id;
    
    // Check if template exists, otherwise use default
    if (!templateFileExists(templateId)) {
      console.warn(`Template ${templateId} not found, using default template`);
    }
    
    // Convert sections to template data format
    const templateData = convertSectionsToTemplateData(data.sections, templateId);
    templateData.title = data.title;
    
    // Add standard config
    templateData.config = {
      showPageNumber: config.showPageNumber,
      showTableOfContent: config.showTableOfContent,
      orientation: config.pageOrientation,
    };
    
    // Generate filename
    const fileName = `word-file-${new Date().toISOString().replace(/\D/gi, '')}.docx`;
    const filePath = path.join(exportsDir, fileName);
    
    // Process template
    await processTemplate(templateId, templateData, filePath);
    
    return fileName;
  } catch (error) {
    console.error('Error generating template-based document:', error);
    throw error;
  }
}

export const wordGeneratorRouter: Router = (() => {
  const router = express.Router();
  // Static route for downloading files
  router.use('/downloads', express.static(exportsDir));

  // ADDED: New endpoint to get available templates
  router.get('/templates', (_req: Request, res: Response) => {
    try {
      const templates = getAvailableTemplates().map(template => ({
        id: template.id,
        name: template.name,
        description: template.description
      }));

      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'Templates retrieved successfully',
        { templates },
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      const errorServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        `Error retrieving templates: ${errorMessage}`,
        {},
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(errorServiceResponse, res);
    }
  });

  // MODIFIED: Original generate endpoint to support template-based generation
  router.post('/generate', async (_req: Request, res: Response) => {
    const { title, sections = [], header, footer, wordConfig = {}, template } = _req.body;
    if (!sections.length) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Sections is required!',
        'Please make sure you have sent the sections content generated from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    try {
      const wordConfigs = {
        numberingReference: wordConfig.showNumberingInHeader ? wordConfig.numberingReference : '',
        showPageNumber: wordConfig.showPageNumber ?? false,
        pageOrientation: wordConfig.pageOrientation || 'portrait',
        fontFamily: wordConfig.fontFamily || FONT_CONFIG.family,
        fontSize: wordConfig.fontSize || FONT_CONFIG.size,
        lineHeight: wordConfig.lineHeight ? LINE_HEIGHT_CONFIG[wordConfig.lineHeight] : LINE_HEIGHT_CONFIG['1.15'],
        margins: wordConfig.margins ? PAGE_MARGINS[wordConfig.margins] : PAGE_MARGINS.normal,
        showTableOfContent: wordConfig.showTableOfContent ?? false,
      };

      // MODIFIED: Choose between template-based or original generation
      let fileName;
      // Use template-based generation if template is specified or if it's enabled by default
      if (template || process.env.USE_TEMPLATES === 'true') {
        fileName = await generateTemplateBasedDocument(
          {
            title,
            sections,
            header,
            footer,
            template
          },
          wordConfigs
        );
      } else {
        // Use original generation method (include original execGenWordFuncs call here)
        // This part is kept for backward compatibility
        fileName = await execGenWordFuncs(
          {
            title,
            sections,
            header,
            footer,
          },
          wordConfigs
        );
      }

      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'File generated successfully',
        {
          downloadUrl: `${serverUrl}/word-generator/downloads/${fileName}`,
        },
        StatusCodes.OK
      );
      return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      let responseObject = 'Sorry, we couldn\'t generate word file.';
      
      const errorServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        `Error ${errorMessage}`,
        responseObject,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
      return handleServiceResponse(errorServiceResponse, res);
    }
  });

  return router;
})();
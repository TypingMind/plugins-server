// powerpointGeneratorRouter.ts
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { NextFunction, Request, Response, Router } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';
import path from 'path';
import pptxgen from 'pptxgenjs';

import { createApiRequestBody } from '@/api-docs/openAPIRequestBuilders';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { PowerpointGeneratorRequestBodySchema, PowerpointGeneratorResponseSchema } from './powerpointGeneratorModel';
export const COMPRESS = true;

import { POWERPOINT_EXPORTS_DIR } from '@/utils/paths';
// API Doc definition
export const powerpointGeneratorRegistry = new OpenAPIRegistry();
powerpointGeneratorRegistry.register('PowerpointGenerator', PowerpointGeneratorResponseSchema);
powerpointGeneratorRegistry.registerPath({
  method: 'post',
  path: '/powerpoint-generator/generate',
  tags: ['Powerpoint Generator'],
  request: {
    body: createApiRequestBody(PowerpointGeneratorRequestBodySchema, 'application/json'),
  },
  responses: createApiResponse(PowerpointGeneratorResponseSchema, 'Success'),
});

// Create folder to contains generated files
const exportsDir = path.join(__dirname, '../../powerpoint-exports');
// Ensure the exports directory exists
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true, mode: 0o755 });
}

cron.schedule('0 * * * *', async () => {
  try {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Use promise-based fs operations
    const files = await fs.promises.readdir(exportsDir);
    
    // Process files concurrently using Promise.all
    await Promise.all(
      files.map(async (file) => {
        try {
          const filePath = path.join(exportsDir, file);
          const stats = await fs.promises.stat(filePath);
          
          if (now - stats.mtime.getTime() > oneHour) {
            await fs.promises.unlink(filePath);
            console.log(`Successfully deleted file: ${filePath}`);
          }
        } catch (err) {
          console.error(`Error processing file ${file}:`, err);
        }
      })
    );
  } catch (err) {
    console.error('Error in cleanup cron job:', err);
  }
});

const serverUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

// Define configurable options for layout, font size, and font family
const defaultSlideConfig = {
  layout: 'LAYOUT_WIDE',
  titleFontSize: 44,
  headerFontSize: 32,
  bodyFontSize: 22,
  fontFamily: 'Calibri',
  backgroundColor: '#FFFFFF',
  textColor: '#000000',
  showFooter: false,
  showSlideNumber: false,
  footerBackgroundColor: '#003B75',
  footerText: 'footer text',
  footerTextColor: '#FFFFFF',
  footerFontSize: 10,
  showTableBorder: true,
  tableHeaderBackgroundColor: '#003B75',
  tableHeaderTextColor: '#FFFFFF',
  tableBorderThickness: 1,
  tableBorderColor: '#000000',
  tableFontSize: 14,
  tableTextColor: '#000000',
};

// Helper function to detect number, percent, or currency
function detectType(value: string) {
  const numberPattern = /^[+-]?\d+(\.\d+)?$/;
  const percentPattern = /^[+-]?\d+(\.\d+)?%$/;
  const currencyPattern = /^[€$]\d+(\.\d+)?$/;

  if (currencyPattern.test(value)) {
    return 'currency';
  } else if (percentPattern.test(value)) {
    return 'percent';
  } else if (numberPattern.test(value)) {
    return 'number';
  } else {
    return 'text';
  }
}

function getAlignment(type: string) {
  switch (type) {
    case 'number':
    case 'percent':
    case 'currency':
      return 'center';
    default:
      return 'left';
  }
}

function defineMasterSlides(pptx: any, config: any) {
  const slideNumberConfig =
    config.showFooter && config.showSlideNumber
      ? {
          x: 0.0,
          y: 6.9,
          h: 0.6,
          align: 'center',
          valign: 'middle',
          fontSize: config.footerFontSize,
          fontFace: config.fontFamily,
          color: config.footerTextColor,
          bold: true,
        }
      : undefined;

  // Define master slides
  pptx.defineSlideMaster({
    title: 'TITLE_SLIDE',
    slideNumber: slideNumberConfig,
    objects: [
      {
        placeholder: {
          options: {
            name: 'header',
            type: 'title',
            x: '10%',
            y: '20%',
            w: '80%',
            h: 0.75,
            align: 'center',
            valign: 'middle',
            margin: 0,
            fontSize: config.titleFontSize,
            fontFace: config.fontFamily,
            color: config.textColor,
          },
          text: '(title placeholer)',
        },
      },
      {
        placeholder: {
          options: {
            name: 'subheader',
            type: 'body',
            x: '10%',
            y: '35%',
            w: '80%',
            h: 1.25,
            align: 'center',
            valign: 'middle',
            margin: 0,
            fontSize: config.headerFontSize,
            fontFace: config.fontFamily,
            color: config.textColor,
          },
          text: '(subtitle placeholder)',
        },
      },
      config.showFooter
        ? { rect: { x: 0.0, y: 6.9, w: '100%', h: 0.6, fill: { color: config.footerBackgroundColor } } }
        : {},
      config.showFooter
        ? {
            placeholder: {
              options: {
                name: 'footer',
                type: 'body',
                x: 0.0,
                y: 6.9,
                w: '100%',
                h: 0.6,
                align: 'center',
                valign: 'middle',
                color: config.footerTextColor,
                fontSize: config.footerFontSize,
                fontFace: config.fontFamily,
              },
              text: config.footerText,
            },
          }
        : {},
    ],
  });

  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { color: config.backgroundColor },
    margin: [0.5, 0.25, 1.0, 0.25],
    slideNumber: slideNumberConfig,
    objects: [
      {
        placeholder: {
          options: {
            name: 'header',
            type: 'title',
            x: '10%',
            y: '5%',
            w: '80%',
            h: 1.0,
            margin: 0.2,
            align: 'center',
            valign: 'middle',
            color: config.textColor,
            fontSize: config.headerFontSize,
            fontFace: config.fontFamily,
          },
          text: '(slide title placeholder)',
        },
      },
      {
        placeholder: {
          options: {
            name: 'body',
            type: 'body',
            x: '10%',
            y: '20%',
            w: '80%',
            h: config.showFooter ? '60%' : '70%',
            color: config.textColor,
            fontSize: config.bodyFontSize,
            fontFace: config.fontFamily,
          },
          text: '(supports custom placeholder text!)',
        },
      },
      config.showFooter
        ? { rect: { x: 0.0, y: 6.9, w: '100%', h: 0.6, fill: { color: config.footerBackgroundColor } } }
        : {},
      config.showFooter
        ? {
            placeholder: {
              options: {
                name: 'footer',
                type: 'body',
                x: 0.0,
                y: 6.9,
                w: '100%',
                h: 0.6,
                align: 'center',
                valign: 'middle',
                color: config.footerTextColor,
                fontSize: config.footerFontSize,
                fontFace: config.fontFamily,
              },
              text: config.footerText,
            },
          }
        : {},
    ],
  });
}

async function execGenSlidesFuncs(slides: any[], config: any) {
  const pptx = new pptxgen();
  pptx.layout = config.layout;
  defineMasterSlides(pptx, config);

  slides.forEach((slideData, index) => {
    const { type, title, subtitle, chartContent, content = [] } = slideData;
    if (!type || !title) {
      throw new Error(`Slide ${index + 1} is missing required properties: type or title.`);
    }

    if (type === 'title_slide') {
      const slide = pptx.addSlide({ masterName: 'TITLE_SLIDE' });
      slide.addText(title, { placeholder: 'header' });
      if (subtitle) {
        slide.addText(subtitle, { placeholder: 'subheader' });
      }
    } else if (type === 'content_slide') {
      const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      slide.addText(title, { placeholder: 'header' });

      if (content.length === 1) {
        slide.addText(content[0], { placeholder: 'body' });
      } else if (content.length > 1) {
        const bullets = content.map((item: any) => ({
          text: item,
          options: { bullet: true, valign: 'top' },
        }));
        slide.addText(bullets, { placeholder: 'body', valign: 'top' });
      } else {
        throw new Error(`Invalid content length on slide ${index + 1}`);
      }
    } else if (type === 'table_slide') {
      const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      slide.addText(title, { placeholder: 'header' });

      const tableHeaders = content[0];
      const tableData = [
        tableHeaders.map((header: any) => ({
          text: header,
          options: {
            bold: true,
            color: config.tableHeaderTextColor,
            fill: config.tableHeaderBackgroundColor,
            align: 'center',
            valign: 'middle',
          },
        })),
        ...content.slice(1).map((row: any, rowIndex: number) =>
          row.map((cell: any) => {
            const cellType = detectType(cell);
            const align = getAlignment(cellType);
            return {
              text: cell,
              options: {
                fill: rowIndex % 2 === 0 ? 'E8F1FA' : 'DDEBF7',
                align,
                valign: 'middle',
                color: config.tableTextColor,
              },
            };
          })
        ),
      ];

      const tableBorderConfigs = config.showTableBorder
        ? {
            pt: config.tableBorderThickness,
            color: config.tableBorderColor,
          }
        : undefined;

      slide.addTable(tableData, {
        x: '10%',
        y: '20%',
        w: '80%',
        h: '60%',
        border: tableBorderConfigs,
        fontSize: 14,
        placeholder: 'body',
      } as any);
    } else if (type === 'chart_slide' && chartContent) {
      const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      slide.addText(title, { placeholder: 'header' });

      const { data: chartData, type: chartType } = chartContent;
      
      const chartOptions = {
        x: '10%',
        y: '20%',
        w: '80%',
        h: '60%',
        showLegend: true,
        placeholder: 'body',
      } as any;

      if (chartType === 'pie') {
        chartOptions.showCategoryAxis = true;
        chartOptions.showValueAxis = true;
        chartOptions.showPercent = true;
        chartOptions.dataLabelPosition = 'outside';
        slide.addChart(pptx.ChartType.pie, chartData, chartOptions);
      } else if (chartType === 'line') {
        chartOptions.showCategoryAxis = true;
        chartOptions.showValueAxis = true;
        chartOptions.dataLabelPosition = 'outside';
        slide.addChart(pptx.ChartType.line, chartData, chartOptions);
      } else if (chartType === 'bar') {
        chartOptions.showCategoryAxis = true;
        chartOptions.showValueAxis = true;
        slide.addChart(pptx.ChartType.bar, chartData, chartOptions);
      } else if (chartType === 'doughnut') {
        chartOptions.showPercent = true;
        slide.addChart(pptx.ChartType.doughnut, chartData, chartOptions);
      } else {
        throw new Error(`Invalid chart type: ${chartType}`);
      }
    }
  });

  const fileName = `your-presentation-${new Date().toISOString().replace(/\D/gi, '')}`;
  const filePath = path.join(POWERPOINT_EXPORTS_DIR, fileName + '.pptx');

  console.log('Debug execGenSlidesFuncs:');
  console.log('Saving file to:', filePath);

  try {
    // Tunggu file selesai ditulis
    await pptx.writeFile({
      fileName: filePath,
      compression: COMPRESS,
    });
    
    // Verifikasi file telah dibuat
    const fileExists = fs.existsSync(filePath);
    console.log('File written successfully:', fileExists);
    
    if (!fileExists) {
      throw new Error('File was not created successfully');
    }

    return fileName + '.pptx';
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
}

export const powerpointGeneratorRouter: Router = (() => {
  const router = express.Router();


  router.post('/generate', async (_req: Request, res: Response) => {
    
    const { slides = [], slideConfig = {} } = _req.body;
    if (!slides.length) {
      const validateServiceResponse = new ServiceResponse(
        ResponseStatus.Failed,
        '[Validation Error] Presentation slides is required!',
        'Please make sure you have sent the slide content generated from TypingMind.',
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(validateServiceResponse, res);
    }

    try {
      if (!fs.existsSync(POWERPOINT_EXPORTS_DIR)) {
        fs.mkdirSync(POWERPOINT_EXPORTS_DIR, { recursive: true });
      }
      const fileName = await execGenSlidesFuncs(slides, {
        layout: slideConfig.layout === '' ? defaultSlideConfig.layout : slideConfig.layout,
        titleFontSize: slideConfig.titleFontSize === 0 ? defaultSlideConfig.titleFontSize : slideConfig.titleFontSize,
        headerFontSize: slideConfig.headerFontSize === 0 ? defaultSlideConfig.headerFontSize : slideConfig.headerFontSize,
        bodyFontSize: slideConfig.bodyFontSize === 0 ? defaultSlideConfig.bodyFontSize : slideConfig.bodyFontSize,
        fontFamily: slideConfig.fontFamily === '' ? defaultSlideConfig.fontFamily : slideConfig.fontFamily,
        backgroundColor: slideConfig.backgroundColor === '' ? defaultSlideConfig.backgroundColor : slideConfig.backgroundColor,
        textColor: slideConfig.textColor === '' ? defaultSlideConfig.textColor : slideConfig.textColor,
        showFooter: slideConfig.showFooter ?? defaultSlideConfig.showFooter,
        showSlideNumber: slideConfig.showSlideNumber ?? defaultSlideConfig.showSlideNumber,
        footerBackgroundColor: slideConfig.footerBackgroundColor === '' ? defaultSlideConfig.footerBackgroundColor : slideConfig.footerBackgroundColor,
        footerText: slideConfig.footerText === '' ? defaultSlideConfig.footerText : slideConfig.footerText,
        footerTextColor: slideConfig.footerTextColor === '' ? defaultSlideConfig.footerTextColor : slideConfig.footerTextColor,
        footerFontSize: slideConfig.footerFontSize === 0 ? defaultSlideConfig.footerFontSize : slideConfig.footerFontSize,
        showTableBorder: slideConfig.showTableBorder ?? defaultSlideConfig.showTableBorder,
        tableHeaderBackgroundColor: slideConfig.tableHeaderBackgroundColor === '' ? defaultSlideConfig.tableHeaderBackgroundColor : slideConfig.tableHeaderBackgroundColor,
        tableHeaderTextColor: slideConfig.tableHeaderTextColor === '' ? defaultSlideConfig.tableHeaderTextColor : slideConfig.tableHeaderTextColor,
        tableBorderThickness: slideConfig.tableBorderThickness === 0 ? defaultSlideConfig.tableBorderThickness : slideConfig.tableBorderThickness,
        tableBorderColor: slideConfig.tableBorderColor === '' ? defaultSlideConfig.tableBorderColor : slideConfig.tableBorderColor,
        tableFontSize: slideConfig.tableFontSize === 0 ? defaultSlideConfig.tableFontSize : slideConfig.tableFontSize,
        tableTextColor: slideConfig.tableTextColor === '' ? defaultSlideConfig.tableTextColor : slideConfig.tableTextColor,
      });

      // Log file creation
    const fullFilePath = path.join(POWERPOINT_EXPORTS_DIR, fileName);
    console.log('Generate Route Debug:');
    console.log('Full file path:', fullFilePath);
    console.log('File exists after generation:', fs.existsSync(fullFilePath));
    console.log('Directory contents:', fs.readdirSync(POWERPOINT_EXPORTS_DIR));

    // Verify file exists before sending response
    if (!fs.existsSync(fullFilePath)) {
      throw new Error('File generation failed - file not found after generation');
    }

    const authHeader = _req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : '';

    const serviceResponse = new ServiceResponse(
      ResponseStatus.Success,
      'File generated successfully',
      {
        downloadUrl: `${serverUrl}/powerpoint-generator/downloads/${fileName}?token=${token}`,
      },
      StatusCodes.OK
    );
    return handleServiceResponse(serviceResponse, res);
    } catch (error) {
      const errorMessage = (error as Error).message;
      let responseObject = '';
      if (errorMessage.includes('')) {
        responseObject = `Sorry, we couldn't generate powerpoint file.`;
      }
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
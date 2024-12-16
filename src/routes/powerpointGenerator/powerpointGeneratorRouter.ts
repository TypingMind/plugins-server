import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';
import path from 'path';
import pptxgen from 'pptxgenjs';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { PowerpointGeneratorResponseSchema } from './powerpointGeneratorModel';
export const COMPRESS = true;
export const powerpointGeneratorRegistry = new OpenAPIRegistry();
powerpointGeneratorRegistry.register('PowerpointGenerator', PowerpointGeneratorResponseSchema);
powerpointGeneratorRegistry.registerPath({
  method: 'post',
  path: '/generate',
  tags: ['Generate Powerpoint Presentation'],
  responses: createApiResponse(PowerpointGeneratorResponseSchema, 'Success'),
});

// Create folder to contains generated files
const exportsDir = path.join(__dirname, '../../..', 'powerpoint-exports');
// Ensure the exports directory exists
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
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

// Define configurable options for layout, font size, and font family
const defaultSlideConfig = {
  layout: 'LAYOUT_WIDE', // Default: LAYOUT_WIDE, enum: LAYOUT_16x9 10 x 5.625 inches, LAYOUT_16x10 10 x 6.25 inches, LAYOUT_16x10 10 x 6.25 inches, LAYOUT_4x3 10 x 7.5 inches
  titleFontSize: 52, // Emphasize the main topic in Title Slide
  headerFontSize: 32, // The slide headers in the Content Slide
  bodyFontSize: 24, // The main text font size
  fontFamily: 'Calibri', // Default font family for the slide, Calibri, Arial
  backgroundColor: '#FFFFFF', // Default background color
  textColor: '#000000', // Text color
  showFooter: false, // Display footer or not
  showSlideNumber: false, // Display slide number or not
  footerBackgroundColor: '#003B75', // Default background color
  footerText: 'footer text', // Footer text content.
  footerTextColor: '#FFFFFF', // Default footer color
  footerFontSize: 10, // Default footer font size
  showTableBorder: true, // Show table border or not
  tableHeaderBackgroundColor: '#003B75', // Background of table header, // Dark blue background for headers
  tableHeaderTextColor: '#FFFFFF', // Table header color
  tableBorderThickness: 1, // pt: 1, // Border thickness
  tableBorderColor: '#000000', // Black border
  tableFontSize: 14, // Font size inside the table
  tableTextColor: '#000000', // Text color inside the table
};

// Helper function to detect number, percent, or currency
function detectType(value: string) {
  // Regular expression patterns
  const numberPattern = /^[+-]?\d+(\.\d+)?$/; // Matches general numbers
  const percentPattern = /^[+-]?\d+(\.\d+)?%$/; // Matches percentages
  const currencyPattern = /^[€$]\d+(\.\d+)?$/; // Matches currency values (e.g., $, €)

  if (currencyPattern.test(value)) {
    return 'currency';
  } else if (percentPattern.test(value)) {
    return 'percent';
  } else if (numberPattern.test(value)) {
    return 'number';
  } else {
    return 'text'; // Default to text if no match
  }
}

// Helper function to get alignment based on detected type
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
          align: 'center', // Center text horizontally
          valign: 'middle', // Center text vertically
          fontSize: config.footerFontSize,
          fontFace: config.fontFamily,
          color: config.footerTextColor,
          bold: true,
        }
      : undefined;

  // Init footer config objects
  const footerBackgroundObject = {
    rect: { x: 0.0, y: 6.9, w: '100%', h: 0.6, fill: { color: config.footerBackgroundColor } },
  };
  const footerTextObject = {
    placeholder: {
      options: {
        name: 'footer',
        ype: 'body',
        x: 0.0,
        y: 6.9,
        w: '100%', // Extend across the full width of the slide
        h: 0.6, // Match the height of the footer background
        align: 'center', // Center text horizontally
        valign: 'middle', // Center text vertically
        color: config.footerTextColor, // White text for contrast
        fontSize: config.footerFontSize, // Suitable size for footer text
        fontFace: config.fontFamily, // Set font face
      },
      text: config.footerText, // Default footer text
    },
  };

  // Define the TITLE_SLIDE MasterSlide with vertically aligned header and subheader
  pptx.defineSlideMaster({
    title: 'TITLE_SLIDE',
    slideNumber: slideNumberConfig,
    objects: [
      // Footer background
      config.showFooter ? footerBackgroundObject : undefined,
      config.showFooter ? footerTextObject : undefined,
      {
        // Header (Section Title)
        placeholder: {
          options: {
            name: 'header',
            type: 'title',
            x: '10%', // 10% from the left side of the slide for responsiveness
            y: '20%', // Positioned 20% from the top of the slide
            w: '80%', // Width adjusted to 80% of the slide width
            h: 0.75, // Fixed height for the header
            align: 'center', // Center-align the text horizontally
            valign: 'middle', // Vertically align the text to the middle
            margin: 0,
            fontSize: config.titleFontSize,
            fontFace: config.fontFamily, // Set font face
            color: config.textColor,
          },
          text: '(title placeholer)', // Placeholder text for the title
        },
      },
      {
        // Subheader (Subsection Title)
        placeholder: {
          options: {
            name: 'subheader',
            type: 'body',
            x: '10%', // 10% from the left side of the slide for responsiveness
            y: '35%', // Positioned 30% from the top, below the header
            w: '80%', // Width adjusted to 80% of the slide width
            h: 1.25, // Fixed height for the subheader
            align: 'center', // Center-align the text horizontally
            valign: 'middle', // Vertically align the text to the middle
            margin: 0,
            fontSize: config.headerFontSize,
            fontFace: config.fontFamily, // Set font face
            color: config.textColor,
          },
          text: '(subtitle placeholder)', // Placeholder text for the subheader
        },
      },
    ],
  });

  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: {
      color: config.backgroundColor,
    },
    margin: [0.5, 0.25, 1.0, 0.25], // top, left, bottom, right
    slideNumber: slideNumberConfig,
    objects: [
      // Footer background
      config.showFooter ? footerBackgroundObject : undefined,
      config.showFooter ? footerTextObject : undefined,
      // Header (Title)
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
            fontSize: config.headerFontSize, // Dynamically chosen for visibility
            fontFace: config.fontFamily, // Set font face
          },
          text: '(slide title placeholder)', // Default placeholder for title
        },
      },
      // Content (Body)
      {
        placeholder: {
          options: {
            name: 'body',
            type: 'body',
            x: '10%',
            y: '20%',
            w: '80%',
            h: '60%', // Responsive height
            color: config.textColor,
            fontSize: config.bodyFontSize, // Suitable for body text
            fontFace: config.fontFamily, // Set font face
          },
          text: '(supports custom placeholder text!)',
        },
      },
    ],
  });
}

async function execGenSlidesFuncs(slides: any[], config: any) {
  // STEP 1: Instantiate new PptxGenJS object
  const pptx = new pptxgen();

  // STEP 2: Set layout
  pptx.layout = config.layout;

  // STEP 3: Create Master Slides (from the old `pptxgen.masters.js` file - `gObjPptxMasters` items)
  defineMasterSlides(pptx, config);

  // STEP 4: Run requested test
  slides.forEach((slideData, index) => {
    const { type, title, subtitle, chartContent, content = [] } = slideData;
    if (!type || !title) {
      throw new Error(`Slide ${index + 1} is missing required properties: type or title.`);
    }

    if (type === 'title_slide') {
      // Add a title slide
      const slide = pptx.addSlide({ masterName: 'TITLE_SLIDE' });
      slide.addText(title, { placeholder: 'header' });
      if (subtitle) {
        slide.addText(subtitle, { placeholder: 'subheader' });
      }
    } else if (type === 'content_slide') {
      // Add a content slide
      const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      slide.addText(title, { placeholder: 'header' });

      // Add content based on contentType
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
      // Table Slide
      const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      slide.addText(title, { placeholder: 'header' });

      // Map content to tableData with alternating row colors and alignment
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
                fill: rowIndex % 2 === 0 ? 'E8F1FA' : 'DDEBF7', // Alternating row colors
                align,
                valign: 'middle',
                color: config.tableTextColor, // Black text
              },
            };
          })
        ),
      ];

      slide.addTable(tableData, {
        x: '10%', // Position aligned with placeholder
        y: '20%',
        w: '80%', // Table width
        h: '60%', // Table height
        border: {
          pt: 1, // Border thickness
          color: '000000', // Black border
        },
        fontSize: 14, // Font size for table text
        placeholder: 'body',
      } as any);
    } else if (type === 'chart_slide' && chartContent) {
      // Add a slide with the custom master slide
      const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });

      // Set the slide title
      slide.addText(title, {
        placeholder: 'header',
      });

      // Handle chart content based on chart type
      const { data: chartData, type: chartType } = chartContent;
      // Default to line chart if no type is provided
      if (chartType === 'pie') {
        slide.addChart(pptx.ChartType.pie, chartData, {
          x: '10%', // Position aligned with placeholder
          y: '20%',
          w: '80%', // Table width
          h: '60%', // Table height
          showLegend: true,
          showCategoryAxis: true,
          showValueAxis: true,
          showPercent: true,
          dataLabelPosition: 'outside',
          placeholder: 'body',
        } as any);
      } else if (chartType === 'line') {
        slide.addChart(pptx.ChartType.line, chartData, {
          x: '10%', // Position aligned with placeholder
          y: '20%',
          w: '80%', // Table width
          h: '60%', // Table height
          showLegend: true,
          showCategoryAxis: true,
          showValueAxis: true,
          dataLabelPosition: 'outside',
          placeholder: 'body',
        } as any);
      } else if (chartType === 'bar') {
        slide.addChart(pptx.ChartType.bar, chartData, {
          x: '10%', // Position aligned with placeholder
          y: '20%',
          w: '80%', // Table width
          h: '60%', // Table height
          showLegend: true,
          showCategoryAxis: true,
          showValueAxis: true,
          placeholder: 'body',
        } as any);
      } else if (chartType === 'doughnut') {
        slide.addChart(pptx.ChartType.doughnut, chartData, {
          x: '10%', // Position aligned with placeholder
          y: '20%',
          w: '80%', // Table width
          h: '60%', // Table height
          showPercent: true,
          showLegend: true,
          placeholder: 'body',
        } as any);
      } else {
        throw new Error(`Invalid chart type: ${chartType}`);
      }
    }
  });

  const fileName = `your-presentation-${new Date().toISOString().replace(/\D/gi, '')}`;
  const filePath = path.join(exportsDir, fileName);

  await pptx.writeFile({
    fileName: filePath,
    compression: COMPRESS,
  });

  return fileName + '.pptx';
}

export const powerpointGeneratorRouter: Router = (() => {
  const router = express.Router();
  // Static route for downloading files
  router.use('/downloads', express.static(exportsDir));

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
      const fileName = await execGenSlidesFuncs(slides, {
        layout: slideConfig.layout === '' ? defaultSlideConfig.layout : slideConfig.layout, // Default: LAYOUT_WIDE, enum: LAYOUT_16x9 10 x 5.625 inches, LAYOUT_16x10 10 x 6.25 inches, LAYOUT_4x3 10 x 7.5 inches
        titleFontSize: slideConfig.titleFontSize === 0 ? defaultSlideConfig.titleFontSize : slideConfig.titleFontSize, // Default: 52, Emphasize the main topic in Title Slide
        headerFontSize:
          slideConfig.headerFontSize === 0 ? defaultSlideConfig.headerFontSize : slideConfig.headerFontSize, // Default: 32, The slide headers in the Content Slide
        bodyFontSize: slideConfig.bodyFontSize === 0 ? defaultSlideConfig.bodyFontSize : slideConfig.bodyFontSize, // Default: 24, The main text font size
        fontFamily: slideConfig.fontFamily === '' ? defaultSlideConfig.fontFamily : slideConfig.fontFamily, // Default: 'Calibri', Default font family for the slide, Calibri, Arial
        backgroundColor:
          slideConfig.backgroundColor === '' ? defaultSlideConfig.backgroundColor : slideConfig.backgroundColor, // Default: '#FFFFFF', Default background color
        textColor: slideConfig.textColor === '' ? defaultSlideConfig.textColor : slideConfig.textColor, // Default: '#000000', Text color
        showFooter: slideConfig.showFooter === 0 ? defaultSlideConfig.showFooter : slideConfig.showFooter, // Default: false, Display footer or not
        showSlideNumber:
          slideConfig.showSlideNumber === 0 ? defaultSlideConfig.showSlideNumber : slideConfig.showSlideNumber, // Default: false, Display slide number or not
        footerBackgroundColor:
          slideConfig.footerBackgroundColor === ''
            ? defaultSlideConfig.footerBackgroundColor
            : slideConfig.footerBackgroundColor, // Default: '#003B75', Default footer background color
        footerText: slideConfig.footerText === '' ? defaultSlideConfig.footerText : slideConfig.footerText, // Default: 'footer text', Footer text content.
        footerTextColor:
          slideConfig.footerTextColor === '' ? defaultSlideConfig.footerTextColor : slideConfig.footerTextColor, // Default: '#FFFFFF', Default footer text color
        footerFontSize:
          slideConfig.footerFontSize === 0 ? defaultSlideConfig.footerFontSize : slideConfig.footerFontSize, // Default: 10, Default footer font size
        showTableBorder:
          slideConfig.showTableBorder === 0 ? defaultSlideConfig.showTableBorder : slideConfig.showTableBorder, // Default: true, Show table border or not
        tableHeaderBackgroundColor:
          slideConfig.tableHeaderBackgroundColor === ''
            ? defaultSlideConfig.tableHeaderBackgroundColor
            : slideConfig.tableHeaderBackgroundColor, // Default: '#003B75', Dark blue background for headers
        tableHeaderTextColor:
          slideConfig.tableHeaderTextColor === ''
            ? defaultSlideConfig.tableHeaderTextColor
            : slideConfig.tableHeaderTextColor, // Default: '#FFFFFF', Table header text color
        tableBorderThickness:
          slideConfig.tableBorderThickness === 0
            ? defaultSlideConfig.tableBorderThickness
            : slideConfig.tableBorderThickness, // Default: 1 pt, Border thickness
        tableBorderColor:
          slideConfig.tableBorderColor === '' ? defaultSlideConfig.tableBorderColor : slideConfig.tableBorderColor, // Default: '#000000', Black border
        tableFontSize: slideConfig.tableFontSize === 0 ? defaultSlideConfig.tableFontSize : slideConfig.tableFontSize, // Default: 14, Font size inside the table
        tableTextColor:
          slideConfig.tableTextColor === '' ? defaultSlideConfig.tableTextColor : slideConfig.tableTextColor, // Default: '#000000', Text color inside the table
      });
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'File generated successfully',
        {
          downloadUrl: `${serverUrl}/powerpoint-generator/downloads/${fileName}`,
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

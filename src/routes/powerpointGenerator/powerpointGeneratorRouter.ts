import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import path from 'path';
import pptxgen from 'pptxgenjs';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { PowerpointGeneratorResponseSchema } from './powerpointGeneratorModel';
export const CUST_NAME = 'S.T.A.R. Laboratories';
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

function defineMasterSlides(pptx: any) {
  // Define the TITLE_SLIDE MasterSlide with vertically aligned header and subheader
  pptx.defineSlideMaster({
    title: 'TITLE_SLIDE',
    objects: [
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
            // color: "363636", // Dark gray color for the title
            align: 'center', // Center-align the text horizontally
            valign: 'middle', // Vertically align the text to the middle
            margin: 0,
            fontSize: 52,
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
            h: 0.5, // Fixed height for the subheader
            // color: "6C6C6C", // Light gray color for the subheader
            align: 'center', // Center-align the text horizontally
            valign: 'middle', // Vertically align the text to the middle
            margin: 0,
          },
          text: '(subtitle placeholder)', // Placeholder text for the subheader
        },
      },
    ],
  });

  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { color: 'E1E1E1', transparency: 50 },
    margin: [0.5, 0.25, 1.0, 0.25], // top, left, bottom, right
    slideNumber: {
      x: 0.0,
      y: 6.9,
      h: 0.6,
      color: 'FFFFFF',
      fontSize: 10,
      align: 'center', // Center text horizontally
      valign: 'middle', // Center text vertically
      bold: true,
    },
    objects: [
      // Footer background
      { rect: { x: 0.0, y: 6.9, w: '100%', h: 0.6, fill: { color: '003b75' } } },
      // Footer Section
      {
        placeholder: {
          options: {
            name: 'footer',
            type: 'body',
            x: 0.0,
            y: 6.9,
            w: '100%', // Extend across the full width of the slide
            h: 0.6, // Match the height of the footer background
            align: 'center', // Center text horizontally
            valign: 'middle', // Center text vertically
            color: 'FFFFFF', // White text for contrast
            fontSize: 12, // Suitable size for footer text
          },
          text: '(footer text placeholder)', // Default footer text
        },
      },
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
            // color: "404040",
            // fontSize: 24, // Dynamically chosen for visibility
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
            fontSize: 24, // Suitable for body text
          },
          text: '(supports custom placeholder text!)',
        },
      },
    ],
  });
}

async function execGenSlidesFuncs(slides: any[]) {
  // STEP 1: Instantiate new PptxGenJS object
  const pptx = new pptxgen();

  // STEP 2: Set Presentation props (as QA test only - these are not required)
  // pptx.title = "PptxGenJS Test Suite Presentation";
  // pptx.subject = "PptxGenJS Test Suite Export";
  // pptx.author = "TypingMind Custom";
  // pptx.company = CUST_NAME;
  // pptx.revision = "15";
  // pptx.theme = { headFontFace: "Arial Light" };
  // pptx.theme = { bodyFontFace: "Arial" };

  // STEP 3: Set layout
  // LAYOUT_16x9	Yes	10 x 5.625 inches
  // LAYOUT_16x10	No	10 x 6.25 inches
  // LAYOUT_4x3	No	10 x 7.5 inches
  // LAYOUT_WIDE	No	13.3 x 7.5 inches
  pptx.layout = 'LAYOUT_WIDE';

  // STEP 4: Create Master Slides (from the old `pptxgen.masters.js` file - `gObjPptxMasters` items)
  defineMasterSlides(pptx);

  // STEP 5: Run requested test
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
        const bullets = content.map((item: string) => ({
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
        tableHeaders.map((header: string) => ({
          text: header,
          options: {
            bold: true,
            color: 'FFFFFF',
            fill: '003b75', // Dark blue background for headers
            align: 'center',
            valign: 'middle',
          },
        })),
        ...content.slice(1).map((row: any[], rowIndex: number) =>
          row.map((cell) => {
            const cellType = detectType(cell);
            const align = getAlignment(cellType);

            return {
              text: cell,
              options: {
                fill: rowIndex % 2 === 0 ? 'E8F1FA' : 'DDEBF7', // Alternating row colors
                align,
                valign: 'middle',
                color: '000000', // Black text
                bold: rowIndex === 0, // Bold headers
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
    } else {
      throw new Error(`Invalid slide type: ${type}`);
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
    const { slides = [] } = _req.body;
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
      const fileName = await execGenSlidesFuncs(slides);
      const serviceResponse = new ServiceResponse(
        ResponseStatus.Success,
        'File generated successfully',
        {
          downloadUrl: `/powerpoint-generator/downloads/${fileName}`,
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

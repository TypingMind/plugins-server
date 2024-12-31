import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  AlignmentType,
  Document,
  Footer,
  FootnoteReferenceRun,
  Header,
  HeadingLevel,
  LeaderType,
  LevelFormat,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';
import path from 'path';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import { WordGeneratorResponseSchema } from './wordGeneratorModel';
export const COMPRESS = true;
export const wordGeneratorRegistry = new OpenAPIRegistry();
wordGeneratorRegistry.register('WordGenerator', WordGeneratorResponseSchema);
wordGeneratorRegistry.registerPath({
  method: 'post',
  path: '/generate',
  tags: ['Generate Word file'],
  responses: createApiResponse(WordGeneratorResponseSchema, 'Success'),
});

// Create folder to contains generated files
const exportsDir = path.join(__dirname, '../../..', 'word-exports');
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

const NUMBERING_OPTIONS: any = {
  '1.1.1.1 (Decimal)': {
    reference: 'decimal-numbering',
    levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: '%1', alignment: AlignmentType.START },
      { level: 1, format: LevelFormat.DECIMAL, text: '%1.%2', alignment: AlignmentType.START },
      { level: 2, format: LevelFormat.DECIMAL, text: '%1.%2.%3', alignment: AlignmentType.START },
      { level: 3, format: LevelFormat.DECIMAL, text: '%1.%2.%3.%4', alignment: AlignmentType.START },
    ],
  },
  'I.1.a.i (Roman -> Decimal > Lower Letter -> Lower Roman)': {
    reference: 'roman-decimal-lower-letter-lower-roman',
    levels: [
      { level: 0, format: LevelFormat.UPPER_ROMAN, text: '%1.', alignment: AlignmentType.START }, // Roman
      { level: 1, format: LevelFormat.DECIMAL, text: '%2.', alignment: AlignmentType.START }, // Decimal
      { level: 2, format: LevelFormat.LOWER_LETTER, text: '%3.', alignment: AlignmentType.START }, // Lower Letter
      { level: 3, format: LevelFormat.LOWER_ROMAN, text: '%4.', alignment: AlignmentType.START }, // Lower Roman
    ],
  },
  'I.A.1.a (Roman -> Upper Letter -> Decimal -> Lower Letter)': {
    reference: 'roman-upper-decimal-lower',
    levels: [
      { level: 0, format: LevelFormat.UPPER_ROMAN, text: '%1', alignment: AlignmentType.START },
      { level: 1, format: LevelFormat.UPPER_LETTER, text: '%2', alignment: AlignmentType.START },
      { level: 2, format: LevelFormat.DECIMAL, text: '%3', alignment: AlignmentType.START },
      { level: 3, format: LevelFormat.LOWER_LETTER, text: '%4', alignment: AlignmentType.START },
    ],
  },
  '1)a)i)(i) (Decimal -> Lower Letter -> Lower Roman -> Lower Roman with Parentheses)': {
    reference: 'decimal-lower-letter-lower-roman-parentheses',
    levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: '%1)', alignment: AlignmentType.START },
      { level: 1, format: LevelFormat.LOWER_LETTER, text: '%2)', alignment: AlignmentType.START },
      { level: 2, format: LevelFormat.LOWER_ROMAN, text: '%3)', alignment: AlignmentType.START },
      { level: 3, format: LevelFormat.LOWER_ROMAN, text: '(%4)', alignment: AlignmentType.START },
    ],
  },
  'A.1.a.i (Upper Letter -> Decimal -> Lower Letter -> Lower Roman)': {
    reference: 'upper-letter-decimal-lower-letter-lower-roman',
    levels: [
      { level: 0, format: LevelFormat.UPPER_LETTER, text: '%1', alignment: AlignmentType.START },
      { level: 1, format: LevelFormat.DECIMAL, text: '%1.%2', alignment: AlignmentType.START },
      { level: 2, format: LevelFormat.LOWER_LETTER, text: '%1.%2.%3', alignment: AlignmentType.START },
      { level: 3, format: LevelFormat.LOWER_ROMAN, text: '%1.%2.%3.%4', alignment: AlignmentType.START },
    ],
  },
};

const BULLET_CONFIG = {
  reference: 'my-listing-with-bullet-points',
  levels: [
    {
      level: 0,
      format: LevelFormat.NUMBER_IN_DASH,
      alignment: AlignmentType.START,
    },
  ],
};

// Function to map heading levels
const getHeadingLevel = (level: any) => {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    default:
      throw HeadingLevel.HEADING_5;
  }
};

// Helper function to process footnotes
const generateFootnotes = (sections: any[]) => {
  const footnotes: any = {};
  let currentFootnoteId = 1;

  sections.forEach((section) => {
    section.content.forEach((content: any) => {
      if (content.footnote) {
        footnotes[currentFootnoteId] = {
          children: [new Paragraph(content.footnote.note)],
        };
        content.footnote.id = currentFootnoteId; // Add the ID for later use
        currentFootnoteId++;
      }
    });
  });

  return footnotes;
};

// Generate a table with optional headers
const generateTable = (tableData: any) => {
  const rows = [];

  // Add header row if headers exist
  if (tableData.headers) {
    const headerRow = new TableRow({
      children: tableData.headers.map(
        (header: any) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: header, bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          })
      ),
      tableHeader: true,
    });
    rows.push(headerRow);
  }

  // Add table rows
  tableData.rows.forEach((row: any) => {
    const tableRow = new TableRow({
      children: row.cells.map(
        (cell: any) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun(cell.text)],
              }),
            ],
          })
      ),
    });
    rows.push(tableRow);
  });

  // Return the Table object
  return new Table({
    rows,
    width: {
      size: 100, // Table width set in DXA (adjust as needed)
      type: WidthType.PERCENTAGE,
    },
  });
};

// Recursive function to handle sections and sub-sections
const generateSectionContent = (section: any, config: any) => {
  // Section Content
  const sectionContents = section.content.flatMap((child: any) => {
    const results = [];
    // Handle paragraph content
    if (child.type === 'paragraph') {
      const paragraphChildren = [new TextRun(child.text)];
      if (child.footnote) {
        paragraphChildren.push(new FootnoteReferenceRun(child.footnote.id));
      }
      results.push(new Paragraph({ children: paragraphChildren }));
    } else if (child.type === 'listing' && child.items) {
      // Handle list content with bullets (level 0)
      // Create a new paragraph for each list item and apply the bullet style (level 0)
      results.push(
        ...child.items.flatMap(
          (item: any) =>
            new Paragraph({
              children: [new TextRun(item)],
              bullet: {
                level: 0,
                reference: BULLET_CONFIG.reference,
              } as any,
            })
        )
      );
    } else if (child.type === 'table') {
      results.push(generateTable(child));
    } else if (child.type === 'pageBreak') {
      results.push(
        new Paragraph({
          text: '',
          pageBreakBefore: true,
        })
      );
    } else {
      results.push(
        new Paragraph({
          children: [new TextRun('Unsupported content type.')],
        })
      );
    }
    return results;
  });

  let numberingConfig;
  if (config.numberingReference) {
    numberingConfig = {
      reference: config.numberingReference,
      level: section.headingLevel - 1,
    };
  }

  const sectionContent = [
    // Section Heading with index
    new Paragraph({
      children: [new TextRun(section.heading)],
      heading: getHeadingLevel(section.headingLevel),
      numbering: numberingConfig,
      spacing: {
        before: SPACING_CONFIG.heading.before * 20,
        after: SPACING_CONFIG.heading.after * 20,
      },
    }),
    ...sectionContents,
    // Process sub-sections if they exist
    ...(section.subSections
      ? section.subSections.flatMap((subSection: any) => generateSectionContent(subSection, config))
      : []),
  ];

  return sectionContent;
};

async function execGenWordFuncs(
  data: {
    title: string;
    header?: any;
    footer?: any;
    sections: any[];
  },
  config: {
    numberingReference: string;
    showPageNumber: boolean;
    pageOrientation: string;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    margins: string;
    showTableOfContent: boolean;
  }
) {
  let headerConfigs = {};
  if (data.header && data.header.text) {
    headerConfigs = {
      default: new Header({
        children: [
          new Paragraph({
            text: data.header.text,
            alignment: String(data.header?.alignment ?? 'left').toLowerCase(),
          } as any),
        ],
      }),
    };
  }

  let footerConfigs = {};
  const footerChildren = [];
  if (config.showPageNumber || (data.footer && data.footer.text)) {
    if (data.footer && data.footer.text) {
      footerChildren.push(
        new Paragraph({
          text: data.footer.text,
          alignment: String(data.footer?.alignment ?? 'left').toLowerCase(),
        } as any)
      );
    }

    if (config.showPageNumber) {
      footerChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
            }),
          ],
        })
      );
    }

    footerConfigs = {
      default: new Footer({
        children: footerChildren,
      }),
    };
  }

  // Generate the footnotes
  const footnoteConfig = generateFootnotes(data.sections);
  const numberingConfig: any[] = [BULLET_CONFIG];
  const selectedNumberingOption = NUMBERING_OPTIONS[config.numberingReference];
  if (selectedNumberingOption) {
    numberingConfig.push(selectedNumberingOption);
  }

  const tableOfContentConfigs = [];
  if (config.showTableOfContent) {
    tableOfContentConfigs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Table of Contents',
            bold: true,
            size: FONT_CONFIG.tableOfContentSize * 2,
          }),
        ],
        spacing: { after: SPACING_CONFIG.tableOfContent.after * 20 },
      })
    );
    tableOfContentConfigs.push(
      new TableOfContents({
        stylesWithLevels: [
          { style: 'Heading1', level: 1 },
          { style: 'Heading2', level: 2 },
          { style: 'Heading3', level: 3 },
          { style: 'Heading4', level: 4 },
        ],
        leader: LeaderType.DOT, // Dot leader
      } as any)
    );
  }

  // Create the document based on JSON data
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: config.fontFamily,
            size: config.fontSize * 2, // Font size in half-points
          },
          paragraph: {
            spacing: { line: config.lineHeight }, // Line height
          },
        },
      },
    },
    numbering: {
      config: numberingConfig,
    },
    sections: [
      {
        properties: {
          page: {
            margin: config.margins,
            orientation: config.pageOrientation,
          } as any,
        },
        headers: headerConfigs,
        footers: footerConfigs,
        children: [
          // Title of the proposal with larger font size
          new Paragraph({
            children: [
              new TextRun({
                text: data.title,
                size: FONT_CONFIG.titleSize * 2,
              }),
            ],
            heading: HeadingLevel.TITLE,
            spacing: { after: SPACING_CONFIG.title.after * 20 }, // 12 inches * 20 = 240 twips
          }),
          ...tableOfContentConfigs,
          // Generate all sections and sub-sections
          ...data.sections.flatMap((section) =>
            generateSectionContent(section, { ...config, numberingReference: selectedNumberingOption?.reference })
          ),
        ],
      },
    ],
    footnotes: footnoteConfig, // TODO: Enhance footnote
  });

  const fileName = `word-file-${new Date().toISOString().replace(/\D/gi, '')}.docx`;
  const filePath = path.join(exportsDir, fileName);

  // Create and save the document
  Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(filePath, buffer);
  });

  return fileName;
}

export const wordGeneratorRouter: Router = (() => {
  const router = express.Router();
  // Static route for downloading files
  router.use('/downloads', express.static(exportsDir));

  router.post('/generate', async (_req: Request, res: Response) => {
    const { title, sections = [], header, footer, wordConfig = {} } = _req.body;
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
        numberingReference: wordConfig.numberingReference ?? '',
        showPageNumber: wordConfig.showPageNumber ?? false,
        pageOrientation: wordConfig.pageOrientation ? wordConfig.pageOrientation : PageOrientation.PORTRAIT,
        fontFamily: wordConfig.fontFamily ? wordConfig.fontFamily : FONT_CONFIG.family,
        fontSize: wordConfig.fontSize ? wordConfig.fontSize : FONT_CONFIG.size,
        lineHeight: wordConfig.lineHeight ? LINE_HEIGHT_CONFIG[wordConfig.lineHeight] : LINE_HEIGHT_CONFIG['1.15'],
        margins: wordConfig.margins ? PAGE_MARGINS[wordConfig.margins] : PAGE_MARGINS.NORMAL,
        showTableOfContent: wordConfig.showTableOfContent ?? false,
      };

      const fileName = await execGenWordFuncs(
        {
          title,
          sections,
          header,
          footer,
        },
        wordConfigs
      );
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
      let responseObject = '';
      if (errorMessage.includes('')) {
        responseObject = `Sorry, we couldn't generate word file.`;
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

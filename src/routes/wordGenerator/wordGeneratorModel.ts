import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

// Define Word Generator Response Schema
export type WordGeneratorResponse = z.infer<typeof WordGeneratorResponseSchema>;
export const WordGeneratorResponseSchema = z.object({
  filepath: z.string().openapi({
    description: 'The file path where the generated Word document is saved.',
  }),
});

// Define Cell Schema
const CellSchema = z.object({
  text: z.string().optional().openapi({
    description: 'Text content within a cell.',
  }),
});

// Define Row Schema
const RowSchema = z.object({
  cells: z.array(CellSchema).optional().openapi({
    description: 'Array of cells within a row.',
  }),
});

// Define Content Schema
const ContentSchema = z.object({
  type: z.enum(['paragraph', 'listing', 'table', 'pageBreak', 'emptyLine']).openapi({
    description: 'Type of the content item.',
  }),
  text: z.string().optional().openapi({
    description: 'Text content for paragraphs or listings.',
  }),
  items: z.array(z.string()).optional().openapi({
    description: 'Items in a list for listing type content.',
  }),
  headers: z.array(z.string()).optional().openapi({
    description: 'Headers for table content.',
  }),
  rows: z.array(RowSchema).optional().openapi({
    description: 'Rows for table content.',
  }),
});

// Define the base schema for a section
const BaseSectionSchema = z.object({
  heading: z.string().optional().openapi({
    description: 'Heading of the section.',
  }),
  headingLevel: z.number().int().min(1).optional().openapi({
    description: 'Level of the heading (e.g., 1 for main heading, 2 for subheading).',
  }),
  content: z.array(ContentSchema).optional().openapi({
    description: 'Content contained within the section, including paragraphs, tables, etc.',
  }),
});

// Extend the base schema with subSections
const SectionSchema = BaseSectionSchema.extend({
  subSections: z.array(BaseSectionSchema).optional().openapi({
    description: 'Subsections within the main section.',
  }),
});

// Request Body Schema
export const WordGeneratorRequestBodySchema = z.object({
  title: z.string().openapi({
    description: 'Title of the document.',
  }),
  header: z.object({
    text: z.string().openapi({
      description: 'Text content for the header.',
    }),
    alignment: z.enum(['left', 'center', 'right']).default('left').openapi({
      description: 'Alignment of the header text.',
    }),
  }),
  footer: z.object({
    text: z.string().openapi({
      description: 'Text content for the footer.',
    }),
    alignment: z.enum(['left', 'center', 'right']).default('left').openapi({
      description: 'Alignment of the footer text.',
    }),
  }),
  sections: z.array(SectionSchema).openapi({
    description: 'Sections of the document, which may include sub-sections.',
  }),
  wordConfig: z
    .object({
      fontSize: z.number().default(12).openapi({
        description: 'Font size for the slides, default is 12 pt.',
      }),
      lineHeight: z.enum(['1', '1.15', '1.25', '1.5', '2']).default('1').openapi({
        description: 'Line height for text content.',
      }),
      fontFamily: z
        .enum(['Arial', 'Calibri', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Georgia', 'Comic Sans MS'])
        .default('Arial')
        .openapi({
          description: 'Font family for the slides, default is Arial.',
        }),
      showPageNumber: z.boolean().default(false).openapi({
        description: 'Option to display page numbers in the document.',
      }),
      showTableOfContent: z.boolean().default(false).openapi({
        description: 'Option to display a table of contents.',
      }),
      showNumberingInHeader: z.boolean().default(false).openapi({
        description: 'Option to display numbering in the header.',
      }),
      numberingReference: z
        .enum([
          '1.1.1.1 (Decimal)',
          'I.1.a.i (Roman -> Decimal > Lower Letter -> Lower Roman)',
          'I.A.1.a (Roman -> Upper Letter -> Decimal -> Lower Letter)',
          '1)a)i)(i) (Decimal -> Lower Letter -> Lower Roman -> Lower Roman with Parentheses)',
          'A.1.a.i (Upper Letter -> Decimal -> Lower Letter -> Lower Roman)',
        ])
        .default('1.1.1.1 (Decimal)')
        .openapi({
          description: 'Set numbering hierarchy format for the document.',
        }),
      pageOrientation: z.enum(['portrait', 'landscape']).default('portrait').openapi({
        description: 'Set the page orientation for the document.',
      }),
      margins: z.enum(['normal', 'narrow', 'moderate', 'wide', 'mirrored']).default('normal').openapi({
        description: 'Set page margins for the document.',
      }),
    })
    .openapi({
      description: 'Word configuration settings for generating the document.',
    }),
});

export type WordGeneratorRequestBody = z.infer<typeof WordGeneratorRequestBodySchema>;

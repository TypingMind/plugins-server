import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export type PowerPointGeneratorResponse = z.infer<typeof PowerpointGeneratorResponseSchema>;
export const PowerpointGeneratorResponseSchema = z.object({
  filepath: z.string(),
});

export type PowerPointGeneratorRequestBody = z.infer<typeof PowerpointGeneratorRequestBodySchema>;
export const PowerpointGeneratorRequestBodySchema = z.object({
  slides: z
    .array(
      z.object({
        type: z
          .enum(['title_slide', 'content_slide', 'table_slide', 'chart_slide'])
          .describe(
            "The type of slide, either 'title_slide' (title-only), 'content_slide' (title and content), 'table_slide' (title with tabular content), or 'chart_slide' (title with chart content)."
          ),
        title: z.string().describe('The title of the slide.'),
        content: z
          .array(
            z
              .array(z.string())
              .describe("It could be a row in the table for 'table_slide'. Each row is an array of strings.")
          )
          .optional()
          .describe(
            "The content of the slide. For 'title_slide', this is not required. For 'content_slide', it can be a string (paragraph) or an array of strings (list). For 'table_slide', it is an array of rows, where each row is an array of strings."
          ),
        subtitle: z
          .string()
          .optional()
          .describe(
            'The subtitle of the slide, which provides additional information to support the title. Only title_slide has the subtitle.'
          ),
        chartContent: z
          .object({
            type: z
              .enum(['pie', 'bar', 'line', 'doughnut'])
              .describe("The type of chart, either 'pie', 'doughnut', 'bar', or 'line'."),
            data: z
              .array(
                z.object({
                  name: z.string().describe('The name of the chart series.'),
                  labels: z.array(z.string()).describe('The labels for the chart (e.g., categories, time periods).'),
                  values: z.array(z.number()).describe('The values for each label in the chart.'),
                })
              )
              .describe('The chart data. Depending on the type, this can be an array of labels and values.'),
          })
          .optional()
          .describe(
            "The chart data for 'chart_slide'. This includes various types of chart data such as pie charts, doughnut charts, bar charts, and line charts."
          ),
      })
    )
    .describe('A list of slides, where each slide includes its type, title, and content.'),
  slideConfig: z
    .object({
      layout: z
        .enum(['LAYOUT_WIDE', 'LAYOUT_16x9', 'LAYOUT_16x10', 'LAYOUT_4x3'])
        .describe(
          'Defines the slide layout. Options include LAYOUT_WIDE (default), LAYOUT_16x9, LAYOUT_16x10, and LAYOUT_4x3.'
        ),
      titleFontSize: z.number().optional().describe('Font size for the title slide. Default is 52 pt.'),
      headerFontSize: z.number().optional().describe('Font size for headers in content slides. Default is 32 pt.'),
      bodyFontSize: z.number().optional().describe('Font size for the main content text. Default is 24 pt.'),
      fontFamily: z
        .enum([
          'Calibri',
          'Arial',
          'Courier New',
          'Georgia',
          'Helvetica',
          'Impact',
          'Lucida Console',
          'Tahoma',
          'Times New Roman',
          'Trebuchet MS',
          'Verdana',
          'Comic Sans MS',
          'Franklin Gothic Medium',
          'Century Gothic',
          'Gill Sans',
          'Garamond',
          'Palatino Linotype',
          'Segoe UI',
          'Book Antiqua',
          'Symbol',
          'Monospace',
          'Webdings',
          'Wingdings',
        ])
        .describe("Font family for slide text. Default is 'Calibri'."),
      backgroundColor: z.string().describe('Hex color for slide background. Default is #FFFFFF.'),
      textColor: z.string().describe('Hex color for slide text. Default is #000000.'),
      showFooter: z.boolean().describe('Boolean to display footer. Default is false.'),
      showSlideNumber: z.boolean().describe('Boolean to display slide numbers. Default is false.'),
      footerBackgroundColor: z.string().describe('Hex color for footer background. Default is #003B75.'),
      footerText: z.string().optional().describe("Text content for the footer. Default is 'footer text'."),
      footerTextColor: z.string().describe('Hex color for footer text. Default is #FFFFFF.'),
      footerFontSize: z.number().optional().describe('Font size for footer text. Default is 10 pt.'),
      showTableBorder: z.boolean().describe('Boolean to display table borders. Default is true.'),
      tableHeaderBackgroundColor: z.string().describe('Hex color for table header background. Default is #003B75.'),
      tableHeaderTextColor: z.string().describe('Hex color for table header text. Default is #FFFFFF.'),
      tableBorderThickness: z.number().optional().describe('Thickness of table borders in points. Default is 1 pt.'),
      tableBorderColor: z.string().describe('Hex color for table borders. Default is #000000.'),
      tableFontSize: z.number().optional().describe('Font size for text inside tables. Default is 14 pt.'),
      tableTextColor: z.string().describe('Hex color for table text. Default is #000000.'),
    })
    .describe(
      'Configuration settings for customizing slide properties, including layout, font sizes, font family, colors, footer settings, and table appearance.'
    ),
});

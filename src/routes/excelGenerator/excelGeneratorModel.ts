import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

// Define Word Generator Response Schema
export type ExcelGeneratorResponse = z.infer<typeof ExcelGeneratorResponseSchema>;
export const ExcelGeneratorResponseSchema = z.object({
  downloadUrl: z.string().openapi({
    description: 'The file path where the generated Word document is saved.',
  }),
});

// Request Body Schema
export const ExcelGeneratorRequestBodySchema = z
  .object({
    sheetsData: z
      .array(
        z.object({
          sheetName: z.string().openapi({
            description: 'The name of the sheet to be created in the Excel file.',
          }),
          tables: z
            .array(
              z.object({
                title: z.string().optional().openapi({
                  description: 'The title of the table, which will be displayed in the first row.',
                }),
                startCell: z.string().openapi({
                  description: "The starting cell (e.g., 'A1') where the table will begin.",
                }),
                columns: z
                  .array(
                    z.object({
                      name: z.string().openapi({
                        description: 'The name of the column.',
                      }),
                      type: z.enum(['string', 'number', 'boolean', 'percent', 'currency', 'date']).openapi({
                        description: 'The data type of the column.',
                      }),
                      format: z.string().optional().openapi({
                        description: "The format of the column (e.g., '0.00%', '$#,##0', etc.).",
                      }),
                    })
                  )
                  .openapi({
                    description: 'The list of columns in the table, each with a name, type, and optional format.',
                  }),
                rows: z
                  .array(
                    z.array(
                      z.object({
                        type: z.enum(['static_value', 'formula']).openapi({
                          description: 'Indicates whether the cell contains a static value or a formula.',
                        }),
                        value: z.string().openapi({
                          description: 'The actual value or formula for the cell.',
                        }),
                      })
                    )
                  )
                  .openapi({
                    description: 'Array of rows in the table, where each row is an array of cells.',
                  }),
                skipHeader: z.boolean().optional().openapi({
                  description: 'Whether to skip the header row for this table.',
                }),
              })
            )
            .openapi({
              description: 'The tables to include in the sheet.',
            }),
        })
      )
      .openapi({
        description: 'An array of sheet data, where each sheet contains a name and an array of tables to generate.',
      }),
    excelConfigs: z
      .object({
        fontFamily: z.string().optional(),
        fontSize: z.number().optional(),
        headerFontSize: z.number().optional(),
        tableTitleFontSize: z.number().optional(),
        borderStyle: z.enum(['none', 'thin', 'double', 'dashed', 'thick']).optional(),
        autoFitColumnWidth: z.boolean().optional(),
        autoFilter: z.boolean().optional(),
        wrapText: z.boolean().optional(),
      })
      .optional()
      .openapi({
        description: 'Configuration for the Excel file.',
      }),
  })
  .openapi({
    description: 'Request body for generating an Excel file.',
  });

export type ExcelGeneratorRequestBody = z.infer<typeof ExcelGeneratorRequestBodySchema>;

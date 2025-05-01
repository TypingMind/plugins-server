// wordTemplateManager.ts - NEW FILE 
// Manages Word templates for the Unbound Group companies

import fs from 'fs';
import path from 'path';

// Define template directory path
const templatesDir = path.join(__dirname, '../../..', 'word-templates');

// Ensure the templates directory exists
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Define company templates configuration
export interface CompanyTemplate {
  id: string;
  name: string;
  description: string;
  fileName: string;
  defaultHeaderLogo?: string; // Optional backup if template doesn't contain logo
  defaultFooterText?: string; // Optional backup if template doesn't have footer
  colorPalette?: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  };
  fontSettings?: {
    heading1: { font: string; size: number; color: string };
    heading2: { font: string; size: number; color: string };
    heading3: { font: string; size: number; color: string };
    normal: { font: string; size: number; color: string };
  };
}

// Unbound Group templates
export const COMPANY_TEMPLATES: CompanyTemplate[] = [
  {
    id: 'unbound-default',
    name: 'Unbound Group',
    description: 'Default Unbound Group template',
    fileName: 'unbound-default-template.docx',
    defaultFooterText: '© Unbound Group',
    colorPalette: {
      primary: '000000', // Black
      secondary: '4472c4', // Blue
      accent: 'ed7d31', // Orange
      text: '000000', // Black
    },
    fontSettings: {
      heading1: { font: 'Calibri', size: 16, color: '4472c4' },
      heading2: { font: 'Calibri', size: 14, color: '4472c4' },
      heading3: { font: 'Calibri', size: 12, color: '4472c4' },
      normal: { font: 'Calibri', size: 11, color: '000000' },
    },
  },
  {
    id: 'traffic-builders',
    name: 'Traffic Builders',
    description: 'Traffic Builders corporate template',
    fileName: 'traffic-builders-template.docx',
    defaultFooterText: '© Traffic Builders',
    colorPalette: {
      primary: '71CFF2', // Traffic Builders blue
      secondary: '000000', // Black
      accent: 'FF6600', // Orange
      text: '000000', // Black
    },
    fontSettings: {
      heading1: { font: 'Montserrat', size: 16, color: '71CFF2' },
      heading2: { font: 'Montserrat', size: 14, color: '71CFF2' },
      heading3: { font: 'Montserrat', size: 12, color: '71CFF2' },
      normal: { font: 'Arial', size: 11, color: '000000' },
    },
  },
  {
    id: 'shoq',
    name: 'Shoq',
    description: 'Shoq corporate template',
    fileName: 'shoq-template.docx',
    defaultFooterText: '© Shoq',
    colorPalette: {
      primary: '0066FF', // Shoq blue
      secondary: '000000', // Black
      accent: 'FF9900', // Orange
      text: '000000', // Black
    },
    fontSettings: {
      heading1: { font: 'Roboto', size: 16, color: '0066FF' },
      heading2: { font: 'Roboto', size: 14, color: '0066FF' },
      heading3: { font: 'Roboto', size: 12, color: '0066FF' },
      normal: { font: 'Roboto', size: 11, color: '000000' },
    },
  },
  {
    id: 'datahive',
    name: 'Datahive',
    description: 'Datahive corporate template',
    fileName: 'datahive-template.docx',
    defaultFooterText: '© Datahive',
    colorPalette: {
      primary: '05A595', // Datahive teal
      secondary: '000000', // Black
      accent: 'FF4500', // Orange-red
      text: '000000', // Black
    },
    fontSettings: {
      heading1: { font: 'Open Sans', size: 16, color: '05A595' },
      heading2: { font: 'Open Sans', size: 14, color: '05A595' },
      heading3: { font: 'Open Sans', size: 12, color: '05A595' },
      normal: { font: 'Open Sans', size: 11, color: '000000' },
    },
  },
];

/**
 * Get list of available templates
 */
export function getAvailableTemplates(): CompanyTemplate[] {
  return COMPANY_TEMPLATES;
}

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): CompanyTemplate | undefined {
  return COMPANY_TEMPLATES.find((template) => template.id === templateId);
}

/**
 * Get default template
 */
export function getDefaultTemplate(): CompanyTemplate {
  return COMPANY_TEMPLATES[0]; // Unbound Group template is default
}

/**
 * Get template file path
 */
export function getTemplateFilePath(templateId: string): string {
  const template = getTemplateById(templateId) || getDefaultTemplate();
  return path.join(templatesDir, template.fileName);
}

/**
 * Check if template file exists
 */
export function templateFileExists(templateId: string): boolean {
  const filePath = getTemplateFilePath(templateId);
  return fs.existsSync(filePath);
}

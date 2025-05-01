// wordTemplateProcessor.ts - NEW FILE
// Handles Word template processing using docxtemplater

import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import { getTemplateFilePath, getTemplateById, getDefaultTemplate } from './wordTemplateManager';

// Set up image module
const imageModule = new ImageModule({
  centered: false,
  getImage: function (tagValue: string) {
    return fs.readFileSync(tagValue);
  },
  getSize: function () {
    return [100, 100]; // Default size, will be overridden by template
  }
});

/**
 * Process Word template with data
 */
export async function processTemplate(
  templateId: string,
  data: any,
  outputPath: string
): Promise<void> {
  try {
    const templatePath = getTemplateFilePath(templateId);
    
    // If template doesn't exist, use default
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template ${templateId} not found, using default template`);
      const defaultTemplate = getDefaultTemplate();
      templatePath = getTemplateFilePath(defaultTemplate.id);
    }
    
    // Read the template
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    // Initialize template engine
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule]
    });
    
    // Set template data
    doc.setData(data);
    
    // Render the document
    doc.render();
    
    // Generate output
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    // Write to file
    fs.writeFileSync(outputPath, buf);
    
    return;
  } catch (error) {
    console.error('Error processing template:', error);
    throw error;
  }
}

/**
 * Convert sections data to template-friendly format
 */
export function convertSectionsToTemplateData(sections: any[], companyId: string): any {
  // Get company settings
  const template = getTemplateById(companyId) || getDefaultTemplate();
  
  // Structure for template data
  const templateData = {
    title: '',
    company: {
      name: template.name,
      footerText: template.defaultFooterText || '© Unbound Group',
      colors: template.colorPalette,
      fonts: template.fontSettings
    },
    sections: [],
    currentDate: new Date().toLocaleDateString('nl-NL')
  };
  
  // Process sections hierarchically
  const processSection = (section: any) => {
    const processedSection = {
      heading: section.heading || '',
      headingLevel: section.headingLevel || 1,
      content: []
    };
    
    // Process content
    if (section.content) {
      section.content.forEach((item: any) => {
        if (item.type === 'paragraph') {
          processedSection.content.push({
            type: 'paragraph',
            text: item.text
          });
        } else if (item.type === 'listing') {
          processedSection.content.push({
            type: 'list',
            items: item.items || []
          });
        } else if (item.type === 'table') {
          processedSection.content.push({
            type: 'table',
            headers: item.headers || [],
            rows: item.rows || []
          });
        }
        // Other types can be handled similarly
      });
    }
    
    return processedSection;
  };
  
  // Process all sections
  sections.forEach(section => {
    templateData.sections.push(processSection(section));
  });
  
  return templateData;
}
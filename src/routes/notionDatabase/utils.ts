function flattenConditions(conditions: any[]): any[] {
  return conditions.reduce((acc, condition) => {
    if (condition.and) {
      // Recursively flatten "and" conditions
      return acc.concat(flattenConditions(condition.and));
    } else if (condition.or) {
      // Recursively flatten "or" conditions
      return acc.concat(flattenConditions(condition.or));
    }
    // Base case: direct condition object
    return acc.concat(condition);
  }, []);
}

export function validateDatabaseQueryConfig(databaseStructures: any[], filter: any, sorts: any[]): void {
  const validPropertyNames = databaseStructures.map((property) => property.name);

  // Flatten filter conditions recursively
  let flatConditions = [];
  if (Object.prototype.hasOwnProperty.call(filter, 'and') || Object.prototype.hasOwnProperty.call(filter, 'or')) {
    flatConditions = flattenConditions(filter.and || filter.or);
  }

  // Validate flattened filter conditions
  for (const condition of flatConditions) {
    if (!validPropertyNames.includes(condition.property)) {
      throw new Error(
        `[Validation Error] The property '${condition.property}' used in filters is invalid. Make sure it matches with current database structure.`
      );
    }
  }

  // Validate sorts
  for (const sort of sorts) {
    if (!validPropertyNames.includes(sort.property)) {
      throw new Error(
        `[Validation Error] The property '${sort.property}' used in sorts is invalid. Make sure it matches with current database structure.`
      );
    }
  }
}

export function validateNotionProperties(databaseStructure: any[], properties: any[]): void {
  const validProperties = new Map(databaseStructure.map((prop) => [prop.name, prop.type]));

  properties.forEach((property) => {
    const { propertyName, propertyType } = property;

    if (!validProperties.has(propertyName)) {
      throw new Error(
        `[Validation Error] Property '${propertyName}' does not exist in the database structure. Make sure it matches with the current database structure.`
      );
    }

    if (validProperties.get(propertyName) !== propertyType) {
      throw new Error(
        `[Validation Error] Property '${propertyName}' has an invalid type '${propertyType}'. Expected type is '${validProperties.get(propertyName)}'.`
      );
    }
  });
}

export function buildColumnSchema({ propertyName, propertyType, options = [], format, formatDate, formula = '' }: any) {
  const schema: any = {
    properties: {},
  };

  // Define properties based on the column type
  switch (propertyType) {
    case 'title':
      schema.properties[propertyName] = { title: {} };
      break;
    case 'rich_text':
      schema.properties[propertyName] = { rich_text: {} };
      break;
    case 'number':
      schema.properties[propertyName] = { number: { format: format } };
      break;
    case 'select':
      schema.properties[propertyName] = {
        select: {
          options: options.map((option: any) => ({
            name: option.name,
            color: option.color || 'default',
          })),
        },
      };
      break;
    case 'multi_select':
      schema.properties[propertyName] = {
        multi_select: {
          options: options.map((option: any) => ({
            name: option.name,
            color: option.color || 'default',
          })),
        },
      };
      break;
    case 'date':
      schema.properties[propertyName] = {
        date: {
          format: formatDate,
        },
      };
      break;
    case 'checkbox':
      schema.properties[propertyName] = { checkbox: {} };
      break;
    case 'url':
      schema.properties[propertyName] = { url: {} };
      break;
    case 'email':
      schema.properties[propertyName] = { email: {} };
      break;
    case 'phone_number':
      schema.properties[propertyName] = { phone_number: {} };
      break;
    case 'formula':
      schema.properties[propertyName] = {
        formula: {
          expression: formula, // Formula expression goes here
        },
      };
      break;
    case 'status':
      schema.properties[propertyName] = { status: {} };
      break;
    case 'files':
      schema.properties[propertyName] = { files: {} };
      break;
    default:
      throw new Error(`Unknown column type: ${propertyType}`);
  }

  return schema;
}

export function mapNotionRichTextProperty(value: any[]) {
  const DEFAULT_ANNOTATIONS = {
    italic: false,
    bold: false,
    color: 'default',
    strikethrough: false,
    underline: false,
  };

  return value.map((item) => {
    const annotationConfigs = item.annotations || DEFAULT_ANNOTATIONS;
    return {
      type: 'text',
      text: { content: item.text.content },
      annotations: {
        italic: annotationConfigs.italic !== undefined ? annotationConfigs.italic : DEFAULT_ANNOTATIONS.italic,
        bold: annotationConfigs.bold !== undefined ? annotationConfigs.bold : DEFAULT_ANNOTATIONS.bold,
        color: annotationConfigs.color ? annotationConfigs.color : DEFAULT_ANNOTATIONS.color,
        strikethrough:
          annotationConfigs.strikethrough !== undefined
            ? annotationConfigs.strikethrough
            : DEFAULT_ANNOTATIONS.strikethrough,
        underline:
          annotationConfigs.underline !== undefined ? annotationConfigs.underline : DEFAULT_ANNOTATIONS.underline,
      },
    };
  });
}

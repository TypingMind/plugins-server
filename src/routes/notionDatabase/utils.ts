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

export interface ColumnSchema {
  type: string;
  nullable?: boolean;
  [key: string]: any;
}

export interface ValueConversionResult {
  success: boolean;
  value?: any;
  error?: string;
}

/**
 * Convert a value to the appropriate type based on PostgreSQL column schema
 * @param columnSchema - The column schema information
 * @param newValue - The raw value to convert
 * @returns ValueConversionResult with success status, converted value, or error message
 */
export function convertValueForColumn(
  columnSchema: ColumnSchema,
  newValue: any
): ValueConversionResult {
  try {
    let convertedValue: any = newValue;

    if (columnSchema.type === 'integer') {
      if (newValue === '' || newValue === null) {
        convertedValue = null;
      } else {
        convertedValue = parseInt(String(newValue), 10);
        if (isNaN(convertedValue)) {
          return {
            success: false,
            error: 'Please enter a valid integer',
          };
        }
        // PostgreSQL integer range: -2,147,483,648 to 2,147,483,647
        if (convertedValue < -2147483648 || convertedValue > 2147483647) {
          return {
            success: false,
            error:
              'Integer value out of range. Please enter a value between -2,147,483,648 and 2,147,483,647',
          };
        }
      }
    } else if (columnSchema.type === 'bigint') {
      if (newValue === '' || newValue === null) {
        convertedValue = null;
      } else {
        convertedValue = parseInt(String(newValue), 10);
        if (isNaN(convertedValue)) {
          return {
            success: false,
            error: 'Please enter a valid integer',
          };
        }
        // PostgreSQL bigint range: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
        if (convertedValue < -9223372036854775808 || convertedValue > 9223372036854775807) {
          return {
            success: false,
            error: 'Bigint value out of range. Please enter a valid 64-bit integer value',
          };
        }
      }
    } else if (columnSchema.type === 'double precision' || columnSchema.type === 'float8') {
      if (newValue === '' || newValue === null) {
        convertedValue = null;
      } else {
        convertedValue = parseFloat(String(newValue));
        if (isNaN(convertedValue)) {
          return {
            success: false,
            error: 'Please enter a valid number',
          };
        }
        // PostgreSQL double precision range: approximately ±1.7976931348623157E+308
        if (!isFinite(convertedValue)) {
          return {
            success: false,
            error: 'Number value out of range. Please enter a valid double precision number',
          };
        }
        if (Math.abs(convertedValue) > 1.7976931348623157e308) {
          return {
            success: false,
            error: 'Number value exceeds double precision range',
          };
        }
      }
    } else if (columnSchema.type === 'real' || columnSchema.type === 'float4') {
      if (newValue === '' || newValue === null) {
        convertedValue = null;
      } else {
        convertedValue = parseFloat(String(newValue));
        if (isNaN(convertedValue)) {
          return {
            success: false,
            error: 'Please enter a valid number',
          };
        }
        // PostgreSQL real range: approximately ±3.40282347E+38
        if (!isFinite(convertedValue)) {
          return {
            success: false,
            error: 'Number value out of range. Please enter a valid single precision number',
          };
        }
        if (Math.abs(convertedValue) > 3.4028235e38) {
          return {
            success: false,
            error: 'Number value exceeds single precision range',
          };
        }
      }
    } else if (columnSchema.type === 'numeric' || columnSchema.type === 'decimal') {
      if (newValue === '' || newValue === null) {
        convertedValue = null;
      } else {
        // For numeric/decimal, we keep it as string to preserve precision
        const numericStr = String(newValue).trim();
        // Basic numeric format validation
        if (
          !/^-?\d*\.?\d*$/.test(numericStr) ||
          numericStr === '' ||
          numericStr === '.' ||
          numericStr === '-'
        ) {
          return {
            success: false,
            error: 'Please enter a valid number format',
          };
        }
        convertedValue = numericStr;
      }
    } else if (columnSchema.type === 'smallint') {
      if (newValue === '' || newValue === null) {
        convertedValue = null;
      } else {
        convertedValue = parseInt(String(newValue), 10);
        if (isNaN(convertedValue)) {
          return {
            success: false,
            error: 'Please enter a valid integer',
          };
        }
        // PostgreSQL smallint range: -32,768 to 32,767
        if (convertedValue < -32768 || convertedValue > 32767) {
          return {
            success: false,
            error: 'Smallint value out of range. Please enter a value between -32,768 and 32,767',
          };
        }
      }
    } else if (columnSchema.type === 'boolean') {
      if (typeof newValue === 'string') {
        switch (newValue.toLowerCase()) {
          case 'true':
            convertedValue = true;
            break;
          case 'false':
            convertedValue = false;
            break;
          case 'null':
          case '':
            convertedValue = null;
            break;
          default:
            return {
              success: false,
              error: 'Please enter a valid boolean value: true, false, or leave empty',
            };
        }
      }
    }

    return {
      success: true,
      value: convertedValue,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown conversion error',
    };
  }
}

/**
 * Check if a value is considered empty for database purposes
 * @param value - The value to check
 * @returns boolean indicating if the value is empty
 */
export function isEmptyValue(value: any): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Format a value for display in the UI
 * @param value - The value to format
 * @param columnType - The column type for context
 * @returns Formatted string representation
 */
export function formatValueForDisplay(value: any, columnType?: string): string {
  if (isEmptyValue(value)) {
    return '';
  }

  if (columnType === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (columnType === 'json' || columnType === 'jsonb') {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

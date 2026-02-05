/**
 * Sanitizes CSV data to prevent CSV/Excel Injection attacks.
 * It prepends a single quote to any field that starts with: =, +, -, or @
 */
export const sanitizeCsvValue = (value: any): any => {
    if (typeof value !== 'string') return value;

    const trimmedValue = value.trim();
    const dangerousChars = ['=', '+', '-', '@'];

    if (dangerousChars.some(char => trimmedValue.startsWith(char))) {
        // Option 1: Prepend ' to neutralize
        // return `'${trimmedValue}`;

        // Option 2: Remove the dangerous character (more aggressive)
        // return trimmedValue.substring(1).trim();

        // Option 3: Throw error or log as suspicious
        console.warn(`Suspicious CSV value detected and sanitized: ${trimmedValue}`);
        return trimmedValue.replace(/^([=+\-@])/, "'$1");
    }

    return trimmedValue;
};

/**
 * Normalizes item names (Category, Brand) for consistent mapping.
 * Trims whitespace and converts to UPPERCASE.
 */
export const normalizeName = (name: string): string => {
    if (!name) return '';
    return name.trim().toUpperCase();
};

/**
 * Sanitizes an entire object (CSV Row)
 */
export const sanitizeCsvRow = (row: any): any => {
    const sanitized: any = {};
    for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
            sanitized[key] = sanitizeCsvValue(row[key]);
        }
    }
    return sanitized;
};

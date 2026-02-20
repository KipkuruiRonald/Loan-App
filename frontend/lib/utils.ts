/**
 * Format currency values in Kenyan Shillings
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format date strings
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format datetime strings
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Sort array of objects by key
 */
export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Safely extract error message from various error formats
 * Handles: strings, objects with .message, .detail, .error,
 * axios response objects with nested data, and arrays
 */
export function getErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (!error) return fallback;
  
  // Already a string
  if (typeof error === 'string') return error;
  
  // Error has a message property (including Error instances)
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as any).message;
    if (typeof msg === 'string') return msg;
    if (typeof msg === 'object' && msg !== null) {
      // Could be array or object
      return JSON.stringify(msg);
    }
  }
  
  // Axios-style response error
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as any).response;
    if (response) {
      // Check for detail (FastAPI/Pydantic format)
      if ('data' in response) {
        const data = response.data;
        if (data) {
          // detail could be string, object, or array
          if ('detail' in data) {
            const detail = data.detail;
            if (typeof detail === 'string') return detail;
            if (Array.isArray(detail)) {
              // Pydantic validation errors are arrays
              return detail.map((e: any) => {
                if (typeof e === 'string') return e;
                return e.msg || JSON.stringify(e);
              }).join(', ');
            }
            if (typeof detail === 'object') return JSON.stringify(detail);
          }
          // Check for error property
          if ('error' in data) {
            const err = data.error;
            if (typeof err === 'string') return err;
            return JSON.stringify(err);
          }
          // Return the whole data as string if nothing else matched
          return JSON.stringify(data);
        }
      }
    }
  }
  
  // Error has detail property directly
  if (typeof error === 'object' && error !== null && 'detail' in error) {
    const detail = (error as any).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((e: any) => {
        if (typeof e === 'string') return e;
        return e.msg || JSON.stringify(e);
      }).join(', ');
    }
    return JSON.stringify(detail);
  }
  
  // Error has error property directly
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const err = (error as any).error;
    if (typeof err === 'string') return err;
    return JSON.stringify(err);
  }
  
  // Last resort: try to stringify
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}

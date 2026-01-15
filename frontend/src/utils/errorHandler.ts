/**
 * Extract user-friendly error message from API error response
 */
export function getErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  // If error has a response with data
  if (error?.response?.data) {
    const data = error.response.data;
    
    // Check for error message in different possible locations
    // Priority: message > error (if not generic) > string data
    
    // Check for 'message' field first (most common in Fastify error responses)
    // This is the user-friendly message from the backend
    if (data.message && typeof data.message === 'string' && data.message.trim() !== '') {
      return data.message;
    }
    
    // If data is a string, return it
    if (typeof data === 'string' && data.trim() !== '') {
      return data;
    }
    
    // Check for 'error' field (but skip generic HTTP status names like "Conflict", "Not Found")
    if (data.error) {
      const errorValue = data.error;
      // Skip generic HTTP status names - these are not user-friendly
      const genericStatusNames = [
        'Conflict', 
        'Not Found', 
        'Bad Request', 
        'Unauthorized', 
        'Forbidden', 
        'Internal Server Error',
        'Not Acceptable',
        'Unprocessable Entity',
        'Too Many Requests'
      ];
      if (typeof errorValue === 'string' && !genericStatusNames.includes(errorValue)) {
        return errorValue;
      }
    }
    
    // Check for validation errors
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const errorMessages = data.errors.map((e: any) => {
        if (typeof e === 'string') return e;
        if (e.message) return e.message;
        if (e.path && e.message) return `${e.path}: ${e.message}`;
        return JSON.stringify(e);
      }).filter((msg: string) => msg && msg.trim() !== '');
      
      if (errorMessages.length > 0) {
        return errorMessages.join(', ');
      }
    }
  }
  
  // Check for error message directly
  if (error?.message) {
    return error.message;
  }
  
  // Fallback to default message
  return defaultMessage;
}

/**
 * Get user-friendly error message with context-aware defaults
 */
export function getUserFriendlyError(error: any, context: {
  action: string;
  entity?: string;
  defaultMessage?: string;
}): string {
  const { action, entity, defaultMessage } = context;
  
  // Try to get error from backend first
  const backendError = getErrorMessage(error, '');
  
  if (backendError && backendError !== '') {
    return backendError;
  }
  
  // Generate context-aware default message
  if (defaultMessage) {
    return defaultMessage;
  }
  
  if (entity) {
    return `Failed to ${action} ${entity}. Please try again or contact support if the problem persists.`;
  }
  
  return `Failed to ${action}. Please try again or contact support if the problem persists.`;
}

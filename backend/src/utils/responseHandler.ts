interface ApiResponse {
  statusCode: number;
  message: string;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const successResponse = (statusCode: number, message: string, data?: any): ApiResponse => ({
  statusCode,
  message,
  data
});

export const errorResponse = (
  statusCode: number,
  message: string,
  errorCode: string,
  details?: any
): ApiResponse => ({
  statusCode,
  message,
  error: {
    code: errorCode,
    message,
    details
  }
}); 
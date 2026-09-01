export interface ApiResponseModel<T> {
  success: boolean;
  message: string;
  data?: T | null;
  errorCode?: string;
  details?: unknown;
}

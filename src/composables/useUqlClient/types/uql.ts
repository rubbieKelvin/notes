export interface UQLResponse {
  data: any;
  warning: null | string;
  statusCode: number;
  error: null | {
    message: string;
    errorCode: string | null;
    statusCode: number;
    summary: null | string;
  };
}

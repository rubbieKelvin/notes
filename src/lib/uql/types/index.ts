export interface ErrorTypeface {
  message: string;
  errorCode: string | null;
  statusCode: number;
  summary: null | string;
}

export interface UQLResponse<T> {
  _appname: "uql";
  data: T;
  warning: null | string;
  statusCode: number;
  error: null | ErrorTypeface;
}

export interface UQLFunctionInput<T> {
  url: string;
  intent: string;
  fields?: Record<string, any> | boolean | null;
  headers?: Record<string, any>;
  args?: T;
}

export interface UQLFunctionInputExtras {
  headers?: Record<string, any>;
  fields?: Record<string, any> | null | boolean;
}

export interface ResponseError {
  error: {
    message: string;
    detail?: string;
    code: string | null;
  };
}
export interface QueryFetchOptions {
  url: URL;
  query?: Object;
  select?: Object;
  headers?: Headers;
}

export interface PaginatedFetch {
  prev?: () => Promise<PaginatedFetch>;
  next?: () => Promise<PaginatedFetch>;
  data: Array<any>;
}

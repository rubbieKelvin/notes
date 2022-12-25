import { ErrorTypeface } from "./types";

export class UQLResponseError extends Error {
  public errorCode: string | null;
  public statusCode: number;
  public summary: string | null;

  constructor(args: ErrorTypeface) {
    super(args.message);
    this.errorCode = args.errorCode;
    this.statusCode = args.statusCode;
    this.summary = args.summary;
  }
}

import { UQLFunctionInput, UQLResponse } from "./index";
import { User } from "./models";

export interface SignupInput {
  username: string;
  password: string;
}

export interface SignupResponse {
  user: User;
  token: string;
}



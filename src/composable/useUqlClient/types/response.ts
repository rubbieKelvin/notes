import { User } from "./models";
import { UQLResponse } from "./uql";

export interface LoginResponse extends UQLResponse {
  data: {
    user: User;
    token: string;
  };
}

export interface AuthenticatedUserResponse extends UQLResponse {
  data: User;
}

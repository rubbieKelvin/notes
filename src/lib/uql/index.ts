import axios from "axios";
import * as uqltypes from "./types";
import * as functiontypes from "./types/functions";
import { UQLResponseError } from "./exceptions";

/**
 * Sends a POST request to a given URL with a JSON payload containing an "intent" and "args" fields,
 * and returns the "data" field of the response as a Promise. Throws a `UQLResponseError` if the
 * "error" field of the response is present.
 */
export const apiFunction = async <Args, Response>({
  url,
  intent,
  headers,
  args,
  fields = true,
}: uqltypes.UQLFunctionInput<Args>): Promise<Response> => {
  const response = await axios.request({
    url,
    method: "post",
    headers,
    data: {
      intent,
      fields,
      args,
    },
    validateStatus: () => true, // let's take in everything status
  });

  const responseJson = response.data as uqltypes.UQLResponse<Response>;
  if (responseJson.error) throw new UQLResponseError(responseJson.error);
  return responseJson.data;
};

export const Api = (url: string) => {
  return {
    functions: {
      signup: (
        args: functiontypes.SignupInput,
        extras: uqltypes.UQLFunctionInputExtras
      ) =>
        apiFunction<functiontypes.SignupInput, functiontypes.SignupResponse>({
          url,
          intent: "functions.signup",
          args,
          ...extras,
        }),
    },
  };
};

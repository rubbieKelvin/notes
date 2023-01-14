import * as types from "./types";
import { Axios } from "axios";

export const UQLClient = () => {
  const _ax = new Axios();

  const call = async ({
    intent,
    formdata,
    args,
    fields,
    headers,
  }: types.UQLCall): Promise<types.UQLResponse> => {
    const body = formdata ?? new FormData();
    body.append(
      "$uql.request.body",
      JSON.stringify({ intent, args: args ?? null, fields: fields ?? null })
    );

    const response = await _ax.request({
      method: "post",
      data: body,
      headers: {
        ...(headers ?? {}),
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data as types.UQLResponse;
  };

  const createModel = <Model>(name: string): Model => {
    return {
      __cache: {},
      find: async () => {},
      findMany: async () => {},
      insert: async () => {},
      insertMany: async () => {},
      update: async () => {},
      updateMany: async () => {},
      delete: async () => {},
      deleteMany: async () => {},
    };
  };

  return {
    call,
    createModel,
  };
};

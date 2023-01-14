import * as types from "./types";
import { Axios } from "axios";
import { createSharedComposable } from "@vueuse/core";

export const useUQL = (models: string[]) => {
  const axios = new Axios();
  const __cache: Record<string, object> = {};

  const call = async (
    input: types.UQLFunctionCallInput,
    overridePrefix: boolean = false
  ): Promise<types.UQLResponse> => {
    // prepare input
    const body = input.meta?.initialFormdata ?? new FormData();
    body.append(
      "uql.body",
      JSON.stringify({
        intent: `${overridePrefix ? "" : "functions."}${input.functionName}`,
        args: input.args ?? null,
        fields: input.fields ?? null,
      })
    );

    // prepare response
    const response = await axios.request({
      method: "post",
      data: body,
      headers: {
        ...(input.meta?.headers ?? {}),
        "Content-Type": "multipart/form-data",
      },
    });

    // return
    return response.data as types.UQLResponse;
  };

  const model = <
    Model extends object,
    ModelInsert extends object,
    ModelUpdate extends object
  >(
    name: string,
    meta?: types.InputMeta
  ): types.UQLModelManager<Model, ModelInsert, ModelUpdate> => {
    if (!models.includes(name))
      throw new Error(`Model "${name}" isnt registered`);

    const intent = `models.${name}`;

    const generateSessionCacheID = (instance: any): string | null => {
      if (instance?.id) return `${name}:${instance.id}`;
      return null;
    };

    const updateCache = (instance: Model, remove: boolean = false) => {
      const cachename = generateSessionCacheID(instance);
      if (cachename) {
        if (remove) {
          delete __cache[cachename];
          return;
        }

        __cache[cachename] = {
          ...(__cache[cachename] ?? {}),
          ...instance,
        };
      }
    };

    return {
      find: async (args) => {
        const resp = await call(
          {
            functionName: `${intent}.find`,
            fields: args.fields,
            args: {
              pk: args.pk,
            },
            meta,
          },
          true
        );

        if (resp.error) return null;
        const instance = resp.data as Model;

        updateCache(instance);
        return instance;
      },
      findMany: async (args) => {
        const resp = await call({
          functionName: `${intent}.findmany`,
          fields: args.fields,
          args: {
            where: args.where,
          },
          meta,
        });

        if (resp.error) return null;
        const instances = resp.data as Array<Model>;

        instances.forEach((instance) => updateCache(instance));
        return instances;
      },
      insert: async (args) => {
        const resp = await call(
          {
            functionName: `${intent}.insert`,
            fields: args.fields,
            args: {
              object: args.object,
            },
            meta,
          },
          true
        );

        if (resp.error) return null;
        const instance = resp.data as Model;

        updateCache(instance);
        return instance;
      },
      update: async (args) => {
        const resp = await call(
          {
            functionName: `${intent}.update`,
            fields: args.fields,
            args: {
              partial: {
                pk: args.pk,
                fields: args.updatedFields,
              },
            },
            meta,
          },
          true
        );

        if (resp.error) return null;
        const instance = resp.data as Model;

        updateCache(instance);
        return instance;
      },
      delete: async (args) => {
        const resp = await call(
          {
            functionName: `${intent}.delete`,
            fields: args.fields,
            args: { pk: args.pk },
            meta,
          },
          true
        );
        if (resp.error) return null;
        const instance = resp.data as Model;

        updateCache(instance, true);
        return instance;
      },
    };
  };

  return { call, model };
};

export default createSharedComposable(() => useUQL([]));

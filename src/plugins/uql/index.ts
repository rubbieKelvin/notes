import * as types from "./types";
import axios, { AxiosError } from "axios";
import { createSharedComposable, promiseTimeout } from "@vueuse/core";

export class MaxRetriesReached extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaxRetriesReached";
  }
}

export const useUQL = (url: string, models: string[]) => {
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
    let retryCount = 0;
    const maxRetry = input.meta?.retry?.max ?? 0;
    let retryMultiplier = input.meta?.retry?.retriesIn ?? 3 * 1000;

    do {
      try {
        const response = await axios.request({
          url,
          method: "post",
          data: body,
          headers: {
            ...(input.meta?.headers ?? {}),
            "Content-Type": "multipart/form-data",
          },
          validateStatus: (status) => status < 500,
        });

        // return
        return response.data as types.UQLResponse;
      } catch (e) {
        // retry
        const error = e as AxiosError;
        if (error.name === "AxiosError" && error.code === "ERR_NETWORK") {
          if (retryCount === maxRetry) {
            if (input.meta?.retry?.onError) input.meta.retry.onError(null);
            break;
          }

          retryCount += 1;
          retryMultiplier = Math.min(
            retryMultiplier * retryCount,
            5 * 60 * 1000
          ); // 5 minues max

          if (input.meta?.retry?.onError)
            input.meta.retry.onError(retryMultiplier);

          await promiseTimeout(retryMultiplier);

          if (input.meta?.retry?.onRetry) input.meta.retry.onRetry();
        } else throw e;
      }
    } while (retryCount !== maxRetry);

    if (input.meta?.retry)
      throw new MaxRetriesReached(
        `Retried ${retryCount} time(s), maxRetry is ${maxRetry} time(s)`
      );
    else throw new Error("Network error: error reaching server");
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

        if (resp.error || resp.data === null) return null;
        const instance = resp.data as Model;

        updateCache(instance);
        return instance;
      },
      findMany: async (args) => {
        const resp = await call(
          {
            functionName: `${intent}.findmany`,
            fields: args.fields,
            args: {
              where: args.where ?? null,
              limit: args.limit ?? null,
              offset: args.offset ?? null,
            },
            meta,
          },
          true
        );

        if (resp.error || resp.data === null) return null;
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

        if (resp.error || resp.data === null) return null;
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

        if (resp.error || resp.data === null) return null;
        const instance = resp.data as Model;

        updateCache(instance);
        return instance;
      },
      updateMany: async (args) => {
        const resp = await call(
          {
            functionName: `${intent}.updatemany`,
            fields: args.fields,
            args: {
              partials: args.objects.map((item) => ({
                pk: item.pk,
                fields: item.updatedFields,
              })),
            },
            meta,
          },
          true
        );

        if (resp.error || resp.data === null) return null;
        const instances = resp.data as Array<Model>;

        instances.forEach((instance) => updateCache(instance));
        return instances;
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
        if (resp.error || resp.data === null) return null;
        const instance = resp.data as Model;

        updateCache(instance, true);
        return instance;
      },
    };
  };

  return { call, model };
};

export default createSharedComposable(() =>
  useUQL("http://127.0.0.1:8000/uql/", ["api.note"])
);

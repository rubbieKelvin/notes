import { useAuthStore } from "@/stores/auth";
import sharedUQL from "../index";
import { UQLFunctionCallInput } from "../types";

export type UqlIntents =
  | "functions.hasFeature"
  | "models.api.note.findmany"
  | "models.api.note.update"
  | "models.api.note.find"

export type StaticUQLBody = UQLFunctionCallInput<UqlIntents>;

const uql = sharedUQL();

export const call = async <T = any>(
  input: UQLFunctionCallInput<UqlIntents>,
  auth: boolean,
  throwAuthError: boolean = false
): Promise<T | null> => {
  if (auth) {
    const authstore = useAuthStore();

    if (!authstore.isAuthenticated) {
      if (throwAuthError)
        throw new Error("Anonymous call on protected function");
      return null;
    }

    const headers = {
      ...(input?.meta?.headers || {}),
      ...authstore.authHeader,
    };
    input.meta = { ...input?.meta, headers };
  }
  const res = await uql.call(input, true);
  return res.data as T;
};

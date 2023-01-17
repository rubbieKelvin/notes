export type Pk = string | number;
export type UQLFieldType = boolean | Record<string, any> | null;
export type InputMeta = {
  headers?: Record<string, string> | null;
  initialFormdata?: FormData | null;
  retry?: {
    max: number; // -1 for infinite
    retriesIn?: number;
    onError?: (retriesIn: number | null) => void; // retriesIn: is the delay before the next retry in milliseconds
    onRetry?: () => void;
  };
};

export type UQLFunctionCallInput = {
  functionName: string;
  fields?: UQLFieldType;
  args?: Record<string, any> | null;
  meta?: InputMeta;
};

export type UQLError = {
  message: string;
  errorCode?: number | string | null;
  statusCode?: number | null;
  summary?: string | null;
};

export type UQLResponse = {
  data: any;
  error: UQLError | null;
  warning?: string | null;
  statusCode: number;
};

export type UQLModelManager<
  Model extends object,
  ModelInsert extends object,
  ModelUpdate extends object
> = {
  // find
  find: (findArgs: { pk: Pk; fields: UQLFieldType }) => Promise<Model | null>;

  // find many
  findMany: (findManyArgs: {
    where: object;
    limit?: number;
    offset?: number;
    fields?: UQLFieldType;
  }) => Promise<Model[] | null>;

  // insert
  insert: (insertArgs: {
    object: ModelInsert;
    fields: UQLFieldType;
  }) => Promise<Model | null>;

  // insert many
  insertMany?: (insertManyArgs: { objects: ModelInsert[] }) => Promise<Model[]>;

  // update
  update: (updateArgs: {
    updatedFields: ModelUpdate;
    pk: Pk;
    fields: UQLFieldType;
  }) => Promise<Model | null>;

  // update many
  updateMany?: (updateManyArgs: {
    objects: { updatedFields: ModelUpdate; pk: Pk }[];
  }) => Promise<Model>;

  // delete
  delete: (deleteArgs: {
    pk: Pk;
    fields: UQLFieldType;
  }) => Promise<Model | null>;

  // delete many
  deleteMany?: (deleteManyArgs: { pks: Pk[] }) => {};
};

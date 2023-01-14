export type Pk = string | number;

export type UQLCall = {
  intent: string;
  fields?: boolean | Record<string, any> | null;
  args?: Record<string, any> | null;
  headers?: Record<string, string> | null;
  formdata?: FormData | null;
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

export type UQLModelManager<Model, ModelInsert, ModelUpdate> = {
  __cache: Record<string, object>;

  // find
  find: (findArgs: {
    where: object;
    useAuth?: boolean;
  }) => Promise<Model | null>;

  // find many
  findMany: (findManyArgs: {
    where: object;
    limit?: number;
    offset?: number;
    useAuth?: boolean;
  }) => Promise<Model[]>;

  // insert
  insert: (insertArgs: {
    object: ModelInsert;
    useAuth?: boolean;
  }) => Promise<Model>;

  // insert many
  insertMany: (insertManyArgs: {
    objects: ModelInsert[];
    useAuth?: boolean;
  }) => Promise<Model[]>;

  // update
  update: (updateArgs: {
    partial: ModelUpdate;
    pk: Pk;
    useAuth?: boolean;
  }) => Promise<Model>;

  // update many
  updateMany: (updateManyArgs: {
    objects: { partial: ModelUpdate; pk: Pk }[];
    useAuth?: boolean;
  }) => Promise<Model>;

  // delete
  delete: (deleteArgs: { pk: Pk; useAuth?: boolean }) => {};

  // delete many
  deleteMany: (deleteManyArgs: { pks: Pk[]; useAuth?: boolean }) => {};
};

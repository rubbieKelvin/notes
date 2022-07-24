import * as models from "./types/models";
import * as types from "./types";
import { TOKEN_STORE_KEY } from "@/constants";

export const url = (path: string): URL => new URL(`http://localhost:8000/${path}`);

export const auth_header = (content_type?: string): Headers | null => {
  const token = localStorage.getItem(TOKEN_STORE_KEY);
  if (!token) return null;
  const header = new Headers();
  header.set("Authorization", `Token ${token}`);
  if (content_type) header.set("Content-Type", content_type);
  return header;
};

export const user_signup = async (
  email: string,
  password: string
): Promise<models.User | types.ResponseError> => {
  const response = await fetch(url("account/signup/"), {
    method: "post",
    body: JSON.stringify({ email, password }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  let data: types.ResponseError | models.SignupResponse = await response.json();
  if (response.status === 200) {
    data = data as models.SignupResponse;
    localStorage.setItem(TOKEN_STORE_KEY, data.token);
    return data.user;
  }
  return data as types.ResponseError;
};

export const user_logout = async (): Promise<void> => {
  const headers = auth_header();
  if (!headers) return;
  localStorage.removeItem(TOKEN_STORE_KEY);
  await fetch(url("account/logout/"), { headers, method: "post" });
};

export const user_login = async (
  email: string,
  password: string
): Promise<models.User | types.ResponseError> => {
  const response = await fetch(url("account/login/"), {
    method: "post",
    body: JSON.stringify({ email, password }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  let data: types.ResponseError | models.SignupResponse = await response.json();
  if (response.status === 200) {
    data = data as models.SignupResponse;
    localStorage.setItem(TOKEN_STORE_KEY, data.token);
    return data.user;
  }
  return data as types.ResponseError;
};

export const get_user = async (): Promise<models.User | null> => {
  const headers = auth_header("application/json");
  if (!headers) return null;

  const response = await fetch(url("account/me/"), {
    headers,
  });

  const data: models.User = await response.json();
  if (response.status === 200) return data;

  localStorage.removeItem(TOKEN_STORE_KEY);
  return null;
};

// export const get_my_notes = async (user: models.User): Promise<models.Note[]> => {
//   interface Response {
//     count: number;
//     next: string | null;
//     previous: string | null;
//     results: models.Note[];
//   }

//   const headers = auth_header("application/json");
//   if (!headers) return [];

//   let res = <models.Note[]>[];

//   const _ = async (url_: string | null) => {
//     const url_obj = url_ ? new URL(url_) : url('notes/')
    
//     url_obj.searchParams.set('query', JSON.stringify({
//       author: {
//         _eq: user.id
//       }
//     }))

//     const response = await fetch(url_obj, { headers });
//     if (response.status !== 200) return;

//     const data: Response = await response.json();
//     res = [...res, ...data.results];

//     if (data.next) _(data.next);
//   };

//   await _(null);
//   return res;
// };

export const create_note = async (
  name: string,
  is_private: boolean,
  slug: string
): Promise<models.Note | types.ResponseError | null> => {
  const headers = auth_header("application/json");
  if (!headers) return null;

  const response = await fetch(url("notes/create/"), {
    headers,
    body: JSON.stringify({
      name,
      private: is_private,
      slug,
    }),
  });

  const data: models.Note | types.ResponseError = await response.json();
  return data;
};

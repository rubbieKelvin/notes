import { auth_header } from "./index";
import { PaginatedFetch, QueryFetchOptions } from "./types";

export const fetchQuery = async ({
  headers,
  query,
  select,
  url,
}: QueryFetchOptions): Promise<PaginatedFetch> => {
  headers = headers || new Headers();
  headers.append("Content-Type", "application/json");

  const auth_h = auth_header();
  if (auth_h === null) throw new Error("Authentication Error");
  headers.set("Authorization", auth_h.get("Authorization") as string);

  if (query) url.searchParams.set("query", JSON.stringify(query));
  if (select) url.searchParams.set("select", JSON.stringify(select));

  const response = await fetch(url, { headers });
  if (response.status !== 200) throw new Error("Error fetching data");

  const data = await response.json();
  if (data?.__typename === "paginated_response" && !Array.isArray(data))
    return {
      prev: data?.links?.previous
        ? async () =>
            await fetchQuery({
              headers,
              query,
              select,
              url: new URL(data?.links?.previous),
            })
        : undefined,
      next: data?.links?.next
        ? async () =>
            await fetchQuery({
              headers,
              query,
              select,
              url: new URL(data?.links?.next),
            })
        : undefined,
      data: data?.results,
    };

  return { data };
};

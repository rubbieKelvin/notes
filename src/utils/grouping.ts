interface GroupMember<T> {
  type: "heading" | "item";
  title?: string;
  item?: T;
}

export const linearGrouping = <T>(
  items: T[],
  getKey: (item: T) => any
): GroupMember<T>[] => {
  const groups: Record<string, T[]> = {};
  items.forEach((item) => {
    const key = getKey(item);

    if (!groups[key]) groups[key] = [item];
    else groups[key].push(item);
  });

  const res: GroupMember<T>[] = [];

  Object.keys(groups).forEach((key) => {
    res.push({ type: "heading", title: key });
    res.push(
      ...groups[key].map((item): GroupMember<T> => ({ type: "item", item }))
    );
  });

  return res;
};

export const nodeItemName = (path: string) => path.split("/").slice(-1)[0];
export const nodeItemPath = (path: string) =>
  path.split("/").slice(0, -1).join("/");

export interface TreeItem<T> {
  fullPath: string;
  title: string;
  type: "folder" | "item";
  item?: T;
  items?: TreeItem<T>[];
}

export const filePathTree = <T>(
  items: T[],
  pathKey: (item: T) => string,
  path: string = ""
) => {
  const res: TreeItem<T>[] = [];
  const children = items.filter((i) => pathKey(i).startsWith(path));

  children.forEach((node) => {
    const nodepath = pathKey(node).slice(path.length);
    const fullPath = pathKey(node);

    // if the node path is an item, create item node
    if (nodepath.split("/").filter(Boolean).length === 1)
      res.push({
        fullPath,
        title: pathKey(node).split("/").slice(-1)[0],
        type: "item",
        item: node,
      });
    else {
      const title = nodepath.split("/").filter(Boolean)[0];
      const fullPath = `${path}${title}/`;

      if (
        !res.find(
          (node) => node.fullPath === fullPath && node.type === "folder"
        )
      ) {
        res.push({
          fullPath,
          title,
          type: "folder",
          items: filePathTree<T>(items, pathKey, fullPath),
        });
      }
    }
  });

  return res;
};

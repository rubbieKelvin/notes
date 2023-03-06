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

  Object.entries(groups).forEach(([key, value]) => {
    res.push({ type: "heading", title: key });
    res.push(...value.map((item): GroupMember<T> => ({ type: "item", item })));
  });

  return res;
};

export const filePathTree = () => {};

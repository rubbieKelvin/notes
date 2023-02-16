export const pickProperties = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const picked: any = {};
  for (const key of keys) {
    if (obj.hasOwnProperty(key)) {
      picked[key] = obj[key];
    }
  }
  return picked;
};

export const boolToString = (val: boolean): string => (val ? "Yes" : "No");

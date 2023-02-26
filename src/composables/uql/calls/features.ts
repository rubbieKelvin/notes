import { StaticUQLBody } from ".";

export const HAS_FEATURE: (key: string) => StaticUQLBody = (key) => ({
  functionName: "functions.hasFeature",
  args: {
    key,
  },
  fields: {
    is_active: true,
  },
});

import { LocalData } from "@/types";
import { inject, Ref } from "vue";

export const useLocalApi = () => {
  let storage_key = "opennotes.local";
  let localdata = inject("modelstore") as Ref<LocalData[]>;

  function save() {
    localStorage.setItem(storage_key, JSON.stringify(localdata.value));
  }

  function add(type: string, data: any) {
    localdata.value.push({
      data,
      date_added: new Date().toISOString(),
      __type: type,
    });
    save();
  }

  function filter(func: (data: any) => boolean) {
    localdata.value = localdata.value.filter((ld) => func(ld.data));
    save();
  }

  function find(type: string, func: (data: any) => boolean) {
    return localdata.value
      .filter((i) => i.__type === type)
      .find((ld) => func(ld.data));
  }

  return { add, filter, find };
};

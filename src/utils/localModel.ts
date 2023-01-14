import { ModelHandler } from "@/types";
import { Note } from "@/types/models";

export const model = <Model>(name: string): ModelHandler<Model> => ({
  __type: `models.local.${name}`,
  all() {
    const ds = localStorage.getItem(this.__type) ?? "[]";
    let data: Array<Model> = [];

    try {
      data = JSON.parse(ds);
    } catch {}
    return data;
  },
  find(func) {
    const all = this.all();
    return all.find(func) ?? null;
  },
  update(func, data) {
    const all = this.all();
    const instance = all.find(func);

    if (!instance) return;
    const i = all.findIndex(func);
    all[i] = { ...instance, ...data };
    localStorage.setItem(this.__type, JSON.stringify(all));
  },
  add(data) {
    const all = this.all();
    all.push(data);
    localStorage.setItem(this.__type, JSON.stringify(all));
  },
  delete(func) {
    const all = this.all().filter((i) => !func(i));
    localStorage.setItem(this.__type, JSON.stringify(all));
  },
});

export const localModels = {
  note: model<Note>("notes"),
};

import { defineStore } from "pinia";
import { watch } from "vue";

export interface PublicSignal {
  id: string;
  payload: Record<string, any>;
}

interface State {
  lastEvent: PublicSignal | null;
  events: PublicSignal[];
}

export const usePublicSignalStore = defineStore("publicSignal", {
  state: (): State => ({
    lastEvent: null,
    events: [],
  }),

  actions: {
    fire(e: PublicSignal) {
      this.lastEvent = e;
      this.events.push(e);
    },
    listen(eventID: string, func: (payload: Record<string, any>) => unknown) {
      watch(
        () => this.lastEvent,
        (val) => {
          if (this.lastEvent && val?.id === eventID)
            func(this.lastEvent?.payload);
        },
        { deep: true }
      );
    },
  },
});

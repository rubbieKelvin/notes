import sharedUQL from "@/composables/uql";
import useSharedTextEditor from "@/composables/useTextEditor";
import { TaggedFile } from "@/types";
import { defineStore } from "pinia";
import { useAuthStore } from "./auth";

export interface ImageUploadData {
  file: File;
  url: string | null;
  uploading: boolean;
  error: boolean;
}

interface State {
  uploads: Record<string, ImageUploadData>;
}

export const useUploadStore = defineStore("upload", {
  state: (): State => ({
    uploads: {},
  }),
  actions: {
    async uploadImages(images: TaggedFile[]) {
      const { editableNote } = useSharedTextEditor();
      const res = await Promise.all(
        images.map((image) => this.uploadImage(image, editableNote.value.id))
      );
      return res;
    },
    async uploadImage(image: TaggedFile, note: string): Promise<string | null> {
      const authstore = useAuthStore();
      const { call } = sharedUQL();

      const initialFormdata = new FormData();
      initialFormdata.append("image", image.file);

      this.uploads[image.id] = {
        file: image.file,
        url: null,
        uploading: true,
        error: false,
      };

      const resp = await call({
        functionName: "uploadImage",
        fields: true,
        args: {
          note,
        },
        meta: {
          initialFormdata,
          headers: authstore.authHeader,
        },
      });

      if (resp.error) {
        this.uploads[image.id].error = true;
        return null;
      }

      const url = resp.data.url as string;

      this.uploads[image.id].uploading = false;
      this.uploads[image.id].url = url;

      return url;
    },
  },
});

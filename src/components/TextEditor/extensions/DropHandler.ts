import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { NodeType } from "@tiptap/pm/model";
import { ImageExtensionAttributes } from "./ImageNode";
import { useUploadStore } from "@/stores/upload";
import { TaggedFile } from "@/types";
import { v4 as uuid4 } from "uuid";
import { createAlertDialog } from "@/modals/alertDialog";

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 5_000_000;

export const DropHandler = Extension.create({
  name: "dropHandler",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("dropHandler"),
        props: {
          handleDrop(view, event, slice, moved) {
            // Prevent default behavior (Prevent file from being opened)
            event.preventDefault();

            if (!view.editable) return;

            const fileslist: Array<File> = [];

            const doFileAppend = (file: File | null): void => {
              if (
                file &&
                ALLOWED_FILE_TYPES.includes(file.type) &&
                file.size <= MAX_FILE_SIZE
              )
                fileslist.push(file);
            };

            if (event.dataTransfer?.items) {
              const items = event.dataTransfer.items as unknown;
              // Use DataTransferItemList interface to access the file(s)
              [...(items as Array<DataTransferItem>)].forEach((item, i) => {
                // If dropped items aren't files, reject them
                if (item.kind === "file") {
                  const file = item.getAsFile();
                  doFileAppend(file);
                }
              });
            } else if (event.dataTransfer?.files) {
              const files = event.dataTransfer.files as unknown;

              // Use DataTransfer interface to access the file(s)
              [...(files as Array<File>)].forEach((file, i) => {
                doFileAppend(file);
              });
            }

            // count constraints
            if (fileslist.length < 1) {
              createAlertDialog({
                title: "Error",
                type: "error",
                subtitle: "Could note upload file",
              });
              return false;
            }

            const imageNode = view.state.schema.nodes?.imageNode as
              | NodeType
              | undefined;

            if (imageNode) {
              const uploadstore = useUploadStore();

              // one image only for now
              const taggedimages: TaggedFile[] = [
                { id: uuid4(), file: fileslist[0] },
              ];

              uploadstore.uploadImages(taggedimages);

              const node = imageNode.create(<ImageExtensionAttributes>{
                images: taggedimages.map((ti) => ({
                  uploadID: ti.id,
                  url: null,
                  alt: null,
                })),
              });

              const transaction = view.state.tr;
              transaction.replaceSelectionWith(node);

              view.dispatch(transaction);
              return true;
            }
          },
        },
      }),
    ];
  },
});

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { NodeType } from "@tiptap/pm/model";
import { ImageExtensionAttributes } from "./ImageNode";

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
            const fileslist: Array<File> = [];

            // Prevent default behavior (Prevent file from being opened)
            event.preventDefault();

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

            const imageNode = view.state.schema.nodes?.imageNode as
              | NodeType
              | undefined;

            if (imageNode) {
              const node = imageNode.create(<ImageExtensionAttributes>{
                images: [
                  {
                    url: "https://i.pinimg.com/736x/ca/84/d6/ca84d6365dbc9e67822d9f828a72716e.jpg",
                    alt: null,
                  },
                  {
                    url: "https://wallpaperaccess.com/full/3089644.jpg",
                    alt: "Girl",
                  },
                ],
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

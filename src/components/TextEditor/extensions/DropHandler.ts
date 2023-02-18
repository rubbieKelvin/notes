import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { NodeType } from "@tiptap/pm/model";
import { ImageExtensionAttributes } from "./ImageNode";
import { TaggedFile } from "@/types";
import { v4 as uuid4 } from "uuid";
import { createAlertDialog } from "@/modals/alertDialog";
import { useAuthStore } from "@/stores/auth";
import sharedUQL from "@/composables/uql";
import { usePublicSignalStore } from "@/stores/publicsignals";
import useSharedTextEditor from "@/composables/useTextEditor";

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 5_000_000;

const uploadImageToServer = async (
  image: TaggedFile
): Promise<string | null> => {
  const authstore = useAuthStore();
  const publicsignal = usePublicSignalStore();
  const { editableNote } = useSharedTextEditor();
  const signalID = `imageupload:${image.id}`;

  const { call } = sharedUQL();

  const initialFormdata = new FormData();
  initialFormdata.append("image", image.file);

  publicsignal.fire({
    id: signalID,
    payload: {
      uploading: true,
      error: false,
      url: null,
    },
  });

  const resp = await call({
    functionName: "uploadImage",
    fields: true,
    args: {
      note: editableNote.value.id,
    },
    meta: {
      initialFormdata,
      headers: authstore.authHeader,
    },
  });

  if (resp.error) {
    publicsignal.fire({
      id: signalID,
      payload: {
        uploading: false,
        error: true,
        url: null,
      },
    });

    return null;
  }

  const url = resp.data.url as string;

  publicsignal.fire({
    id: signalID,
    payload: {
      uploading: false,
      error: false,
      url,
    },
  });

  return url;
};

const handleEvent = (event: DragEvent | ClipboardEvent) => {
  const fileslist: Array<File> = [];
  const bearer =
    event instanceof DragEvent ? event.dataTransfer : event.clipboardData;

  const doFileAppend = (file: File | null): void => {
    if (
      file &&
      ALLOWED_FILE_TYPES.includes(file.type) &&
      file.size <= MAX_FILE_SIZE
    )
      fileslist.push(file);
  };

  if (bearer?.items) {
    const items = bearer.items as unknown;
    // Use DataTransferItemList interface to access the file(s)
    [...(items as Array<DataTransferItem>)].forEach((item, i) => {
      // If dropped items aren't files, reject them
      if (item.kind === "file") {
        const file = item.getAsFile();
        doFileAppend(file);
      }
    });
  } else if (bearer?.files) {
    const files = bearer.files as unknown;

    // Use DataTransfer interface to access the file(s)
    [...(files as Array<File>)].forEach((file, i) => {
      doFileAppend(file);
    });
  }

  return fileslist;
};

const insertNode = (view: EditorView, file: File) => {
  const imageNode = view.state.schema.nodes?.imageNode as NodeType | undefined;

  if (imageNode) {
    const image: TaggedFile = { id: uuid4(), file };

    const node = imageNode.create(<ImageExtensionAttributes>{
      image: {
        uploadID: image.id,
        url: null,
        alt: null,
      },
    });

    const transaction = view.state.tr;
    transaction.replaceSelectionWith(node);

    view.dispatch(transaction);
    uploadImageToServer(image);
    return true;
  }
  return false;
};

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

            const fileslist = handleEvent(event);

            // count constraints
            if (fileslist.length < 1) {
              createAlertDialog({
                title: "Error",
                type: "error",
                subtitle: "Could note upload file",
              });
              return false;
            }

            return insertNode(view, fileslist[0]);
          },

          handlePaste(view, event, slice) {
            // Prevent default behavior (Prevent file from being opened)
            event.preventDefault();

            if (!view.editable) return;

            const fileslist = handleEvent(event);

            // count constraints
            if (fileslist.length < 1) {
              return false;
            }

            return insertNode(view, fileslist[0]);
          },
        },
      }),
    ];
  },
});

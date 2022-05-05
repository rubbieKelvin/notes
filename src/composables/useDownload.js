import { FIXED_FOLDERS } from "@/constants/note";
import { Editor } from "@tiptap/vue-3";

export default () => {
  /**
   * @param {Object} noteObject
   */
  const getJSONDownload = (noteObject) => {
    //Setting sensitive information to null
    noteObject.id = null;
    noteObject.ld = null;
    noteObject.last_edited = null;
    noteObject.last_backup = null;
    noteObject.folder = FIXED_FOLDERS.CLASSIC_NOTE;

    const blob = new Blob([JSON.stringify(noteObject, null, 2)], {
      type: "text/json",
    });
    const download = `${noteObject.name.toLowerCase()}.json`;
    const href = window.URL.createObjectURL(blob);

    return {
      download,
      href,
      dataset: {
        downloadurl: ["text/json", download, href].join(":"),
      },
    };
  };
  return { getJSONDownload };
};

import { FIXED_FOLDERS } from "@/constants/note";
import { Editor } from "@tiptap/vue-3";

export default () => {
  /**
   * @param {Object} noteObject
   */
  const getJSONDownload = (noteObject) => {
    //Setting sensitive information to null
    var noteObjectDuplicate = { ...noteObject }
    noteObjectDuplicate.id = null;
    noteObjectDuplicate.ld = null;
    noteObjectDuplicate.last_edited = null;
    noteObjectDuplicate.last_backup = null;
    noteObjectDuplicate.folder = FIXED_FOLDERS.CLASSIC_NOTE;

    const blob = new Blob([JSON.stringify(noteObjectDuplicate, null, 2)], {
      type: "text/json",
    });
    const download = `${noteObjectDuplicate.name.toLowerCase()}.json`;
    const href = window.URL.createObjectURL(blob);

    return {
      download,
      href,
      dataset: {
        downloadurl: ["text/json", download, href].join(":"),
      },
    };
  };

  const readJSONFile = async (file) => {
    //First get the webapp to open the file manager
    //then lets wait till then first
    if (file.type === 'application/json') {
      try {
        const value = await file.text()
        return value
      } catch(e) {
        console.error(e)
        return null
      }
    }

    return null
  };
  return { getJSONDownload, readJSONFile };
};

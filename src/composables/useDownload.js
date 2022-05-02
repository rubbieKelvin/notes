import { Editor } from "@tiptap/vue-3";

export default () => {
  /**
   * @param {Object} noteObject
   */
  const getJSONDownload = (noteObject) => {
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

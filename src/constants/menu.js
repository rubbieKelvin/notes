const _defineTippyMenu = ({ name, callback }) => ({
  name,
  callback,
});

export const TIPPY_MENU = [
  _defineTippyMenu({
    name: "Image",
    callback(editor) {
      editor.commands.addImage();
    },
  }),
];

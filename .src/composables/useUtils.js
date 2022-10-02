export default () => ({
  isValidNoteObject: (obj) => {
    return (
      obj !== null &&
      typeof obj?.name === "string" &&
      obj?.name?.length > 0 &&
      obj?._type === "note" &&
      obj?.body?.type === "doc" &&
      Array.isArray(obj?.body?.content)
    );
  },
});

import { useLocalApi } from ".";

export const useNotesManager = () => {
  function createNote() {
    // create note over api or local
    // local
    const localapi = useLocalApi();
    localapi.add("models.note", {});
  }

  return {
    createNote,
  };
};

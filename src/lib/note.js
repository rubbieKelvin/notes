import { v4 as uuid4 } from 'uuid'
// templates
import note_template from "@/templates/note.json";
import text_template from "@/templates/text.json";
import author_template from "@/templates/author.json";
import image_template from "@/templates/image.json";

export const Note = (_note) => {
    const _wrapper = {
      __type__: "Note",
      value: { ...note_template, ...(_note || {}) },
      update,
      addText,
      updateAuthor,
      addImage
    };
  
    // add some updates
    updateAuthor();
  
    function update(options) {
      _wrapper.value = { ..._wrapper.value, ...options };
    }
  
    function addText(options) {
      _wrapper.value.content?.push({
        ...text_template,
        ...options,
        id: uuid4(),
      });
    }

    function addImage(options) {
        _wrapper.value.content?.push({
            ...image_template,
            ...options,
            id: uuid4(),
        })
    }
  
    function updateAuthor(author) {
      author = author || {};
      _wrapper.value.author = {
        ...author_template,
        ...author,
      };
    }
  
    return _wrapper;
  };
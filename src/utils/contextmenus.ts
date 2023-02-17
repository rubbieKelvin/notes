import { noteRoute } from "@/composables/useNavigation";
import { useModalStore } from "@/stores/modals";
import { useNotesStore } from "@/stores/notes";
import { MenuItem } from "@/types";
import { Note } from "@/types/models";
import { useRouter } from "vue-router";

export const noteContextMenu = (
  note: Note,
  {
    showOpen = false,
    useRouterToOpenNote = true,
    onNoteEdited = (notes: Note[]) => {},
  }
): MenuItem[] => {
  const router = useRouter();
  const notestore = useNotesStore();
  const modalstore = useModalStore();

  return [
    {
      id: Symbol(),
      title: "Open",
      hidden: !showOpen || note.is_trashed,
      icon: "BookOpenIcon",
      action: () => {
        if (useRouterToOpenNote) router.push(noteRoute(note));
        else notestore.openedNote = note;
      },
    },
    {
      id: Symbol(),
      title: "Details",
      icon: "InformationCircleIcon",
      hidden: note.is_trashed,
      keybinding: ["ctrl", "alt", "i"],
      action: () => {
        modalstore.modalstates.noteDetails = true;
      },
    },
    {
      id: Symbol(),
      title: "Move to archive",
      icon: "ArchiveBoxIcon",
      hidden: note.is_archived || note.is_trashed,
      action: async () => {
        const notes = await notestore.moveNotesToArchive([note.id]);
        if (notes) {
          onNoteEdited(notes);
        }
      },
    },
    {
      id: Symbol(),
      title: "Unarchive",
      icon: "ArchiveBoxXMarkIcon",
      hidden: !note.is_archived || note.is_trashed,
      action: async () => {
        const notes = await notestore.moveNotesToArchive([note.id], false);
        if (notes) {
          onNoteEdited(notes);
        }
      },
    },
    {
      id: Symbol(),
      title: "Share to",
      icon: "ShareIcon",
      hidden: note.is_trashed || true,
    },
    {
      id: Symbol(),
      title: "Make public",
      icon: "UserGroupIcon",
      hidden: note.is_trashed || note.is_public,
      action: async () => {
        const notes = await notestore.setNotesPublic([note.id], true);
        // move to details to get link
        modalstore.modalstates.noteDetails = true;
        if (notes) onNoteEdited(notes);
      },
    },
    {
      id: Symbol(),
      title: "Remove public access",
      hidden: note.is_trashed || !note.is_public,
      action: async () => {
        const notes = await notestore.setNotesPublic([note.id], false);
        if (notes) onNoteEdited(notes);
      },
    },
    { id: Symbol(), title: "Share", hidden: true },
    { id: Symbol(), title: "Export", hidden: true },
    {
      id: Symbol(),
      title: note.is_trashed ? "Permanetly delete" : "Move to trash",
      icon: "TrashIcon",
      action: async () => {
        if (await notestore.deleteNotes([note.id], note.is_trashed)) {
          if (note.id === notestore.openedNote?.id) {
            notestore.openedNote = null;
          }
        }
      },
    },
    {
      id: Symbol(),
      title: "Restore",
      hidden: !note.is_trashed,
      action: async () => {
        await notestore.restoreNotes([note.id]);
      },
    },
  ];
};

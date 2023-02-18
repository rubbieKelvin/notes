import { noteRoute } from "@/composables/useNavigation";
import { createNewNoteModal } from "@/modals/newNoteModal";
import { useModalStore } from "@/stores/modals";
import { useNotesStore } from "@/stores/notes";
import { MenuItem } from "@/types";
import { Note } from "@/types/models";
import { ComputedRef, Ref } from "vue";
import { useRoute, useRouter } from "vue-router";

export interface NoteContextMenuOptions {
  showMenuItemOpen?: boolean;
  showMenuItemDetails?: boolean;
  useRouterToOpenNote?: boolean;
  showMenuItemArchive?: boolean;
  showMenuItemShareTo?: boolean;
  showMenuItemSharePublic?: boolean;
  onNoteEdited?: (notes: Note[]) => any;
}

export interface ManyNotesContextMenuOptions {
  selecting: Ref<boolean>;
  selectedNotes: Ref<string[]>;
  notes: ComputedRef<Note[]>;
}

export const noteContextMenu = (
  note: Note,
  {
    showMenuItemOpen = false,
    showMenuItemDetails = true,
    showMenuItemArchive = true,
    useRouterToOpenNote = true,
    showMenuItemShareTo = true,
    showMenuItemSharePublic = true,
    onNoteEdited = () => null,
  }: NoteContextMenuOptions
): MenuItem[] => {
  const router = useRouter();
  const notestore = useNotesStore();
  const modalstore = useModalStore();

  return [
    {
      id: Symbol(),
      title: "Open",
      hidden: !showMenuItemOpen || note.is_trashed,
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
      hidden:
        !showMenuItemDetails ||
        note.is_trashed ||
        note.id !== notestore.openedNote?.id,
      keybinding: ["ctrl", "alt", "i"],
      action: () => {
        modalstore.modalstates.noteDetails = true;
      },
    },
    {
      id: Symbol(),
      title: "Move to archive",
      icon: "ArchiveBoxIcon",
      hidden: !showMenuItemArchive || note.is_archived || note.is_trashed,
      action: async () => {
        const notes = await notestore.setManyNoteAttrs({
          pks: [note.id],
          attrs: { is_archived: true },
        });
        if (notes) {
          onNoteEdited(notes);
        }
      },
    },
    {
      id: Symbol(),
      title: "Unarchive",
      icon: "ArchiveBoxXMarkIcon",
      hidden: !showMenuItemArchive || !note.is_archived || note.is_trashed,
      action: async () => {
        const notes = await notestore.setManyNoteAttrs({
          pks: [note.id],
          attrs: { is_archived: false },
        });
        if (notes) {
          onNoteEdited(notes);
        }
      },
    },
    {
      id: Symbol(),
      title: "Share to",
      icon: "ShareIcon",
      hidden: !showMenuItemShareTo || note.is_trashed || true,
    },
    {
      id: Symbol(),
      title: "Make public",
      icon: "UserGroupIcon",
      hidden: !showMenuItemSharePublic || note.is_trashed || note.is_public,
      action: async () => {
        const notes = await notestore.setManyNoteAttrs({
          pks: [note.id],
          attrs: { is_public: true },
        });
        // move to details to get link
        modalstore.modalstates.noteDetails = true;
        if (notes) onNoteEdited(notes);
      },
    },
    {
      id: Symbol(),
      title: "Remove public access",
      hidden: !showMenuItemSharePublic || note.is_trashed || !note.is_public,
      action: async () => {
        const notes = await notestore.setManyNoteAttrs({
          pks: [note.id],
          attrs: { is_public: false },
        });
        if (notes) onNoteEdited(notes);
      },
    },
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
        await notestore.setManyNoteAttrs({
          pks: [note.id],
          attrs: { is_trashed: false },
        });
      },
    },
  ];
};

export const manyNotesContextMenu = (
  options: ManyNotesContextMenuOptions
): MenuItem[] => {
  const route = useRoute();
  const router = useRouter();
  const notestore = useNotesStore();

  return options.selecting.value
    ? [
        { id: Symbol(), title: "Selection", type: "HEADER" },
        {
          id: Symbol(),
          title: route.name === "Trash" ? "Delete Selection" : "Move to trash",
          icon: "TrashIcon",
          action: async () => {
            const res = await notestore.deleteNotes(
              options.selectedNotes.value,
              route.name === "Trash"
            );
            if (res) {
              options.selectedNotes.value = [];
              options.selecting.value = false;
            }
          },
        },
        {
          id: Symbol(),
          title: "Restore Selection",
          hidden: route.name !== "Trash",
          action: async () => {
            const res = await notestore.setManyNoteAttrs({
              pks: options.selectedNotes.value,
              attrs: { is_trashed: false },
            });

            if (res) {
              options.selectedNotes.value = [];
              options.selecting.value = false;
            }
          },
        },

        {
          id: Symbol(),
          title: "Archive Selection",
          icon: "ArchiveBoxIcon",
          hidden: ["Trash", "ArchivedNote", "Archive"].includes(
            route.name as string
          ),
          action: async () => {
            const res = await notestore.setManyNoteAttrs({
              pks: options.selectedNotes.value,
              attrs: { is_archived: true },
            });
            if (res) {
              options.selectedNotes.value = [];
              options.selecting.value = false;
            }
          },
        },

        {
          id: Symbol(),
          title: "Unarchive Selection",
          icon: "ArchiveBoxIcon",
          hidden:
            !["ArchivedNote", "Archive"].includes(route.name as string) ||
            (route.name as string) === "Trash",
          action: async () => {
            const res = await notestore.setManyNoteAttrs({
              pks: options.selectedNotes.value,
              attrs: { is_archived: false },
            });
            if (res) {
              options.selectedNotes.value = [];
              options.selecting.value = false;
            }
          },
        },

        {
          id: Symbol(),
          title: "Reverse Selection",
          icon: "ArrowPathIcon",
          action: () => {
            options.selectedNotes.value = options.notes.value
              .map((note) => note.id)
              .filter((nid) => !options.selectedNotes.value.includes(nid));
          },
        },
        {
          id: Symbol(),
          title: "Close Selection",
          icon: "XMarkIcon",
          action: () => {
            options.selectedNotes.value = [];
            options.selecting.value = false;
          },
        },
      ]
    : [
        {
          id: Symbol(),
          title: "Create note",
          icon: "PlusIcon",
          keybinding: ["ctrl", "alt", "n"],
          action: () => createNewNoteModal(router),
          hidden: !["Note", "Notes"].includes(route.name as string),
        },
        {
          id: Symbol(),
          title: "Import",
          icon: "CloudArrowDownIcon",
          hidden: true,
        },
        {
          id: Symbol(),
          title: "Create folder",
          icon: "FolderPlusIcon",
          disabled: true,
          hidden: true,
          subtitle: "Signin to use feature",
        },
        {
          id: Symbol(),
          title: "Sort by",
          icon: "AdjustmentsHorizontalIcon",
          children: [
            { id: Symbol(), title: "No sort" },
            { id: Symbol(), title: "Title" },
            { id: Symbol(), title: "Updated" },
            { id: Symbol(), title: "Created" },
            { id: Symbol(), type: "SEPARATOR" },
            {
              id: Symbol(),
              title: "Ascending",
              type: "CHECKBOX",
              value: notestore.settings.sort.ascending,
              action: () => {
                notestore.settings.sort.ascending =
                  !notestore.settings.sort.ascending;
              },
            },
          ],
        },
        { id: Symbol(), type: "SEPARATOR" },
        {
          id: Symbol(),
          title: "Select",
          icon: "ListBulletIcon",
          action: () => {
            options.selecting.value = true;
          },
        },
        {
          id: Symbol(),
          title: "Select All",
          action: () => {
            options.selecting.value = true;
            options.selectedNotes.value = options.notes.value.map((n) => n.id);
          },
        },
      ];
};

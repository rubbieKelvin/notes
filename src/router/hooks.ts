import { useAuthStore } from "@/stores/auth";
import { useNotesStore } from "@/stores/notes";

export const setupUserData = async () => {
  const authstore = useAuthStore();
  const notestore = useNotesStore();

  if (authstore.isAuthenticated) {
    console.log(`Logged in as ${authstore.user?.username}`);
    await notestore.fetchNotes();
    // await tagstore.loadTags();
  }
};

export const afterLogout = async () => {
  const notestore = useNotesStore();
  localStorage.clear();
  notestore.notes = [];
};

<template>
  <div class="min-h-[100vh] bg-gray-50 w-full flex items-center justify-center">
    <div class="app-body">
      <!-- side bar -->
      <div class="side">
        <div class="text-white">
          <h1 class="text-xl">Notes</h1>
          <p class="text-xs">stuffsbyrubbie</p>
        </div>

        <div class="flex-grow" />

        <div>
          <SideMenuButton label="Create New" @click="newNoteModal = true">
            <svg
              width="19"
              height="18"
              viewBox="0 0 19 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M9.50001 2.7C9.73871 2.7 9.96763 2.79482 10.1364 2.9636C10.3052 3.13238 10.4 3.3613 10.4 3.6V8.1H14.9C15.1387 8.1 15.3676 8.19482 15.5364 8.3636C15.7052 8.53238 15.8 8.7613 15.8 9C15.8 9.23869 15.7052 9.46761 15.5364 9.63639C15.3676 9.80518 15.1387 9.9 14.9 9.9H10.4V14.4C10.4 14.6387 10.3052 14.8676 10.1364 15.0364C9.96763 15.2052 9.73871 15.3 9.50001 15.3C9.26132 15.3 9.0324 15.2052 8.86362 15.0364C8.69483 14.8676 8.60001 14.6387 8.60001 14.4V9.9H4.10001C3.86132 9.9 3.6324 9.80518 3.46362 9.63639C3.29483 9.46761 3.20001 9.23869 3.20001 9C3.20001 8.7613 3.29483 8.53238 3.46362 8.3636C3.6324 8.19482 3.86132 8.1 4.10001 8.1H8.60001V3.6C8.60001 3.3613 8.69483 3.13238 8.86362 2.9636C9.0324 2.79482 9.26132 2.7 9.50001 2.7Z"
                fill="black"
              />
            </svg>
          </SideMenuButton>
        </div>
      </div>

      <div class="bg-white flex-grow flex flex-col relative">
        <!-- top bar -->
        <div class="flex py-2 px-3 gap-5">
          <div class="flex-grow flex items-center gap-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.75 15.75L11.25 11.25L15.75 15.75ZM12.75 7.5C12.75 8.18944 12.6142 8.87213 12.3504 9.50909C12.0865 10.146 11.6998 10.7248 11.2123 11.2123C10.7248 11.6998 10.146 12.0865 9.50909 12.3504C8.87213 12.6142 8.18944 12.75 7.5 12.75C6.81056 12.75 6.12787 12.6142 5.49091 12.3504C4.85395 12.0865 4.2752 11.6998 3.78769 11.2123C3.30018 10.7248 2.91347 10.146 2.64963 9.50909C2.3858 8.87213 2.25 8.18944 2.25 7.5C2.25 6.10761 2.80312 4.77226 3.78769 3.78769C4.77226 2.80312 6.10761 2.25 7.5 2.25C8.89239 2.25 10.2277 2.80312 11.2123 3.78769C12.1969 4.77226 12.75 6.10761 12.75 7.5Z"
                stroke="#838383"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search Notes..."
              class="flex-grow outline-none border-0"
            />
          </div>

          <IconButton class="w-[34px] h-[34px] text-gray-400">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M2.7 2.7C2.7 2.46131 2.79482 2.23239 2.9636 2.06361C3.13238 1.89482 3.3613 1.8 3.6 1.8H14.4C14.6387 1.8 14.8676 1.89482 15.0364 2.06361C15.2052 2.23239 15.3 2.46131 15.3 2.7V5.4C15.2999 5.63868 15.2051 5.86756 15.0363 6.0363L10.8 10.2726V13.5C10.7999 13.7387 10.7051 13.9676 10.5363 14.1363L8.7363 15.9363C8.61043 16.0621 8.45008 16.1478 8.27553 16.1825C8.10097 16.2172 7.92004 16.1994 7.75561 16.1313C7.59118 16.0632 7.45063 15.9479 7.35174 15.7999C7.25284 15.6519 7.20004 15.478 7.2 15.3V10.2726L2.9637 6.0363C2.7949 5.86756 2.70005 5.63868 2.7 5.4V2.7Z"
                fill="currentColor"
              />
            </svg>
          </IconButton>
        </div>

        <!-- list -->
        <div class="flex-grow h-0 overflow-y-scroll custom-scrollbar">
          <NoteItemDelegate
            v-for="note in notes"
            :key="note.ld"
            class="even:bg-slate-50"
            :data="note"
          />
        </div>

        <!-- fab -->
        <IconButton
          @click="newNoteModal = true"
          class="
            hover:bg-primary-basic
            md:hidden
            rounded-full
            hover:shadow-lg
            absolute
            right-8
            bottom-8
            w-12
            h-12
            bg-primary-basic
            text-white
          "
        >
          <svg
            width="19"
            height="18"
            viewBox="0 0 19 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M9.50001 2.7C9.73871 2.7 9.96763 2.79482 10.1364 2.9636C10.3052 3.13238 10.4 3.3613 10.4 3.6V8.1H14.9C15.1387 8.1 15.3676 8.19482 15.5364 8.3636C15.7052 8.53238 15.8 8.7613 15.8 9C15.8 9.23869 15.7052 9.46761 15.5364 9.63639C15.3676 9.80518 15.1387 9.9 14.9 9.9H10.4V14.4C10.4 14.6387 10.3052 14.8676 10.1364 15.0364C9.96763 15.2052 9.73871 15.3 9.50001 15.3C9.26132 15.3 9.0324 15.2052 8.86362 15.0364C8.69483 14.8676 8.60001 14.6387 8.60001 14.4V9.9H4.10001C3.86132 9.9 3.6324 9.80518 3.46362 9.63639C3.29483 9.46761 3.20001 9.23869 3.20001 9C3.20001 8.7613 3.29483 8.53238 3.46362 8.3636C3.6324 8.19482 3.86132 8.1 4.10001 8.1H8.60001V3.6C8.60001 3.3613 8.69483 3.13238 8.86362 2.9636C9.0324 2.79482 9.26132 2.7 9.50001 2.7Z"
              fill="currentColor"
            />
          </svg>
        </IconButton>
      </div>
    </div>

    <!-- modal -->
    <Modal v-model="newNoteModal" dim closeOnClickOutside closeOnEsc>
      <div class="bg-white rounded-md w-[300px] p-3 flex flex-col gap-6">
        <div>
          <p>New Note</p>
        </div>

        <div class="flex flex-col gap-4">
          <input
            ref="modalTitleInput"
            v-model="newNoteForm.title"
            class="input-text"
            type="text"
            placeholder="Title"
            @keypress.enter="add_note"
          />
          <button
            @click="add_note"
            class="
              bg-primary-basic
              px-4
              py-2
              rounded-md
              text-white
              hover:bg-primary-vibrant
            "
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script>
import SideMenuButton from "@/components/SideMenuButton.vue";
import IconButton from "@/components/IconButton.vue";
import NoteItemDelegate from "@/components/NoteItemDelegate.vue";
import useNote from "@/composables/useNotes";
import Modal from "@/components/Modal.vue";
import { ref } from "@vue/reactivity";
import { watch } from "@vue/runtime-core";

export default {
  components: { SideMenuButton, IconButton, NoteItemDelegate, Modal },
  setup() {
    const { notes, addNote } = useNote()

    const newNoteModal = ref(false);
    const modalTitleInput = ref(null);
    const newNoteForm = ref({
      title: "",
    });

    watch(newNoteModal, (oldValue, newValue) => {
      if (oldValue) {
        window.requestAnimationFrame(() => modalTitleInput.value.focus());
      }
    });

    const add_note = () => {
      addNote(newNoteForm.value.title)

      newNoteForm.value.title = "";
      newNoteModal.value = false;
    };

    return { add_note, notes, newNoteModal, newNoteForm, modalTitleInput };
  },
};
</script>

<style scoped>
.app-body {
  @apply h-screen w-full overflow-clip flex shadow-lg;
}

.side {
  display: none;
}

@screen md {
  .app-body {
    @apply h-[400px] w-[700px] rounded-md;
  }

  .side {
    @apply w-[35%] px-6 py-4 bg-primary-basic flex flex-col;
  }
}
</style>

<template>
  <div
    class="min-w-[300px] w-[12%] h-full border-r-stroke border-r px-5 py-6 bg-[#F8F8F8]"
  >
    <ul class="flex gap-6 flex-col">
      <li
        v-for="menu in menus"
        :key="menu.icon"
        class="flex gap-2 items-center"
      >
        <router-link
          :to="menu.to"
          class="flex gap-2 flex-grow hover:bg-hover active:bg-gray-300 p-2 rounded-md"
        >
          <svg
            v-if="menu.icon == 'note'"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.0968 13.5195H7.08014"
              stroke="#333333"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M13.0968 10.0307H7.08014"
              stroke="#333333"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M9.37609 6.55009H7.08026"
              stroke="#333333"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M13.2572 2.2915C13.2572 2.2915 6.85965 2.29484 6.84965 2.29484C4.54965 2.309 3.12549 3.82234 3.12549 6.13067V13.794C3.12549 16.114 4.56049 17.6332 6.88049 17.6332C6.88049 17.6332 13.2772 17.6307 13.288 17.6307C15.588 17.6165 17.013 16.1023 17.013 13.794V6.13067C17.013 3.81067 15.5772 2.2915 13.2572 2.2915Z"
              stroke="#333333"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg
            v-else-if="menu.icon === 'star'"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M10.9202 3.48083L12.4431 6.52312C12.5923 6.82179 12.8804 7.02888 13.2145 7.07681L16.6211 7.56717C17.4628 7.68869 17.7977 8.70878 17.1886 9.29327L14.7252 11.6604C14.4831 11.8931 14.3729 12.2277 14.4301 12.5564L15.0115 15.8982C15.1547 16.7249 14.2748 17.3556 13.5225 16.9645L10.4777 15.3856C10.1792 15.2307 9.82168 15.2307 9.52232 15.3856L6.4775 16.9645C5.72519 17.3556 4.84533 16.7249 4.98937 15.8982L5.56987 12.5564C5.62714 12.2277 5.51694 11.8931 5.27485 11.6604L2.8114 9.29327C2.20226 8.70878 2.5372 7.68869 3.37889 7.56717L6.78554 7.07681C7.11961 7.02888 7.40856 6.82179 7.55781 6.52312L9.07979 3.48083C9.45638 2.7286 10.5436 2.7286 10.9202 3.48083Z"
              stroke="#130F26"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg
            v-else-if="menu.icon === 'archived'"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M17.8491 13.1101C17.8491 16.0917 16.0916 17.8492 13.1099 17.8492H6.62494C3.63577 17.8492 1.87494 16.0917 1.87494 13.1101V6.61008C1.87494 3.63258 2.96994 1.87508 5.95244 1.87508H7.61911C8.21744 1.87591 8.78077 2.15674 9.13911 2.63591L9.89994 3.64758C10.2599 4.12591 10.8233 4.40758 11.4216 4.40841H13.7799C16.7691 4.40841 17.8724 5.93008 17.8724 8.97258L17.8491 13.1101Z"
              stroke="#130F26"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M6.23419 12.0525H13.5134"
              stroke="#130F26"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg
            v-if="menu.icon === 'trash'"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.1041 7.89017C16.1041 7.89017 15.6516 13.5027 15.3891 15.8668C15.2641 16.996 14.5666 17.6577 13.4241 17.6785C11.2499 17.7177 9.07326 17.7202 6.89993 17.6743C5.80076 17.6518 5.11493 16.9818 4.99243 15.8727C4.72826 13.4877 4.27826 7.89017 4.27826 7.89017"
              stroke="#130F26"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M17.2569 5.19975H3.12518"
              stroke="#130F26"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M14.5339 5.19975C13.8797 5.19975 13.3164 4.73725 13.188 4.09642L12.9855 3.08308C12.8605 2.61558 12.4372 2.29225 11.9547 2.29225H8.42719C7.94469 2.29225 7.52136 2.61558 7.39636 3.08308L7.19386 4.09642C7.06552 4.73725 6.50219 5.19975 5.84802 5.19975"
              stroke="#130F26"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <!-- label -->
          <p class="select-none">
            {{ menu.label }}
            <span v-if="menu.count" class="text-slate-400 text-sm">{{
              menu.count
            }}</span>
          </p>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
  setup() {
    const menus = ref([
      { icon: "note", label: "All Notes", to: "/notes" },
      { icon: "star", count: 4, label: "Starred", to: "/starred" },
      { icon: "archived", count: 12, label: "Archived", to: "/archive" },
      { icon: "trash", count: 1, label: "Trash", to: "/trash" },
    ]);

    return { menus };
  },
});
</script>

<template>
  <div class="">
    <!-- heading -->
    <div class="p-5 flex flex-col gap-6 h-[8%]">
      <h1 class="font-medium text-2xl">All Notes</h1>
      <div>
        <router-link
          :to="{ name: 'NewNote' }"
          class="py-1 px-2 border border-stroke rounded-md"
        >
          New note
        </router-link>
      </div>
    </div>

    <!-- list -->
    <div class="flex flex-col flex-grow overflow-y-scroll h-[92%]">
      <!-- item -->
      <div
        class="flex px-5 py-3 select-none hover:bg-hover"
        v-for="i in 100"
        :key="i"
      >
        <router-link class="flex-grow" to="/notes/190">
          <h3 class="text-lg">This is my article</h3>
          <p class="text-gray-700">Maybe a sub</p>
        </router-link>
        <div class="flex flex-col">
          <div class="flex justify-end flex-grow">
            <button>
              <svg
                width="18"
                height="18"
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
            </button>
          </div>
          <p class="text-gray-500 text-sm">2 days ago</p>
        </div>
      </div>
    </div>
  </div>
</template>

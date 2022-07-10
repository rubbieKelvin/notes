<template>
  <div class="userwidget">
    <template v-if="user">
      <div class="initials">A</div>
      <div class="info">
        <h1>Localhost</h1>
        <p>Scratchpad</p>
      </div>
    </template>
    <template v-else>
      <div class="w-full flex flex-col gap-3">
        <h1 class="text-lg font-medium">Notes Account</h1>
        <p class="text-gray-600">signin to use notes</p>
        <div class="flex gap-2">
          <button class="rounded py-3 bg-primary-basic flex-grow text-white hover:bg-primary-vibrant">Signup</button>
          <button class="rounded py-3 bg-primary-basic text-primary-vibrant bg-opacity-10 flex-grow hover:bg-opacity-25">Login</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { onMounted, Ref, ref } from '@vue/runtime-core'
import { User } from '@/packages/api/types/models'
import useAccountStore from '@/store/useAccountStore'

export default {
  setup(){
    const account = useAccountStore()
    const user: Ref<User|null> = ref(null)

    onMounted(() => {
      account.user.then(u => user.value=u)
    })

    return {user}
  }
}
</script>

<style lang="scss" scoped>
.userwidget {
  @apply border border-wall bg-white rounded-md p-3;
  @apply flex items-center justify-center gap-2 select-none cursor-default;

  .initials {
    @apply bg-primary-basic rounded-xl h-9 w-9 text-white flex items-center justify-center;
  }

  .info {
    flex-grow: 1;
    
      h1{
          @apply font-medium;
      }
      p{
          @apply text-sm text-gray-800;
      }
  }
}
</style>

<template>
  <div tabindex="1" @click="$router.push(`/${slug}`)" class="flex px-3 flex-col gap-0 border-b group select-none border-gray-300 py-3 hover:bg-blue-500 hover:text-white hover:rounded-md">
    <h2 class="font-medium">Title goes here</h2>
    <div class="flex gap-2 text-sm">
      <p class="font-medium">date</p>
      <p class="text-gray-500 group-hover:text-white">Description</p>
    </div>
  </div>
</template>

<script>
export default {
    data: () => ({
        slug: 'Hello' + Math.random()
    })
}
</script>
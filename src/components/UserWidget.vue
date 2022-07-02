<template>
  <div class="userwidget">
    <div class="initials">A</div>
    <div class="info">
      <h1>Localhost</h1>
      <p>Scratchpad</p>
    </div>
  </div>
</template>

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

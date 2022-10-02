<template>
  <div class="ww">
      <div class="initials">L</div>
      <div class="details">
          <h1>Local</h1>
          <p>Workspace</p>
      </div>
  </div>
</template>

<script>
export default {

}
</script>

<style lang="scss" scoped>
.ww{
    @apply border border-gray-200 rounded-md p-2;
    @apply flex gap-3 items-center bg-white;

    .initials {
        @apply w-12 h-12 text-white flex items-center justify-center font-bold bg-primary-basic rounded-md;
    }

    .details{
        p{
            @apply font-semibold;
            @apply text-sm text-gray-500;
        }
    }
}
</style>
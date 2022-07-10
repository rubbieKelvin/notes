<template>
  <div class="h-screen flex items-center justify-center">
    <div
      class="w-full max-w-[26em] px-4 py-8 border border-gray-200 rounded-md"
    >
      <div head>
        <h1>Sign up</h1>
        <p>to use Notes.</p>
      </div>

      <div form>
        <div class="input-field">
          <label>Email</label>
          <input type="email" v-model="form.email"/>
        </div>

        <div class="input-field">
          <label>Password</label>
          <input type="password" v-model="form.password"/>
        </div>

        <div class="my-6">
          <p class="text-sm">
            Already have an account?
            <router-link class="cursor-pointer text-blue-600" to="/login"
              >Login</router-link
            >
          </p>
        </div>
        <div class="flex justify-end">
          <!-- <button class="px-3 py-2 bg-primary-basic hover:bg-primary-vibrant text-white rounded">Create account</button> -->
          <ProcessButton
            class="px-3 py-2 flex gap-2 bg-primary-basic hover:bg-primary-vibrant text-white rounded"
            :action="signup"
            >Create account</ProcessButton
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
div[head] {
  @apply flex flex-col items-center text-gray-700 mb-8;

  > h1 {
    @apply font-medium text-xl;
  }

  > p {
    @apply text-sm;
  }
}

div[form] {
  .input-field {
    @apply flex flex-col gap-1 mb-6;

    > label {
      @apply text-sm text-gray-700;
    }

    > input {
      @apply h-10 px-2 rounded bg-gray-50 border border-gray-200;
      @apply focus:outline-primary-basic;
    }
  }
}
</style>

<script lang="ts">
import ProcessButton from "@/components/ProcessButton.vue";
import { user_signup } from "@/packages/api";
import { ref } from "@vue/runtime-core";
import { ResponseError } from '@/packages/api/types'

export default {
  components: { ProcessButton },
  setup() {
    const form = ref({
      email: "",
      password: "",
    });
    const signup = async () => {
      const data = form.value
      const res = await user_signup(data.email, data.password)
      
      if ((res as ResponseError)?.detail || (res as ResponseError)?.error) return false
      return true
    };
    return {form, signup};
  },
};
</script>

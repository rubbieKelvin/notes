<template>
  <slot :fuzzy="fuzzy" />
</template>

<script>
import { ref } from "@vue/reactivity";

export default {
  props: {
    datetime: {
      type: String,
      required: true,
    },
  },
  setup() {
    const fuzzy = ref("now");
    const reboundTime = ref(10000)
    const intervalId = ref(null);

    const parseAgoFromDateObj = datetime => {
      const now = new Date();
      const delta = now - datetime;
      const years = now.getFullYear() - datetime.getFullYear();
      const months = now.getMonth() - datetime.getMonth();
      const sec = delta / 1000;
      const minutes = sec / 60;
      const hours = minutes / 60;
      const days = hours / 24;

      if (years > 0) {
        if (years == 1) return "last year";
        return `${years} years ago`;
      }

      if (months > 0) {
        reboundTime.value = 48 * 60 * 60 * 1000 // in 2days, check again
        if (months == 1) return "last month";
        return `${months} months ago`;
      }

      if (days > 1) {
        reboundTime.value = 12 * 60 * 60 * 1000 // in 12hrs, check again
        if (days < 2) return "yesterday";
        return `${Math.floor(days)} days ago`;
      }

      if (hours > 1) {
        reboundTime.value = 20 * 60 * 1000 // in 20 minutes, check again
        if (hours < 2) return "an hour ago";
        return `${Math.floor(hours)} hours ago`;
      }

      reboundTime.value = 10 * 1000 // in 10 seconds, check again
      if (minutes >= 1) return `${Math.floor(minutes)} minutes ago`;
      return "few seconds ago";
    }

    return { fuzzy, intervalId, parseAgoFromDateObj }
  },
  mounted() {
    const parse = () => {
      this.fuzzy = this.parseAgoFromDateObj(new Date(this.datetime));
    };

    this.intervalId = window.setInterval(parse.bind(this), this.reboundTime);
    parse();
  },
  beforeUnmount() {
    if (this.intervalId !== null) window.clearInterval(this.intervalId);
  },
};
</script>

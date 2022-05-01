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
    shortened: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const fuzzy = ref("now");
    const reboundTime = ref(10000);
    const intervalId = ref(null);
    const short = props.shortened;

    const parseAgoFromDateObj = (datetime) => {
      const now = new Date();
      const delta = now - datetime;
      const years = now.getFullYear() - datetime.getFullYear();
      const months = now.getMonth() - datetime.getMonth();
      const sec = delta / 1000;
      const minutes = sec / 60;
      const hours = minutes / 60;
      const days = hours / 24;

      if (years > 0) {
        if (years == 1) return short ? "1yr" : "last year";
        return short ? `${years}yr` : `${years} years ago`;
      }

      if (months > 0) {
        reboundTime.value = 48 * 60 * 60 * 1000; // in 2days, check again
        if (months == 1) return short ? "1m" : "last month";
        return short ? `${months}m` : `${months} months ago`;
      }

      if (days > 1) {
        reboundTime.value = 12 * 60 * 60 * 1000; // in 12hrs, check again
        if (days < 2) return short ? "1d" : "yesterday";
        return short ? `${Math.floor(days)}d` : `${Math.floor(days)} days ago`;
      }

      if (hours > 1) {
        reboundTime.value = 20 * 60 * 1000; // in 20 minutes, check again
        if (hours < 2) return short ? "1hr" : "an hour ago";
        return short
          ? `${Math.floor(hours)}hr`
          : `${Math.floor(hours)} hours ago`;
      }

      reboundTime.value = 10 * 1000; // in 10 seconds, check again
      if (minutes >= 1)
        return short
          ? `${Math.floor(minutes)}min`
          : `${Math.floor(minutes)} minutes ago`;
      return short ? "<1min" : "few seconds ago";
    };

    return { fuzzy, intervalId, parseAgoFromDateObj };
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

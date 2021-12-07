<script lang="ts">
  // Check for TS support
  let count: number = 0;

  function handleClick() {
    count += 1;
  }
</script>

<button on:click={handleClick}>
  Clicked {count} {count === 1 ? 'time' : 'times'}
</button>

<style lang="scss">
$bg: red;

button {
  background: $bg;
}
</style>

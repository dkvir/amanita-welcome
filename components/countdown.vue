<template>
  <div class="countdown flex-center flex-column">
    <div class="title">Countdown</div>
    <ul class="boxes flex">
      <li v-for="(item, index) in countdown" class="box flex-center">
        <div class="label">{{ item.label }}</div>
        <div class="value">{{ item.value }}</div>
      </li>
    </ul>
  </div>
</template>

<script setup>
const countdown = useCountdown();
</script>

<style lang="scss" scoped>
.countdown {
  font-family: var(--font-pingroundgelvariable-regular);
  padding-bottom: 25px;
  transform: translateY(150%);

  .title {
    color: var(--color-gray);
    font-size: 14px;
  }
  .boxes {
    margin-top: 10px;
    border: 2px solid var(--color-gray);
    border-radius: 40px;
    padding: 10px;
    @include mq(max-width 768px) {
      padding: css-clamp-vw(5px, 10px, 768);
      border: 1px solid var(--color-gray);
    }
    .box {
      position: relative;
      @include size(css-clamp(40px, 50px));
      @include list-distance(left, 10px);
      border: 2px solid var(--color-gray);
      border-radius: 50%;

      @include mq(max-width 768px) {
        @include size(css-clamp-vw(30px, 40px, 768));
        @include list-distance(left, css-clamp-vw(5px, 10px, 768));
        border: 1px solid var(--color-gray);
      }

      .value {
        font-size: 18px;
        @include mq(max-width 768px) {
          font-size: css-clamp-vw(14px, 18px, 768);
        }
      }
      .label {
        position: absolute;
        top: 150%;
        left: 50%;
        transform: translate(-50%, 0);
        font-size: 12px;
        text-transform: capitalize;
        color: var(--color-gray);
        @include mq(max-width 768px) {
          font-size: css-clamp-vw(8px, 12px, 768);
        }
      }
    }
  }
}
</style>

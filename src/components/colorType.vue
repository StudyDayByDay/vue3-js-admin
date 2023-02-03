<template>
    <div>
        <span>颜色说明：</span>
        <span>
            <span class="word"><span class="blue"></span>划取</span>
            <span class="word"><span class="red"></span>AI解析</span>
            <span class="word"><span class="pink"></span>标注库</span>
        </span>
    </div>
</template>

<script setup>
</script>

<style lang="scss" scoped>
@mixin color($color: red) {
    display: inline-block;
    margin-right: 5px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: $color;
}
.word {
    margin-right: 20px;
    .blue {
        @include color(#0a1fec);
    }
    .red {
        @include color(#ad190f);
    }
    .pink {
        @include color(fuchsia);
    }
}
</style>

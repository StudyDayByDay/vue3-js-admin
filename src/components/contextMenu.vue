<template>
    <div class="context-menu" :style="{left: left + 'px', top: top + 'px'}" v-show="show">
        <div class="context-menu-item">
            <el-icon class="icon">
                <Edit size="1em"/>
            </el-icon>
            <span>编辑实体</span>
        </div>
        <div class="context-menu-item">
            <el-icon class="icon">
                <CopyDocument size="1em"/>
            </el-icon>
            <span>复制实体</span>
        </div>
        <div class="context-menu-item">
            <el-icon class="icon">
                <Delete size="1em"/>
            </el-icon>
            <span>删除实体</span>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
defineProps({
    top: {
        type: Number,
        required: true
    },
    left: {
        type: Number,
        required: true
    },
    show: {
        type: Boolean,
        required: true
    }
})

const emit = defineEmits(['update:show']);

onMounted(() => {
    document.onclick = () => {
        emit('update:show', false);
    }
});
</script>

<style lang="scss" scoped>
.context-menu {
    position: absolute;
    z-index: 999;
    width: 150px;
    // background-color: pink;
    padding: 4px 0;
    border-radius: 5px;
    box-shadow: 0 3px 6px -4px #0000001f, 0 6px 16px #00000014, 0 9px 28px 8px #0000000d;
    &-item {
        clear: both;
        height: 32px;
        display: flex;
        // justify-content: space-between;
        align-items: center;
        padding: 5px 12px;
        font-size: 14px;
        color: #000000d9;
        cursor: pointer;
        transition: all .3s;
        background-color: #fff;
        &:hover {
            background-color: #f5f5f5;
        }
        .icon {
            margin-right: 0.25rem;
        }
    }
}
</style>

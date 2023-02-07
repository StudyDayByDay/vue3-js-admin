<template>
    <div class="context-menu" :style="{left: left + 'px', top: top + 'px'}" v-show="show">
        <div class="context-menu-item" v-for="item in options" :key="item.type" @click="handleMenuClick(item.type)">
            <el-icon class="icon">
                <component :is="item.icon" size="1em"></component>
            </el-icon>
            <span>{{item.label}}</span>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
    // 控制是否显示
    show: {
        type: Boolean,
        required: true
    },
    // 挂载对象
    el: {
        type: Object,
        default: () => {
            return {}
        }
    },
    // 事件原对象
    event: {
        type: Object,
        default: () => {
            return {}
        }
    },
    // 划词数据
    target: {
        type: Object,
        default: () => {
            return {}
        }
    },
    // 类型
    type: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['update:show', 'edit', 'copy', 'delete', 'mapping']);

const left = computed(() => {
    return props.event?.clientX ?? 0 + 30;
});
const top = computed(() => {
    return props.event?.clientY ?? - 10;
});

const optionsObj = {
    label: [
        // {label: '编辑', icon: 'Edit', type: 'edit'},
        // {label: '复制', icon: 'CopyDocument', type: 'copy'},
        { label: '映射', icon: 'Aim', type: 'mapping' },
        { label: '删除', icon: 'Delete', type: 'delete' },
    ],
    path: [
        { label: '删除', icon: 'Delete', type: 'delete' }, 
    ]
};

const options = computed(() => {
    return optionsObj[props.type];
});

const handleMenuClick = (t) => {
    emit(t, {event: t, type: props.type, target: props.target});
}

const onclick = () => {
    emit('update:show', false);
}

const onscroll = () => {
    emit('update:show', false);
}

defineExpose({ onclick, onscroll });
</script>

<style lang="scss" scoped>
.context-menu {
    position: absolute;
    z-index: 999;
    width: 150px;
    background-color: #fff;
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
        // background-color: #fff;
        &:hover {
            background-color: #e6e6e6;
        }
        .icon {
            margin-right: 0.25rem;
        }
    }
}
</style>

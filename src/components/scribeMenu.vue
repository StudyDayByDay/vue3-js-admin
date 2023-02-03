<template>
    <div class="scribe-menu" :style="{left: left + 'px', top: top + 'px'}" v-show="show" id="scribeMenu">
        <span>{{ title }}：</span>
        <el-cascader
            style="width: 170px;"
            ref="cascader"
            placeholder="支持搜索"
            :options="options"
            :props="{ expandTrigger: 'hover' }"
            :show-all-levels="false"
            filterable
            v-model="cascaderValue"
            @change="change">
        </el-cascader>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, watchEffect, computed } from 'vue';
// import { options } from '@/utils';

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
    // 浮窗标题
    title: {
        type: String,
        required: true
    },
    // 标志：true：点击label，false：划取实体
    click: {
        type: Boolean,
        default: true
    },
    // 级联元数据
    options: {
        type: Array,
        default: () => []
    },
    // 划词数据
    target: {
        type: Object,
        default: () => {}
    },
})

const emit = defineEmits(['update:show', 'change']);

const left = computed(() => {
    return props.event?.clientX ?? 0 + 30;
});
const top = computed(() => {
    return props.event?.clientY ?? - 10;
});

// 级联v-model
const cascaderValue = ref([]);
// 级联ref
const cascader = ref(null);
// 当前选择的node
let chooseNode = null;
// option转map
let optionMap = null;


const treeToMap = (options) => {
    // 级联解构转Map结构，每一次调用时需要新增新的数组
    const map = new Map();
    const arrayFunc = (options, map, arr = []) => {
        options.forEach((item) => {
            const arrItem = [...arr];
            if (item.children.length) {
                arrItem.push(item.value);
                arrayFunc(item.children, map, arrItem);
            } else {
                arrItem.push(item.value);
                map.set(item.label, arrItem);
            }
        });
    };
    arrayFunc(options, map);
    return map;
}

watchEffect(() => {
    optionMap = treeToMap(props.options);
});
watch(() => props.target, () => {
    // cascaderValue.value = optionMap.get(newVal.textContent);
    cascaderValue.value.length = 0;
    cascaderValue.value.push(...optionMap.get(props.target.textContent));
});

const change = () => {
    chooseNode = cascader.value.getCheckedNodes()[0];
    const changeDAta = {
        labels: [
            {id: chooseNode.value, title: chooseNode.label}
        ],
        ...props.target
    };
    setTimeout(() => {
        emit('update:show', false);
        // 组合好数据返回
        emit('change', changeDAta);
    }, 0);
};

// 响应onclick事件
const onclick = (event) => {
    const panel = document.getElementById('scribeMenu').contains(event.target);  // 这个是自己的区域
    const dropDown = document.getElementsByClassName('el-cascader__dropdown')[0].contains(event.target);
    if(!(panel || dropDown)) {
        console.log('没在区域里面-->>>');
        // 点击关闭、划取不处理
        if (props.click) {
            emit('update:show', false);
        }
    }else {
        console.log('在区域里--->>>>>');
    }
}
// 响应onkeydown事件
const onkeydown = ({key}) => {
    if (key === 'Enter' && props.show && cascader.value.getCheckedNodes().length && !props.click) {
        setTimeout(() => {
            emit('update:show', false);
            emit('change', {
                labels: [
                    {id: chooseNode.value, title: chooseNode.label}
                ],
                ...props.target
            });
        }, 0);
    }
};
// 响应onscroll事件
const onscroll = () => {
    emit('update:show', false);
};
</script>

<style lang="scss" scoped>
.scribe-menu {
    position: absolute;
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 270px;
    font-size: 14px;
    color: #000000d9;
    background-color: #fff;
    padding: 5px 12px;
    border-radius: 5px;
    // box-shadow: 0 3px 6px -4px #0000001f, 0 6px 16px #00000014, 0 9px 28px 8px #0000000d;
    box-shadow: 0 1px 2px -2px #00000029, 0 3px 6px #0000001f, 0 5px 12px 4px #00000017;
    &-title {
        height: 20px;
        line-height: 20px;
        background-color: pink;
    }

    &-content {
        height: 40px;
        background-color: red;
    }
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

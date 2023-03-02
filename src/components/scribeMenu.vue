<template>
    <div class="scribe-menu" :style="{left: left + 'px', top: top + 'px'}" v-show="show" id="scribeMenu">
        <div class="scribe-menu-select">
            <span>{{ (type === 'label' ? '实体' : '关系') + '名称' }}：</span>
            <el-cascader
                v-if="show"
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
        <div class="scribe-menu-line" v-show="copyShow"></div>
        <div class="scribe-menu-copy" v-show="copyShow" @click="handleCopy">
            <el-icon class="icon">
                <component :is="'CopyDocument'" size="1em"></component>
            </el-icon>
            <span>以划取部分为模板进行复制</span>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import apis from '@/api';
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
    // 鼠标x
    clientX: {
        type: Number,
        default: 0
    },
    // 鼠标y
    clientY: {
        type: Number,
        default: 0
    },
    // 标志：true：点击label，false：划取实体
    click: {
        type: Boolean,
        default: true
    },
    // 划词数据
    target: {
        type: Object,
        default: () => {}
    },
    // 类型
    type: {
        type: String,
        required: true
    },
    // 是否显示复制模块
    copyShow: {
        type: Boolean,
        required: true
    },
    // 是否点击了复制
    copy: {
        type: Boolean,
        required: true
    }
})

const emit = defineEmits(['update:show', 'change', 'update:copy', 'copy']);

const left = computed(() => {
    return props.clientX + 30;
});
const top = computed(() => {
    return props.clientY - 10;
});

// 级联数据集合
const cascaderData = {};
// 级联v-model
const cascaderValue = ref([]);
// 级联数组
const options = ref([]);
// 级联ref
const cascader = ref(null);
// 当前选择的node
let chooseNode = null;
// option转map
let optionMap = null;


onMounted(() => {
    initCascaderData();
});

const treeToMap = (type) => {
    // 级联解构转Map结构，每一次调用时需要新增新的数组
    const map = new Map();
    const options = cascaderData[type];
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

const initCascaderData = async () => {
    const { data: label } = await apis.labelComboBox();
    const { data: path } = await apis.relationComboBox();
    cascaderData.label = label;
    cascaderData.path = path;
}

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
    chooseNode = cascader.value.getCheckedNodes()[0];
    if (props.type === 'label') {
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
    } else {
        if (key === 'Enter' && props.show && cascader.value.getCheckedNodes().length && chooseNode) {
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
    }
};
// 响应onscroll事件
const onscroll = () => {
    emit('update:show', false);
};

// 重置
const reset = () => {
    cascaderValue.value.length = 0;
    emit('update:copy', false);
}

defineExpose({ onclick, onkeydown, onscroll, reset });
// 修改时的监听
watch([() => props.type, () => props.target], () => {
    optionMap = treeToMap(props.type);
    options.value = cascaderData[props.type];
    const { textContent } = props.target;
    if (optionMap.has(textContent)) {
        cascaderValue.value.length = 0;
        cascaderValue.value.push(...optionMap.get(textContent));
    }
});

const handleCopy = () => {
    emit('update:copy', true);
    emit('copy');
}

</script>

<style lang="scss" scoped>
.scribe-menu {
    position: absolute;
    width: 270px;
    font-size: 14px;
    color: #000000d9;
    background-color: #fff;
    padding: 5px 12px;
    border-radius: 5px;
    // box-shadow: 0 3px 6px -4px #0000001f, 0 6px 16px #00000014, 0 9px 28px 8px #0000000d;
    box-shadow: 0 1px 2px -2px #00000029, 0 3px 6px #0000001f, 0 5px 12px 4px #00000017;
    &-select {
        display: flex;
        justify-content: space-around;
        align-items: center;
    }
    &-line {
        margin-top: 5px;
        border-top: 1px dashed #ccc;
    }
    &-copy {
        display: flex;
        align-items: center;
        margin-top: 5px;
        cursor: pointer;
        transition: all .3s;
        border-radius: 4px;
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

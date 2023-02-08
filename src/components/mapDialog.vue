<template>
    <el-dialog v-model="mapVisible" title="建立映射" width="30%" center :before-close="handleClose">
        <div class="content">
            <div class="content-item">
                <span class="title">实体：</span>
                <span>{{ entity.label }}</span>
            </div>
            <div class="content-item">
                <span class="title">映射实体：</span>
                <el-tag
                    v-for="tag in dynamicTags"
                    :key="tag"
                    class="mx-1"
                    closable
                    :disable-transitions="false"
                    @close="tagClose(tag)"
                >
                    {{ tag }}
                </el-tag>
                <el-input
                    v-if="inputVisible"
                    ref="InputRef"
                    v-model="inputValue"
                    class="input"
                    size="small"
                    @keyup.enter="handleInputConfirm"
                    @blur="handleInputConfirm"
                />
                <el-button v-else class="button-new-tag ml-1" size="small" @click="showInput">
                    + 新实体
                </el-button>
            </div>
        </div>
        <template #footer>
            <span class="dialog-footer">
                <el-button type="primary" @click="handleDialog('commit')">提交</el-button>
                <el-button @click="handleDialog('cancel')">取消</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import { ElInput } from 'element-plus'

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true
    },
    entity: {
        type: Object,
        default: () => {
            return {
                label: '',
                id: ''
            }
        }
    }
});

const emit = defineEmits(['update:modelValue', 'commit']);

const dynamicTags = ref([]);
const inputVisible = ref(false);
const InputRef = ref(null);
const inputValue = ref('');

const mapVisible = computed(() => {
    return props.modelValue;
});

const tagClose = (tag) => {
  dynamicTags.value.splice(dynamicTags.value.indexOf(tag), 1);
}

const showInput = () => {
  inputVisible.value = true;
  nextTick(() => {
    InputRef.value.input.focus();
  })
}

const handleInputConfirm = () => {
  if (inputValue.value) {
    dynamicTags.value.push(inputValue.value);
  }
  inputVisible.value = false;
  inputValue.value = '';
}

const handleClose = () => {
    emit('update:modelValue', false);
}
const handleDialog = (e) => {
    if (e === 'commit') {
        emit('commit', {
            pid: props.entity.id,
            mapText: dynamicTags.value,
        });
    }
    handleClose();
}

</script>

<style lang="scss" scoped>
.content {
    &-item {
        margin-bottom: 10px;
        .title {
            font-weight: bold;
            margin-right: 10px;
        }
        .input {
            width: 100px;
        }
    }
}

:deep(.el-tag) {
    margin: 0 5px 5px 0;
    user-select: none;
}
</style>

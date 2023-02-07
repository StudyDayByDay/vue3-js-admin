<template>
    <el-dialog v-model="mapVisible" title="建立映射" width="30%" center :before-close="handleClose">
        <div class="content">
            <div class="content-item">
                <span class="title">实体：</span>
                <span>{{ '疾病综合征' }}</span>
            </div>
            <div class="content-item">
                <span class="title">映射实体：</span>
            </div>
        </div>
        <template #footer>
            <span class="dialog-footer">
                <el-button type="primary">提交</el-button>
                <el-button>取消</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true
    }
});

const emit = defineEmits(['update:modelValue']);

const mapVisible = computed(() => {
    return props.modelValue;
});
const handleClose = () => {
  emit('update:modelValue', false);
}

</script>

<style lang="scss" scoped>
.content {
    &-item {
        .title {
            font-weight: bold;
        }
    }
}
</style>

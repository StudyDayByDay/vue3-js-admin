<template>
  <el-dialog
    v-model="mapVisible"
    title="复制情况确认"
    width="50%"
    center
    :before-close="handleClose"
  >
    <div class="content">
      <div class="content-item">
        <div class="content-item-title">模版</div>
        <div class="content-item-display">
          <span>{{ templateText }}</span>
        </div>
      </div>
      <div class="content-item">
        <div class="content-item-title">原文</div>
        <div class="content-item-display">
          <span>{{ scribbleText }}</span>
        </div>
      </div>
      <div class="content-item">
        <div class="content-item-title">实体</div>
        <div class="content-item-display">
          <el-table :data="entitys" style="width: 100%">
            <el-table-column prop="text" label="实体" />
            <el-table-column prop="label" label="标签" />
          </el-table>
        </div>
      </div>
      <div class="content-item">
        <div class="content-item-title">关系</div>
        <div class="content-item-display">
          <el-table :data="relations" style="width: 100%">
            <el-table-column prop="startText" label="开始实体" />
            <el-table-column prop="startLabel" label="开始标签" />
            <el-table-column prop="relationText" label="关系" />
            <el-table-column prop="endText" label="结束实体" />
            <el-table-column prop="endLabel" label="结束标签" />
          </el-table>
        </div>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button type="primary" @click="handleDialog('commit')"
          >提交</el-button
        >
        <el-button @click="handleDialog('cancel')">取消</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  // 模版
  templateText: {
    type: String,
    required: true,
  },
  // 原文
  scribbleText: {
    type: String,
    required: true,
  },
  // 实体
  entitys: {
    type: Array,
    required: true,
  },
  // 关系
  relations: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "commit", "cancel"]);

const mapVisible = computed(() => {
  return props.modelValue;
});

const handleClose = () => {
  emit("update:modelValue", false);
};
const handleDialog = (e) => {
  if (e === "commit") {
    emit("commit");
  } else {
    emit("cancel");
  }
  handleClose();
};
</script>

<style lang="scss" scoped>
.content {
  &-item {
    margin-bottom: 16px;
    &-title {
      color: #373d45;
      font-weight: bold;
      margin-bottom: 8px;
    }
    &-display {
      background-color: #e9e9eb;
      padding: 16px;
    }
  }
}
</style>

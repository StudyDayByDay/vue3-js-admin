<template>
    <div class="word-list">
        <el-table :data="tableData" border style="width: 100%">
            <el-table-column prop="id" label="病案列表id" />
            <el-table-column prop="nickName" label="负责人姓名" />
            <el-table-column prop="hosTitle" label="机构名称" />
            <el-table-column prop="diseaseTitle" label="疾病名称" />
            <el-table-column prop="markStatus" label="标注状态">
                <template #default="{row}">
                    <el-tag v-if="row.markStatus" type="success">已标注</el-tag>
                    <el-tag v-else>未标注</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" />
            <el-table-column label="操作">
                <template #default="{row}">
                    <el-button link type="primary" size="small" @click="signWord(row)">标注</el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apis from '@/api';

const router = useRouter();
const tableData = ref([]);

onMounted(() => {
    getTableData();
});

const getTableData = async () => {
    const {data: {list}} = await apis.markWordList({
        pageNum: 1,
        pageSize: 10,
    });
    tableData.value = list;
}

const signWord = (row) => {
    router.push({path: '/detail', query: {mrId: row.id}});
}
</script>

<style lang="scss" scoped>
.word-list {
    width: 100%;
    height: 100%;
}
</style>

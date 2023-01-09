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
        <div class="button">
            <el-button type="primary" size="small" @click="toStatic">不调接口的划词插件测试</el-button>
        </div>
        <div class="echart-content">
            <div id="carverReslut" class="echart"></div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apis from '@/api';
import * as echarts from 'echarts';

const router = useRouter();
const tableData = ref([]);
const echart = echarts;

onMounted(() => {
    getTableData();
    initChart();
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

const toStatic = () => {
    router.push({name: 'static'});
}

// 基础配置一下Echarts
const initChart = () => {
    let chart = echart.init(document.getElementById("carverReslut"), "dark");
    // 把配置和数据放这里
    chart.setOption({
        title: {
            text: 'carver插件阈值测试（差值四舍五入、0代表毫秒级）'
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ['渲染实体', '渲染关系', '新建关系', '删除关系', '新建实体', '删除实体']
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        toolbox: {
            feature: {
                dataZoom: {
                    yAxisIndex: 'none'
                },
                restore: {},
                saveAsImage: {}
            }
        },
        xAxis: {
            name: '个/条',
            type: 'category',
            boundaryGap: false,
            data: ['50', '60', '70', '80', '90', '100', '110', '120', '130', '140', '150', '200', '250', '300', '350', '400', '450', '500']
        },
        yAxis: {
            name: '秒',
            type: 'value',
            interval:1, // 步长
            min:0, // 起始
            max:50 // 终止
        },
        dataZoom: [
            {
                type: 'inside',
                start: 0,
                end: 500
            },
            {
                start: 0,
                end: 20
            }
        ],
        series: [
            {
                name: '渲染实体',
                type: 'line',
                data: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
                smooth: true
            },
            {
                name: '渲染关系',
                type: 'line',
                data: [0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 6, 9, 11, 17, 23, 26, 29],
                smooth: true
            },
            {
                name: '新建关系',
                type: 'line',
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                smooth: true
            },
            {
                name: '删除关系',
                type: 'line',
                data: [1, 2, 2, 2, 2, 3, 4, 4, 5, 5, 5, 8, 13, 17, 23, 31, 36, 43],
                smooth: true
            },
            {
                name: '新建实体',
                type: 'line',
                data: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 3, 4, 6, 7, 11, 14, 19],
                smooth: true
            },
            {
                name: '删除实体',
                type: 'line',
                data: [1, 1, 1, 2, 3, 3, 3, 4, 5, 5, 5, 9, 12, 16, 21, 31, 36, 43],
                smooth: true
            },
        ]
    });
    window.onresize = function() {
        //自适应大小
        chart.resize();
    };
}
</script>

<style lang="scss" scoped>
.word-list {
    width: 100%;
    height: 100%;
}

.button {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.echart-content {
    width: 100%;
    height: 600px;
    padding: 20px;
    .echart {
        width: 100%;
        height: 100%;
    }
}
</style>

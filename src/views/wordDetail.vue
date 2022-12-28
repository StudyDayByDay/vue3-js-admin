<template>
    <div class="carver">
      <div class="id">{{mrId}}</div>
      <div class="header">
        <el-button :color="color" :dark="true" @click="wordTime">文档时间</el-button>
        <el-button :color="color" :dark="true" @click="moduleSign">子模块手动划取</el-button>
        <el-button :color="color" :dark="true" @click="moduleSignAuto">自动划分子模块</el-button>
        <el-button :color="color" :dark="true" @click="setTags">应用标注库</el-button>
        <el-button :color="color" :dark="true" @click="setThisTags">应用本篇标注</el-button>
        <el-button :color="color" :dark="true" @click="updateTag">修改</el-button>
        <el-button :color="color" :dark="true" @click="copyTag">复制</el-button>
        <el-button :color="color" :dark="true" @click="patchAddPath">批量建立关系</el-button>
        <el-button :color="color" :dark="true" @click="setMap">手动建立映射</el-button>
        <el-button :color="color" :dark="true" @click="signByAI">AI标注</el-button>
      </div>
      <div class="content">
        <div class="content-left">
          <el-collapse v-model="collapse">
            <el-collapse-item name="relation">
              <template #title>
                关系分类
                <el-icon class="header-icon">
                  <info-filled />
                </el-icon>
              </template>
              <el-tree-select v-model="relation" :data="relationData" :render-after-expand="false" />
            </el-collapse-item>
            <el-collapse-item name="tag">
              <template #title>
                标签分类
                <el-icon class="header-icon">
                  <info-filled />
                </el-icon>
              </template>
              <el-tree-select v-model="tag" :data="tagData" :render-after-expand="false" />
            </el-collapse-item>
          </el-collapse>
        </div>
        <div class="content-center">
            <div class="content-center-header">
                <span>当前流程</span>
                <span>
                  <span class="word">划取：<span class="blue"></span></span>
                  <span class="word">AI解析：<span class="red"></span></span>
                  <span class="word">标注库：<span class="pink"></span></span>
                </span>
                <el-pagination small layout="prev, pager, next" v-model:current-page="currentPage" :page-count="pageCount" @current-change="handleCurrentChange"/>
            </div>
            <div class="content-center-content" ref="carverPanel"></div>
        </div>
        <div class="content-right">
          <el-tabs v-model="activeName">
            <el-tab-pane label="实体" name="entity">
              <el-collapse>
                <el-collapse-item v-for="label in entityIsolationData" :key="label[0]" :name="label[0]" :title="label[0].split('-')[1]">
                  <el-tag class="tag" v-for="(entityItem, ind) in label[1].entity" :key="entityItem.id + ind" closable :disable-transitions="false" @close="handleDeleteEntity(entityItem)">
                    {{ entityItem.text }}
                  </el-tag>
                </el-collapse-item>
              </el-collapse>
            </el-tab-pane>
            <el-tab-pane label="结构化显示" name="structure">
              <el-input v-model="filterText" placeholder="输入参数过滤数据" />
              <el-tree ref="treeRef" class="filter-tree" :data="dataTree" :props="defaultProps" default-expand-all :filter-node-method="filterNode"/>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>
</template>

<script setup>
import { reactive, ref, watch, onMounted } from 'vue';
import { InfoFilled } from '@element-plus/icons-vue'
import { Carver, globalOffsetToPageOffset, entitysToLabels } from '@/utils';
import apis from '@/api';
import {useRoute} from 'vue-router';

// 按钮颜色值
const color = ref('#2c3e50');
// 左侧collapse
const collapse = reactive(['relation', 'tag']);
// 左侧关系树控件、标签树控件
const relation = ref(), tag = ref();
// 左侧关系数据
let relationData = [], tagData = [];
// 左侧标签数据

// 子模块数据
const moduleData = [];
// 实体数据
const entitys = [];

// 右侧tabs绑定数据
const activeName = ref('entity');
// 右侧实体数据
const entityIsolationData = reactive([]);
// 结构化显示过滤值
const filterText = ref('');
// 结构化树ref
const treeRef = ref(null);
const defaultProps = {
  children: 'children',
  label: 'label',
}
// 划词dom
const carverPanel = ref(null);
// 划词实例
let carver;

// 文档id
const {query: {mrId}} = useRoute();
// 分页数据
let pages = [];
// 当前页数据
const currentPage = ref(1);
// 总数
const pageCount = ref(1);


// 初始化流程：1、渲染子模块部分；2、渲染时间模块；3、渲染实体；4、渲染连线；5、渲染右侧isolation_list孤儿实体清单；6、获取右侧结构数据并渲染getStructureTree

onMounted(() => {
  // 先初始化划词实例
  initialize();
  getInitData();
});

watch(filterText, (val) => {
  treeRef.value.filter(val);
});

const filterNode = (value, data) => {
  if (!value) return true
  return data.label.includes(value)
}

const dataTree = [
  {
    id: 1,
    label: 'Level one 1',
    children: [
      {
        id: 4,
        label: 'Level two 1-1',
        children: [
          {
            id: 9,
            label: 'Level three 1-1-1',
          },
          {
            id: 10,
            label: 'Level three 1-1-2',
          },
        ],
      },
    ],
  },
  {
    id: 2,
    label: 'Level one 2',
    children: [
      {
        id: 5,
        label: 'Level two 2-1',
      },
      {
        id: 6,
        label: 'Level two 2-2',
      },
    ],
  },
  {
    id: 3,
    label: 'Level one 3',
    children: [
      {
        id: 7,
        label: 'Level two 3-1',
      },
      {
        id: 8,
        label: 'Level two 3-2',
      },
    ],
  },
]

// **************  获取数据  **************
// 初始化接口数据
const getInitData = () => {
  Promise.all([getPages(), moduleList(), entityList(), entityRelationList(), entityIsolationList(), entityStructure(), relationComboBox(), labelComboBox()]).then(() => {
    handleCurrentChange(1);
  });
}
// 获取分页数据
const getPages = () => {
  return new Promise((resolve, reject) => {
    apis.page({id: mrId}).then(({data}) => {
      pages = data;
      pageCount.value = pages.length;
      resolve('pages ok');
    }).catch((error) => {
      reject(error)
    });
  });
}
// 获取子模块
const moduleList = () => {
  return new Promise((resolve, reject) => {
    apis.moduleList({mrId}).then(({data}) => {
      moduleData.push(...data);
      resolve('modules ok');
    }).catch((error) => {
      reject(error)
    });
  });
}
// 获取实体列表
const entityList = () => {
  return new Promise((resolve, reject) => {
    apis.entityList({mrId}).then(({data}) => {
      entitys.push(...data);
      resolve('entitys ok');
    }).catch((error) => {
      reject(error)
    });
  });
}
// 获取实体关系列表
const entityRelationList = () => {
  return new Promise((resolve, reject) => {
    apis.entityRelationList({mrId}).then(({data}) => {
      console.log(data, 'entityPaths');
      resolve('entityPaths ok');
    }).catch((error) => {
      reject(error)
    });
  });
}
// 查询无关联关系实体列表/获取右侧实体部分
const entityIsolationList = () => {
  return new Promise((resolve, reject) => {
    apis.entityIsolationList({mrId}).then(({data}) => {
      renderPageIsolationEntity(data);
      resolve('entityIsolationList ok');
    }).catch((error) => {
      reject(error)
    });
  });
}
// 实体关系结构化显示/获取右侧结构部分
const entityStructure = () => {
  return new Promise((resolve, reject) => {
    apis.entityStructure({mrId}).then(({data}) => {
      console.log(data, 'entityStructure');
      resolve('entityStructure ok');
    }).catch((error) => {
      reject(error)
    });
  });
}
// 关系下拉框/获取左侧关系部分
const relationComboBox = () => {
  return new Promise((resolve, reject) => {
    apis.relationComboBox().then(({data}) => {
      relationData = data
      resolve('relationComboBox ok');
    }).catch((error) => {
      reject(error)
    });
  });
}
// 标签下拉框/获取左侧标签部分
const labelComboBox = () => {
  return new Promise((resolve, reject) => {
    apis.labelComboBox().then(({data}) => {
      tagData = data;
      resolve('labelComboBox ok');
    }).catch((error) => {
      reject(error)
    });
  });
}

// **************  按钮操作  **************
// 文档时间
const wordTime = () => {};
// 子模块手动划取
const moduleSign = () => {};
// 自动划分子模块
const moduleSignAuto = () => {};
// 应用标注库
const setTags = () => {};
// 应用本篇标注
const setThisTags = () => {};
// 修改
const updateTag = () => {};
// 复制
const copyTag = () => {};
// 批量建立关系
const patchAddPath = () => {};
// 手动建立映射
const setMap = () => {};
// AI标注
const signByAI = () => {};

// **************  carver  **************
const initialize = () => {
    carver = new Carver({
        root: carverPanel.value,
        style: {
        // backgroundColor  背景颜色
        // mark  选中文字标记样式配置（highlightColor：文字标记颜色 string，opacity：文字标记透明度 number）
        // 为标签指定默认样式
        label: {
            // 背景色
            backgroundColor: "#7B68EE",
            // 字体颜色
            color: "#f6f6f6",
            // 标签圆角半径 borderRadius number
            // 标签高亮颜色 highlightColor
        },
        // path（borderColor：线条和文字颜色，highlightColor：线条和文字高亮颜色）
        },
        config: {
        // 字间距
        letterSpacing: 0,
        // 字体大小 fontSize：16
        // 段间距  segmentSpacing：5
        // 段首行左间距  beforeParagraph：32
        },
    });
    // carver.text = Mock;
    carver.onPathClick = (target, e) => {
        console.log(target, e, 'path');
    };
    carver.onLabelClick = async (target, e) => {
        console.log(target, e, 'label');
    }
}

// 分页数据处理
const handleCurrentChange = (e) => {
  carver.text = pages[e-1].text;
  renderPageModule();
  renderPageMarks();
}

// 渲染子模块
const renderPageModule = () => {
  // moduleData
  const page = pages[currentPage.value - 1];
  const contentStartOffset = pages[currentPage.value - 1].startOffset;
  const contentEndOffset = pages[currentPage.value - 1].endOffset;
  // 过滤在当前文章内的模块
  const marks = moduleData.filter(item => {
      return item.startOffset >= contentStartOffset && item.endOffset <= contentEndOffset
  }).map((item) => {
    return {
      startIndex: globalOffsetToPageOffset(item.startOffset, page),
      endIndex: globalOffsetToPageOffset(item.endOffset, page),
      textContent: '子模块',
      exData: 'module_' + item.id,
      style: {
        backgroundColor: 'red',
      },
    };
  });
  carver.addLabel(marks)
}

const renderPageMarks = () => {
  const page = pages[currentPage.value - 1];
  const contentStartOffset = pages[currentPage.value - 1].startOffset;
  const contentEndOffset = pages[currentPage.value - 1].endOffset;

  const marks = entitys.filter(entity => {
      return entity.startOffset >= contentStartOffset && entity.endOffset <= contentEndOffset;
  }).map((item) => {
    return {
      startIndex: globalOffsetToPageOffset(item.startOffset, page),
      endIndex: globalOffsetToPageOffset(item.endOffset, page),
      textContent: item.labels[0].title,
      exData: 'entity_' + item.id,
      style: {
          // backgroundColor: Controller.getEntityLabelColor(entity.from),
          // 缺少这个字段，所以暂时用默认颜色
          backgroundColor: '#0a1fec',
      },
    };
  });
  console.log(entitys, marks, '我猜是没有');
  carver.addLabel(marks)
}

// 渲染右侧实体部分
const renderPageIsolationEntity = (data) => {
  const contentStartOffset = pages[currentPage.value - 1].startOffset;
  const contentEndOffset = pages[currentPage.value - 1].endOffset;
  entityIsolationData.length = 0;
  const isolationEntitys = data.filter(item => {
    return item.startOffset >= contentStartOffset && item.endOffset <= contentEndOffset
  })
  // 这里要处理一下isolationEntitys这些实体数据才能显示出来，要分一下类，用labels来做主键
  entityIsolationData.push(...entitysToLabels(isolationEntitys));
  console.log(entityIsolationData, '看看过滤之后的实体');
}
// 右侧实体部分删除
const handleDeleteEntity = (entity) => {
  console.log(entity, '删除entity');
}
</script>

<style lang="scss" scoped>
.carver {
  width: 100%;
  height: 100%;
  padding: 0 20px;
  display: grid;
  grid-template-columns: auto;
  grid-template-rows: 31px 41px calc(100% - 72px);
  .id {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 31px;
    border-bottom: 1px dashed #ccc;
  }
  .header {
    height: 41px;
    padding: 5px 10px;
    border-bottom: 1px solid #ebeef5;
  }
  .content {
    display: grid;
    grid-template-columns: 20% 60% 20%;
    grid-template-rows: 100%;
    &-left {
      border-right: 1px solid #ebeef5;
    }
    &-center {
      height: 100%;
      border-right: 1px solid #ebeef5;
      &-header {
        height: 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 20px;
        border-bottom: 1px solid #ebeef5;
        .word {
          margin-right: 20px;
          .blue {
            display: inline-block;
            width: 20px;
            height: 10px;
            background-color: #0a1fec;
          }
          .red {
            display: inline-block;
            width: 20px;
            height: 10px;
            background-color: #ad190f;
          }
          .pink {
            display: inline-block;
            width: 20px;
            height: 10px;
            background-color: fuchsia;
          }
        }
      }
      &-content {
        // width: 100%;
        height: calc(100% - 40px);
        overflow: auto;
      }
    }
    &-right {
      overflow: hidden;
    }
  }
}

.tag {
  margin: 5px 5px 0 0;
}

:deep(.el-tabs__nav) {
    white-space: nowrap;
    position: relative;
    transition: transform var(--el-transition-duration);
    float: none;
    display: flex;
    justify-content: center;
    z-index: calc(var(--el-index-normal) + 1);
}

:deep(.el-input) {
  margin-left: 5px;
  width:  calc(100% - 5px)
}

:deep(.el-tab-pane) {
  height: calc(100vh - 55px);
  overflow-y: auto;
}

:deep(.el-collapse-item__content) {
  padding-left: 5px;
}

:deep(.el-collapse-item__header) {
  padding-left: 5px;
}
</style>

<template>
    <div class="carver">
      <div class="id">{{mrId}}</div>
      <div class="header">
        <el-button :color="color" :dark="true" @click="moduleSign">划取子模块</el-button>
        <el-button :color="color" :dark="true" @click="entityByLabel">划取实体标注标签</el-button>
        <el-button :color="color" :dark="true" @click="labelByPath">标签添加关系</el-button>
        <el-button type="danger" @click="cancelOpertion">取消操作</el-button>
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
              <el-tree-select v-model="relation" :data="relationData" :render-after-expand="false" @current-change="relationChange"/>
            </el-collapse-item>
            <el-collapse-item name="tag">
              <template #title>
                标签分类
                <el-icon class="header-icon">
                  <info-filled />
                </el-icon>
              </template>
              <el-tree-select v-model="tag" :data="tagData" :render-after-expand="false" @current-change="tagChange"/>
            </el-collapse-item>
          </el-collapse>
        </div>
        <div class="content-center" v-loading="loading">
            <div class="content-center-header">
                <span>当前流程：{{ procedure }}</span>
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
              <el-collapse v-model="collapseArr">
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
import { Carver, globalOffsetToPageOffset, pageOffsetToGlobalOffset, entitysToLabels } from '@/utils';
import apis from '@/api';
import {useRoute} from 'vue-router';
import { ElMessage } from 'element-plus'

// 按钮颜色值
const color = ref('#2c3e50');
// loading
const loading = ref(true);
// 左侧collapse
const collapse = reactive(['relation', 'tag']);
// 左侧关系树控件、标签树控件
const relation = ref(), tag = ref();
// 左侧关系数据、左侧标签数据
const relationData = reactive([]), tagData = reactive([]);
// 子模块数据
const moduleData = [];
// 实体数据
const entitys = [];
// 关系数据
const entityRelations = [];
// 右侧tabs绑定数据
const activeName = ref('entity');
// 右侧手风琴绑定数组
const collapseArr = ref([]);
// 右侧实体数据
const entityIsolationDataAll = [];
// 右侧渲染实体数据
const entityIsolationData = reactive([]);
// 结构化显示过滤值
const filterText = ref('');
// 结构化树ref
const treeRef = ref(null);
const defaultProps = {
  children: 'children',
  label: 'label',
}
// ********************************
// 划词dom
const carverPanel = ref(null);
// 划词实例
let carver;

// 文档id
const {query: {mrId}} = useRoute();
// 当前流程
const procedure = ref('无');
// 分页数据
let pages = [];
// 当前页数据
const currentPage = ref(1);
// 总数
const pageCount = ref(1);
// 当前选中的label
let currentLabel = null;
// relation操作
const relationOperate = {
  flag: false,
  currentRelation: null,
};

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
      entityRelations.push(...data);
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
      entityIsolationDataAll.length = 0;
      entityIsolationDataAll.push(...data);
      renderPageIsolationEntity();
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
      console.log(data, '什么情况');
      relationData.push(...data);
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
      tagData.push(...data);
      resolve('labelComboBox ok');
    }).catch((error) => {
      reject(error)
    });
  });
}

// **************  按钮操作  **************
// 子模块手动划取
const moduleSign = () => {};
// 划取实体标注标签
const entityByLabel = () => {
  // 如果选择了标签就开启划词，否则进行提示
  if (currentLabel) {
    procedure.value = '标记实体';
    // 调用划词方法
    startBatchCarver(
      function(entity) {
          entity.labels = [currentLabel];
          createEntity(entity);
      }
    )
  } else {
    ElMessage({
      message: '请先选择标签',
      type: 'warning',
    })
  }
};
// 标签添加关系
const labelByPath = () => {
  if (relationOperate.currentRelation) {
    relationOperate.flag = true;
    procedure.value = '添加连线';
  } else {
    ElMessage({
      message: '请先选择关系',
      type: 'warning',
    })
  }
};
// 取消之前的操作
const cancelOpertion = () => {
  // 把当前流程置空
  procedure.value = '无';
  // 把当前选中的标签置空
  tag.value = '';
  currentLabel = null;
  relation.value = '';
  relationOperate.currentRelation = null;
  relationOperate.flag = false;
  // 中断划词流程
  carver.cancelSelect();
};

// 当前关系变化
const relationChange = (e) => {
  const {children, label: title, pid, value: id} = e;
  if (!children.length) {
    relationOperate.currentRelation = {id, pid, title};
  }
};
// 当选中的标签变化
const tagChange = (tag) => {
  const {children, label: title, pid, value: id} = tag;
  if (!children.length) {
    currentLabel = {id, pid, title};
  }
};
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
      e.stopPropagation()
      console.log(target, e, 'label');
      if (target.exData.indexOf('entity') > -1) {
        // 点击的是实体
        const page = pages[currentPage.value - 1];
        // 点击了添加关系
        if (relationOperate.flag) {
          carver.connect(target).then(({startLabel, endLabel}) => {
            const to = {
              id: Number(startLabel.exData.substr(7)),
              textContent: startLabel.textContent,
              start_offset: pageOffsetToGlobalOffset(startLabel.startIndex, page),
              end_offset: pageOffsetToGlobalOffset(startLabel.endIndex, page),
            };
            const from = {
              // 截取包含第七位之后的作为id
              id: Number(endLabel.exData.substr(7)),
              textContent: endLabel.textContent,
              start_offset: pageOffsetToGlobalOffset(endLabel.startIndex, page),
              end_offset: pageOffsetToGlobalOffset(endLabel.endIndex, page),
            };
            createEntityRelation(to, from);
          })
          return
        }
      } else if (target.exData.indexOf('time') > -1) {
        // 点击的是模块
      }
    }
}

// 分页数据处理
const handleCurrentChange = (e) => {
  loading.value = true;
  carver.text = pages[e-1].text;
  renderPageIsolationEntity();
  // 渲染划词的部分，需要等待渲染完之后把loading状态置为false
  Promise.all([renderPageModule(), renderPageEntitys(), renderPageEntityRelation()]).then(() => {
    loading.value = false;
  });
}

// 渲染子模块
const renderPageModule = () => {
  return new Promise((resolve, reject) => {
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
    carver.addLabel(marks).then(() => {
      resolve('pageModule, ok');
    }).catch((err) => {
      reject(err);
    });
  });
}

// 渲染实体
const renderPageEntitys = (alone) => {
  return new Promise((resolve, reject) => {
    const page = pages[currentPage.value - 1];
    const contentStartOffset = pages[currentPage.value - 1].startOffset;
    const contentEndOffset = pages[currentPage.value - 1].endOffset;
    const handleArr = alone || entitys;

    const marks = handleArr.filter(entity => {
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
    carver.addLabel(marks).then(() => {
      resolve('pageMarks, ok');
    }).catch((err) => {
      reject(err);
    });
  });
}

// 渲染页面关系
const renderPageEntityRelation = () => {
  return new Promise((reslove, reject) => {
    const page = pages[currentPage.value - 1];
    const contentStartOffset = page.startOffset;
    const contentEndOffset = page.endOffset;
    const promiseArr = [];

    entityRelations.filter(item => {
        return item.from.startOffset >= contentStartOffset && item.from.endOffset <= contentEndOffset
    }).forEach(item => {
      promiseArr.push(renderEntityRelation(item.id, item.fromId, item.toId, item.relationVo.title));
    })
    Promise.all(promiseArr).then(() => {
      reslove();
    }).catch(() => {
      reject();
    });
  });
}
// 渲染右侧实体部分
const renderPageIsolationEntity = () => {
  const contentStartOffset = pages[currentPage.value - 1].startOffset;
  const contentEndOffset = pages[currentPage.value - 1].endOffset;
  entityIsolationData.length = 0;
  const isolationEntitys = entityIsolationDataAll.filter(item => {
    return item.startOffset >= contentStartOffset && item.endOffset <= contentEndOffset
  })
  // 这里要处理一下isolationEntitys这些实体数据才能显示出来，要分一下类，用labels来做主键
  entityIsolationData.push(...entitysToLabels(isolationEntitys));
  collapseArr.value.length = 0;
  collapseArr.value = entityIsolationData.map(item => item[0]);
}
// 右侧实体部分删除
const handleDeleteEntity = (entity) => {
  console.log(entity, '删除entity');
}
// 点击标签开始批量划词
const startBatchCarver = (callback) => {
    carver.cancelSelect()
    carver.select(true, e => {
        console.log(e)
        if (e.text !== '') {
            callback(e)
        }
    }).catch(e => {
        console.log(e)
    })
}
// 创建实体
const createEntity = (scribble) => {
  const page = pages[currentPage.value - 1];
  const globalStartOffset = pageOffsetToGlobalOffset(scribble.fromIndex, page);
  const globalEndOffset = pageOffsetToGlobalOffset(scribble.toIndex, page);
  const param = {
      text: scribble.text,
      startOffset: globalStartOffset,
      endOffset: globalEndOffset,
      labelId: scribble.labels[0].id,
      mrId,
  }
  return apis.addEntity(param).then(({data: backEntity}) => {
      // const backEntity = data.entity;
      // backEntity.labels = scribble.labels;
      entitys.push(backEntity);
      renderPageEntitys([backEntity])
      entityIsolationList();
      return backEntity;
  }).catch (error => {
      console.log('创建实体失败：', error)
      //取消本次划取
      carver.revoke()
  })
}

// 创建关系
const createEntityRelation = (to, from) => {
  loading.value = true;
  const param = {
      fromId: from.id,
      toId: to.id,
      relationId: relationOperate.currentRelation.id,
      mrId,
  }
  return apis.addEntityRelation(param).then(({data: relation}) => {
    entityRelations.push(relation);
    entityIsolationList();
    entityStructure();

    renderEntityRelation(relation.id, relation.fromId, relation.toId, relation.relationVo.title).then(() => {
      loading.value = false;
    });
    return relation;
  }).catch (() => {
  })
}

// 渲染关系
const renderEntityRelation = (entityRelationId, fromEntityId, toEntityId, title) => {
  return carver.addPathByExData([
      {
          textContent: title,
          startLabelExData: 'entity_' + fromEntityId,
          endLabelExData: 'entity_' + toEntityId,
          exData: entityRelationId,
          style: {
              borderColor: 'red',
          },
      }
  ]);
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

<template>
    <div class="clickMenu" v-loading="loading">
        <div class="clickMenu-header">
          <span>{{ title }}</span>
          <div class="flex-item-1"></div>
          <colorType/>
          <span class="separator">|</span>
          <el-button :type="carverBtn ? 'danger' : 'primary'" plain @click="handleTransfer">{{ `${carverBtn ? '结束' : '开始'}划词` }}</el-button>
          <el-button :type="connectBtn ? 'danger' : 'primary'" plain @click="handleConnect">{{ `${connectBtn ? '结束' : '开始'}连线` }}</el-button>
        </div>
        <div class="clickMenu-content" id="carver" ref="carverPanel"></div>
        <div class="clickMenu-bottom">
          <el-pagination background layout="prev, pager, next" v-model:current-page="currentPage" :page-count="pageCount" @current-change="handleCurrentChange"/>
        </div>
        <!-- 划词右键菜单 -->
        <contextMenu
            ref="contextRef"
            v-bind="contextProps"
            v-model:show="contextShow"
            @mapping="handleTransferMap"
            @delete="handleTransferDelete"
        />
        <!-- 划词左键菜单 -->
        <scribeMenu
            ref="scribeRef"
            v-bind="scribeProps"
            v-model:show="scribeShow"
            @change="scribeTransferChange"
        />
        <!-- 映射弹框 -->
        <mapDialog v-model="visible" :entity="mapEntity" @commit="mapCommit"></mapDialog>
    </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import {useRoute} from 'vue-router';
import { Carver, globalOffsetToPageOffset, pageOffsetToGlobalOffset } from '@/utils';
import apis from '@/api';
import colorType from '@/components/colorType.vue';
import contextMenu from '@/components/contextMenu.vue';
import scribeMenu from '@/components/scribeMenu.vue';
import mapDialog from '../components/mapDialog.vue';
import { ElMessage } from 'element-plus';

// 全局loading
const loading = ref(true);

// 头部数据*****************
const title = ref('徐景全出院记录.dox');
// 为true代表在划词状态
const carverBtn = ref(false);
// 为true代表在连线状态
const connectBtn = ref(false);

// 中部数据*****************
const carverPanel = ref(null);
let carver = null;
// 文档id
const {query: {mrId}} = useRoute();
// 子模块数据
const moduleData = [];
// 实体数据
let entitys = [];
// 关系数据
let entityRelations = [];

// 底部数据*****************
// 分页数据
let pages = [];
// 当前页数据
const currentPage = ref(1);
// 总数
const pageCount = ref(6);

// 划词菜单
const contextRef = ref(null);
const contextShow = ref(false);
const contextProps = reactive({
  event: {},
  el: carverPanel,
  target: null,
  type: 'label'
});

const scribeRef = ref(null);
const scribeShow = ref(false);
const scribeProps = reactive({
  event: {},
  el: carverPanel,
  type: '',
  click: true,
  target: {},
});

const mousePosition  = {};

const visible = ref(false);
let mapEntity = reactive({});

onMounted(() => {
  initialize();
  getInitData();
  document.onclick = (e) => {
    e.stopPropagation();
    console.log(contextRef.value, '43333333');
    contextRef.value.onclick(e);
    scribeRef.value.onclick(e);
  }
  document.onkeydown = (e) => {
    scribeRef.value.onkeydown(e);
    ctrlZ(e);
  }
  // carverPanel.value.onscroll = (e) => {
  //   contextRef.value.onscroll(e);
  //   scribeRef.value.onscroll(e);
  // }
  // 处理carver插件删除时导致的height变化引起的scroll跳动问题
  handleScroll();
});

const handleScroll = () => {
  // 当前最靠近滚动容器上边缘的元素
  let targetEle = null;
  // 最上边元素和滚动容器上边缘的偏移大小
  let topPOffset = false;
  // 存储滚动时候最上边缘元素以及偏移大小
  const funStorePos = function () {
      var bounce = carverPanel.value.getBoundingClientRect();
      var pointX = bounce.left + carverPanel.value.clientWidth / 2;
      var pointY = bounce.top + 1;

      targetEle = document.elementsFromPoint(pointX, pointY)[0];

      if (targetEle == carverPanel.value) {
          topPOffset = false;
          return;
      }
      topPOffset = Math.round(targetEle.getBoundingClientRect().top - bounce.top);
  };

  // 滚动时候记录此时最上边缘元素
  carverPanel.value.addEventListener('scroll', (e) => {
    funStorePos();
    contextRef.value.onscroll(e);
    scribeRef.value.onscroll(e);
    carverBtn.value && carver.revoke();
  });

  // 尺寸变化时候实时修正滚动位置，使最上边缘元素永远在上边缘
  const mutationObserver = new MutationObserver(() => {
    if (topPOffset === false) {
        return;
    }

    var scrollTop = carverPanel.value.scrollTop;
    // 之前最靠近边缘元素当前的偏移等
    var currentTopPOffset = Math.round(carverPanel.value.getBoundingClientRect().top) - Math.round(targetEle.getBoundingClientRect().top);
    // 滚动修正
    carverPanel.value.scrollTop = scrollTop - currentTopPOffset - topPOffset;
  })

  mutationObserver.observe(carverPanel.value, {
    childList: true,
    subtree: true
  });
}

const initialize = () => {
  carver = new Carver({
    root: carverPanel.value,
    style: {
      // backgroundColor  背景颜色
      // mark  选中文字标记样式配置（highlightColor：文字标记颜色 string，opacity：文字标记透明度 number）
      // mark: {
      //     highlightColor: '#c8dffc',
      // },
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
  carver.onPathClick = (target, e) => {
    console.log(target, e, 'path');
    e.stopPropagation();
    scribeProps.type = 'path';
    scribeProps.event = e;
    scribeProps.target = target;
    scribeProps.click = true;
    contextShow.value = false;
    scribeShow.value = true;
  };
  carver.onPathMenuClick = (target, e) => {
    console.log(target, e, 'onPathMenuClick');
    contextProps.event = e;
    contextProps.target = target;
    contextProps.type = 'path';
    contextShow.value = true;
    scribeShow.value = false;
  };
  carver.onLabelClick = async (target, e) => {
    console.log(target, e, 'label');
    const { textContent } = target;
    if (textContent === '子模块') return;
    e.stopPropagation();
    if (connectBtn.value) {
      // 连线操作
      scribeProps.type = 'path';
    } else {
      // 点击label操作
      scribeProps.type = 'label';
    }
    scribeProps.event = e;
    scribeProps.target = target;
    scribeProps.click = true;
    contextShow.value = false;
    scribeShow.value = true;
  };
  carver.onLabelMenuClick = (target, e) => {
    console.log(target, e, 'onLabelMenuClick');
    const { exData, textContent } = target;
    if (textContent === '子模块') return;
    contextProps.event = e;
    contextProps.target = target;
    contextProps.type = 'label';
    contextShow.value = true;
    scribeShow.value = false;
    mapEntity.label = textContent;
    mapEntity.id = Number(exData.substr(7));
  };

  document.onmousemove = ({clientX, clientY}) => {
      mousePosition.clientX = clientX;
      mousePosition.clientY = clientY;
      // console.log(mousePosition);
  };
}
// 划词获取数据方法 &&&&&&&&&&&&&&&&&&&
const getInitData = () => {
  Promise.all([getPages(), moduleList(), entityList(), entityRelationList()]).then(() => {
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
// 划词操作方法 &&&&&&&&&&&&&&&&&&&
const handleTransfer = () => {
  if(carverBtn.value) {
    // 结束划词操作
    carver.cancelSelect();
    scribeShow.value = false;
    scribeRef.value.reset();
  } else {
    // 开启划词操作
    carver.select(true, e => {
        if (e.text !== '') {
            // callback(e)
            console.log(e, 123);
            const {clientX, clientY} = mousePosition;
            scribeProps.event.clientX = clientX;
            scribeProps.event.clientY = clientY;
            scribeProps.target = e;
            scribeProps.click = false;
            scribeProps.type = 'label';
            contextShow.value = false;
            scribeShow.value = true;
        }
    }).catch(() => {
    });
  }
  carverBtn.value = !carverBtn.value;
}

const handleConnect = () => {
  if(connectBtn.value) {
    // 结束连线操作
    carver.cancelConnect();
    // 关闭菜单
    scribeShow.value = false;
  } else {
    // 开启连线操作
  }
  connectBtn.value = !connectBtn.value;
}

const handleCurrentChange = (e) => {
  loading.value = true;
  setTimeout(() => {
    carver.text = pages[e-1].text;
    // renderPageIsolationEntity();
    // 渲染划词的部分，需要等待渲染完之后把loading状态置为false
    Promise.all([renderPageModule(), renderPageEntitys(), renderPageEntityRelation()]).then(() => {
      loading.value = false;
    });
  }, 200);
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
  apis.addEntity(param).then(({data: backEntity}) => {
    // promise实例的then方法也是返回的一个promise实例，需要用then方法才能接到
      entitys.push(backEntity);
      renderPageEntitys([backEntity])
  }).catch (error => {
      console.log('创建实体失败：', error)
      //取消本次划取
      carver.revoke();
  })
}

// 处理缓存中的实体
const editEntityInCache = (entityId, labels) => {
  const entity = entitys.filter(item => item.id === entityId)[0];
  entity.labels = labels;
}
// 删除实体
const deleteEntityById = (entityId) => {
  // 1、删除缓存里面的实体
  entitys = entitys.filter((entity) => {
    return entity.id !== entityId;
  });
  // 2、删除实体相关的关系
  entityRelations = entityRelations.filter(item => {
    return !(item.fromId === entityId || item.toId === entityId);
  })
  // 3、删除页面上的实体
  carver.removeLabelByExData('entity_' + entityId);
  // 4、接口删除实体
  apis.deleteEntity({}, {}, {dynamicSegment: {entityId}});
}

// 创建关系
const createEntityRelation = (fromId, toId, relationId) => {
  const param = { fromId, toId, relationId, mrId };
  apis.addEntityRelation(param).then(({data: relation, data: {id, fromId, toId, relationVo: {title}}}) => {
    entityRelations.push(relation);
    renderEntityRelation(id, fromId, toId, title);
    return relation;
  }).catch (() => {
  })
}

// 处理缓存中的关系
const editRelationInCache = (id, relationId, title) => {
  const relation = entityRelations.filter(item => item.id === id)[0];
  relation.relationId = relationId;
  relation.relationVo.id = relationId;
  relation.relationVo.title = title;
}

// 删除关系
const deleteEntityRelation = (entityRelationId) => {
  apis.deleteEntityRelation({}, {}, {dynamicSegment: {entityRelationId}});
  entityRelations = entityRelations.filter(item => {
    return !item.relationId === entityRelationId;
  })
  carver.removePathByExData(entityRelationId);
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


// 右键菜单事件
const handleTransferMap = (e) => {
    console.log(e);
    visible.value = true;
}

const handleTransferDelete = (e) => {
    console.log(e);
    const { target: { exData } } = e;
    if(contextProps.type === 'label') {
      const id = Number(exData.substr(7));
      deleteEntityById(id);
    } else {
      deleteEntityRelation(exData);
    }
}


// 实体左键菜单事件
const scribeTransferChange = (e) => {
  if(scribeProps.type === 'label') {
    // 修改标签
    if (scribeProps.click) {
      const {exData, id, labels:[{id: labelId, title}], labels} = e;
      // 实体
      if (exData.indexOf('entity') > -1) {
        const entityId = Number(exData.substr(7));
        // 先删除后新增
        console.log(e, '看看效果');
        // 发起更新请求
        apis.editEntity({id: entityId, labelId});
        // 处理缓存数据
        editEntityInCache(entityId, labels);
        // 调用工具修改标签
        carver.editLabel({ id }, title);
      }
    } else {
      // 新增标签
      createEntity(e);
    }
  } else {
    // 添加连线
    if (connectBtn.value) {
      const {labels: [{ id: relationId }]} = e;
      carver.connect(scribeProps.target).then(({startLabel, endLabel}) => {
        const { textContent } = endLabel;
        if (textContent === '子模块') return;
        const fromId = Number(startLabel.exData.substr(7)),
        toId = Number(endLabel.exData.substr(7));
        createEntityRelation(fromId, toId, relationId);
      }).catch(() => {
        console.log('连线被关闭');
      });
    } else {
      // 修改连线
      console.log('修改连线', e);
      // updateEntityRelation  id relationId
      const { exData: id, labels: [{ id: relationId, title }]} = e;
      // 发起更新请求
      apis.updateEntityRelation({id, relationId});
      // 处理缓存数据
      editRelationInCache(id, relationId, title);
      // 调用工具修改path
      carver.editPathByExData(id, title, { borderColor: 'red' });
    }
  }
}
// 实体映射操作
const mapCommit = async (e) => {
  console.log(e);
  await apis.buildEntityMap({mrId, ...e});
  ElMessage({
    message: '建立映射成功',
    type: 'success',
  })
}
const ctrlZ = (e) => {
  if (e.ctrlKey == true && e.keyCode == 90) {//Ctrl+S
    if (carverBtn.value | connectBtn.value) {
      scribeShow.value = false;
      carver.revoke();
    }
  }
}
</script>

<style lang="scss" scoped>
.clickMenu {
    width: 100%;
    height: 100%;
    &-header {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        padding: 0 37px;
        height: 64px;
        background-color: #cccaca91;
        box-shadow: 0 2px 4px -1px rgb(0 0 0 / 20%), 0 4px 5px 0 rgb(0 0 0 / 14%), 0 1px 10px 0 rgb(0 0 0 / 12%);
    }
    &-content {
        height: calc(100% - 128px);
        // position:fixed;
        // z-index:5;
    }
    &-bottom {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 0 37px;
      height: 64px;
      background-color: #cccaca91;
      box-shadow: 0 2px 4px -1px rgb(0 0 0 / 20%), 0 4px 5px 0 rgb(0 0 0 / 14%), 0 1px 10px 0 rgb(0 0 0 / 12%);
    }
}

.flex-item-1 {
  flex: 1;
}

.separator {
  color: #b1b1b1;
  margin-right: 20px;
}
</style>

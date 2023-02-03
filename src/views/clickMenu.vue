<template>
    <div class="clickMenu" v-loading="loading">
        <div class="clickMenu-header">
          <span>{{ title }}</span>
          <div class="flex-item-1"></div>
          <colorType/>
          <span class="separator">|</span>
          <el-button :type="carverBtn ? 'danger' : 'primary'" plain @click="handleTransfer">{{ `${carverBtn ? '结束' : '开始'}划词` }}</el-button>
        </div>
        <div class="clickMenu-content" id="carver" ref="carverPanel"></div>
        <div class="clickMenu-bottom">
          <el-pagination background layout="prev, pager, next" v-model:current-page="currentPage" :page-count="pageCount" @current-change="handleCurrentChange"/>
        </div>
        <contextMenu
            ref="contextRef"
            v-bind="contextMenuProps"
            v-model:show="contextMenuShow"
            @edit="handleEdit"
            @copy="handleCopy"
            @delete="handleDelete"
        />
        <scribeMenu
            ref="scribeRef"
            v-bind="scribeMenuProps"
            v-model:show="scribeMenuShow"
            @change="scribeChange"
        />
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

// 全局loading
const loading = ref(true);

// 头部数据*****************
const title = ref('徐景全出院记录.dox');
// 为true代表在划词状态
const carverBtn = ref(false);

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

const contextRef = ref(null);
const contextMenuShow = ref(false);
const contextMenuProps = reactive({
  top: 0,
  left: 0,
  el: carverPanel,
  target: null,
  type: 'label'
});

const scribeRef = ref(null);
const scribeMenuShow = ref(false);
const scribeMenuProps = reactive({
  event: {},
  el: carverPanel,
  title: '实体名称',
  label: '',
  click: true,
  options: [],
  target: {},
});

const mousePosition  = {};


onMounted(() => {
  initialize();
  getInitData();
  document.onclick = (e) => {
    console.log(contextRef.value, '43333333');
    contextRef.value.onclick(e);
    scribeRef.value.onclick(e);
  }
  document.onkeydown = (e) => {
    scribeRef.value.onkeydown(e);
  }
  carverPanel.value.onscroll = (e) => {
    contextRef.value.onscroll(e);
    scribeRef.value.onscroll(e);
  }
});

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
  };
  carver.onPathMenuClick = (target, e) => {
      console.log(target, e, 'onPathMenuClick');
      contextMenuProps.top = e.clientY - 10;
      contextMenuProps.left = e.clientX + 30;
      contextMenuProps.target = target;
      contextMenuProps.type = 'path';
      contextMenuShow.value = true;
      scribeMenuShow.value = false;
  };
  carver.onLabelClick = async (target, e) => {
    e.stopPropagation()
    console.log(target, e, 'label');
    scribeMenuProps.event = e;
    scribeMenuProps.target = target;
    scribeMenuProps.click = true;
    contextMenuShow.value = false;
    scribeMenuShow.value = true;
  };
  carver.onLabelMenuClick = (target, e) => {
    console.log(target, e, 'onLabelMenuClick');
    contextMenuProps.top = e.clientY - 10;
    contextMenuProps.left = e.clientX + 30;
    contextMenuProps.target = target;
    contextMenuProps.type = 'label';
    contextMenuShow.value = true;
    scribeMenuShow.value = false;
  };

  // carver.select(true, e => {
  //     if (e.text !== '') {
  //         // callback(e)
  //         const {clientX, clientY} = mousePosition;
  //         scribeMenuProps.event.clientX = clientX;
  //         scribeMenuProps.event.clientY = clientY;
  //         scribeMenuProps.type = 'label';
  //         scribeMenuProps.click = false;
  //         contextMenuShow.value = false;
  //         scribeMenuShow.value = true;
  //         console.log(scribeMenuProps, e, '333');
  //         setTimeout(() => {
  //             scribeMenuProps.click = true;
  //         }, 0);
  //     }
  //     // carver.cancelSelect();
  // }).catch(() => {
  // });
  document.onmousemove = ({clientX, clientY}) => {
      mousePosition.clientX = clientX;
      mousePosition.clientY = clientY;
      // console.log(mousePosition);
  };
}
// 划词获取数据方法 &&&&&&&&&&&&&&&&&&&
const getInitData = () => {
  Promise.all([getPages(), moduleList(), entityList(), entityRelationList(), labelCombo()]).then(() => {
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
// 获取标签
const labelCombo = () => {
  return new Promise((resolve, reject) => {
    apis.labelComboBox().then(({data}) => {
      scribeMenuProps.options.push(...data);
      resolve('labelComboBox ok');
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
  } else {
    // 开启划词操作
    carver.select(true, e => {
        if (e.text !== '') {
            // callback(e)
            const {clientX, clientY} = mousePosition;
            scribeMenuProps.event.clientX = clientX;
            scribeMenuProps.event.clientY = clientY;
            scribeMenuProps.target = e;
            scribeMenuProps.click = false;
            contextMenuShow.value = false;
            scribeMenuShow.value = true;
            setTimeout(() => {
                scribeMenuProps.click = true;
            }, 0);
        }
    }).catch(() => {
    });
  }
  carverBtn.value = !carverBtn.value;
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
  loading.value = true;
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
  console.log(new Date(), '开始新建实体');
  apis.addEntity(param).then(({data: backEntity}) => {
    // promise实例的then方法也是返回的一个promise实例，需要用then方法才能接到
      entitys.push(backEntity);
      Promise.all([renderPageEntitys([backEntity])]).then(() => {
        loading.value = false;
        console.log(new Date(), '新建实体结束');
      });
  }).catch (error => {
      console.log('创建实体失败：', error)
      //取消本次划取
      carver.revoke();
  })
}

// 编辑实体
const editEntity = (params) => {
  apis.editEntity(params);
}
// 处理缓存中的实体
const editEntityInCache = (entityId, labels) => {
  const entity = entitys.filter(item => item.id === entityId)[0];
  entity.labels = labels;
}
// 删除实体
// const deleteEntityById = (entityId) => {
//   loading.value = true;
//   apis.deleteEntity({}, {}, {dynamicSegment: {entityId}}).then(() => {
//     // 1、删除缓存里面的实体
//     entitys = entitys.filter((entity) => {
//       return entity.id !== entityId;
//     });
//     // 2、删除实体相关的关系
//     entityRelations = entityRelations.filter(item => {
//       return !(item.fromId === entityId || item.toId === entityId);
//     })
//     // 删除完之后的操作
//     Promise.all([entityIsolationList(), entityStructure()]).then(() => {
//       removeMarkById(entityId);
//       loading.value = false;
//       ElMessage({ type: 'success', message: '删除实体成功',});
//     });
//   }).catch (error => {
//       console.log('删除实体失败：', error)
//   })
// }

// 创建关系
// const createEntityRelation = (to, from) => {
//   loading.value = true;
//   const param = {
//       fromId: from.id,
//       toId: to.id,
//       relationId: relationOperate.currentRelation.id,
//       mrId,
//   }
//   apis.addEntityRelation(param).then(({data: relation}) => {
//     entityRelations.push(relation);
//     // 接口返回之后的操作
//     Promise.all([entityIsolationList(), entityStructure(), renderEntityRelation(relation.id, relation.fromId, relation.toId, relation.relationVo.title)]).then(() => {
//       loading.value = false;
//     });
//     return relation;
//   }).catch (() => {
//   })
// }

// 删除关系
// const deleteEntityRelation = (entityRelationId) => {
//   loading.value = true;
//   apis.deleteEntityRelation({}, {}, {dynamicSegment: {entityRelationId}}).then(() => {
//     entityRelations = entityRelations.filter(item => {
//       return !item.relationId === entityRelationId;
//     })
//     Promise.all([entityIsolationList(), entityStructure()]).then(() => {
//       console.log(new Date(), '开始删除关系', entityRelationId);
//       carver.removePathByExData(entityRelationId).then(() => {
//         console.log(new Date(), '删除关系结束');
//       });
//       loading.value = false;
//       ElMessage({ type: 'success', message: '删除关系成功',});
//     });
//   }).catch (error => {
//       console.log('删除实体关系组失败：', error);
//   })
// }

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

// 删除划词区实体
// const removeMarkById = (entityId) => {
//   console.log(new Date(), '开始删除实体');
//   carver.removeLabelByExData('entity_' + entityId).then(() => {
//     console.log(new Date(), '删除实体结束');
//   });
//   //实体当前实体是高亮的，就要重置
//   if (currentClickEntityId.value == entityId) {
//     currentClickEntityId.value = 0;
//   }
// }


// 右键菜单事件
const handleEdit = (e) => {
    console.log(e);
}

const handleCopy = (e) => {
    console.log(e);
}

const handleDelete = (e) => {
    console.log(e);
}


// 左键菜单事件
const scribeChange = (e) => {
  if (scribeMenuProps.click) {
    // 更换标签
    const {exData, id, labels:[{id: labelId, title}], labels} = e;
    // 实体
    if (exData.indexOf('entity') > -1) {
      const entityId = Number(exData.substr(7));
      // 先删除后新增
      console.log(e, '看看效果');
      // 发起更新请求
      editEntity({id: entityId, labelId});
      // 处理缓存数据
      editEntityInCache(entityId, labels);
      // 调用工具修改标签
      carver.editLabel({ id }, title);
    }
  } else {
    // 新增标签
    createEntity(e);
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

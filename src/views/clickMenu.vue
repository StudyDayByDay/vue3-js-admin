<template>
    <div class="clickMenu" v-loading="loading">
        <div class="clickMenu-header">
          <span>{{ title }}</span>
          <div class="flex-item-1"></div>
          <colorType/>
          <span class="separator">|</span>
          <el-button :type="carverBtn ? 'danger' : 'primary'" plain @click="handleTransfer">{{ `${carverBtn ? '结束' : '开始'}${scribeCopy ? '复制' : '划词'}` }}</el-button>
          <el-button :type="connectBtn ? 'danger' : 'primary'" plain @click="handleConnect">{{ `${connectBtn ? '结束' : '开始'}连线` }}</el-button>
        </div>
        <div class="clickMenu-content" id="carver" ref="carverPanel"></div>
        <div class="clickMenu-bottom">
          <el-pagination background layout="prev, pager, next" v-model:current-page="currentPage" :page-count="pageCount" :disabled="carverBtn || connectBtn" @current-change="handleCurrentChange"/>
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
            v-model:copy="scribeCopy"
            @change="scribeTransferChange"
        />
        <!-- 映射弹框 -->
        <mapDialog v-model="visible" :entity="mapEntity" @commit="mapCommit"></mapDialog>
        <!-- 复制弹框 -->
        <copyDialog v-model="copyVisible" v-bind="copyShowData" @commit="copyCommit" @cancel="copyCancel"></copyDialog>
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
import copyDialog from '../components/copyDialog.vue';
import { ElMessage } from 'element-plus';

// 全局loading
const loading = ref(true);

// 头部数据*****************
const title = ref('徐景全出院记录.dox（测试版写死的标题）');
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
// 复制模版数据
let copyTemplate = {
  text: '',
  entitys: []
};
// 复制参数数据
const copyParams = {
  mrEntityRequestList: [],
  mrEntityRelationRequestList: [],
  mrId
};

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
const scribeCopy = ref(false);
const scribeProps = reactive({
  clientX: 0,
  clientY: 0,
  el: carverPanel,
  type: '',
  click: true,
  target: {},
  copyShow: false,
});

const mousePosition  = {};

// 映射弹框
const visible = ref(false);
let mapEntity = reactive({});

// 复制弹框
const copyVisible = ref(false);
const copyShowData = reactive({
  templateText: '',
  scribbleText: '',
  entitys: [],
  relations: []
});


onMounted(() => {
  // 初始化划词工具
  initialize();
  // 初始化接口数据
  getInitData();
  // 监听点击事件
  document.onclick = (e) => {
    e.stopPropagation();
    console.log(contextRef.value, '43333333');
    contextRef.value.onclick(e);
    scribeRef.value.onclick(e);
  }
  // 监听按键事件
  document.onkeydown = (e) => {
    scribeRef.value.onkeydown(e);
    ctrlZ(e);
  }
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
    // 返回一个DOMRect对象，其提供了元素的大小及其相对于视口的位置
      var bounce = carverPanel.value.getBoundingClientRect();
      var pointX = bounce.left + carverPanel.value.clientWidth / 2;
      var pointY = bounce.top + 1;
      // 该函数返还在特定坐标点下的 HTML 元素数组。
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
    scribeProps.clientX = e.clientX;
    scribeProps.clientY = e.clientY;
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
    scribeProps.clientX = e.clientX;
    scribeProps.clientY = e.clientY;
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
// 复制确认
const copyCommit = async () => {
  const {data: {entityRelationVoList, mrEntityVoList}} = await apis.copy(copyParams);
  // 进行渲染
  renderPageEntitys(mrEntityVoList);
  renderPageEntityRelation(entityRelationVoList);
  // 将数据分辨存入实体集合和关系集合
  entitys = entitys.concat(mrEntityVoList);
  entityRelations = entityRelations.concat(entityRelationVoList);
  carver.revoke();
};
// 复制取消
const copyCancel = () => {
  carver.revoke();
};
// 复制计算
const handleCopy = (scribble) => {
  console.log('复制操作');
  //模板实体
  let entitysInTemplate = copyTemplate.entitys,
  // 模版文本
  templateText = copyTemplate.text,
  // 划词的文本
  scribbleText = scribble.text;
  const page = pages[currentPage.value - 1];
  // 划词的开始位置
  const scribbleStart = pageOffsetToGlobalOffset(scribble.fromIndex, page);
  // 划词的结束位置
  const scribbleEnd = pageOffsetToGlobalOffset(scribble.toIndex, page);
  //排序
  entitysInTemplate.sort((a, b) => {
      if (a.startOffset == b.startOffset) {
          return a.id - b.id
      }
      return a.startOffset - b.startOffset
  })

  //是否有关系（这里指的是模版实体当中是否有连线，仅考虑连线在这些实体之中，意思是连线的开头和结尾都在实体里面，也就是是一根完整的线。类似于交集的感觉）
  const hasRelation = entityRelations.some(entityRelation => {
      let findFrom = false, findTo = false
      for (let i = 0; i < entitysInTemplate.length; i++) {
          if (!findFrom && entityRelation.fromId == entitysInTemplate[i].id) {
              findFrom = true
          }

          if (!findTo && entityRelation.toId == entitysInTemplate[i].id) {
              findTo = true
          }
          if (findFrom && findTo) {
              return true
          }
      }
      return false
  })

  let newEntitys = [],  //复制识别到的实体
      newEntityRelations = [],//复制识别到的实体关系
      offset = 0;

  switch (entitysInTemplate.length) {
      case 1:
          /**
            * 形如 xxa、b、c，已知划取了实体a（不包含xx,xx指任意字符）
            * 并选择了xxa作为模板，然后划取a、b、c复制
            * 以标点符号进行拆分b和c，注意不拆分括号中的标点
            *  (?<![（(][^）)]*)[,，、; ](?![^（(]*）\))/
            */
          scribbleText.split(/(?<![（(][^）)]*)[,，、; ](?![^（(]*）\))/).forEach(item => {
              // 代表划词有选中了文本
              if (item.length > 0) {
                  newEntitys.push({
                      id: Math.floor(Math.random()*(99999999-999999+1))+999999,
                      text: item,
                      startOffset: scribbleStart + offset,
                      endOffset: scribbleStart + offset + item.length - 1,
                      labelId: entitysInTemplate[0].labels[0].id,
                      labelText: entitysInTemplate[0].labels[0].title,
                      mrId
                  })
              }

              offset += item.length + 1
          })

          //如果第一个实体和复制的模板相同，就丢掉
          //比如复制实体a，然后划取了a、b、c
          if (newEntitys.length > 0 && newEntitys[0].text == templateText) {
              newEntitys.shift()
          }
          break
      case 2:
          //形如ab、ac、ad，以ab为模板复制
          // eslint-disable-next-line no-case-declarations
          let start = scribbleText.indexOf(entitysInTemplate[0].text, -1);
          // 新划词的部分包含模版的第一个实体内容并且两个实体是先后连接关系
          if (start > -1 && parseInt(entitysInTemplate[0].endOffset) + 1 == entitysInTemplate[1].startOffset) {
              const entity1 = {
                  id: Math.floor(Math.random()*(99999999-999999+1))+999999,
                  text: entitysInTemplate[0].text,
                  startOffset: parseInt(scribbleStart) + start,
                  endOffset: parseInt(scribbleStart) + start + entitysInTemplate[0].text.length - 1,
                  labelId: entitysInTemplate[0].labels[0].id,
                  labelText: entitysInTemplate[0].labels[0].title,
                  mrId
              }

              const entity2Text = scribbleText.substr(entitysInTemplate[0].text.length)
              const entity2 = {
                  id: Math.floor(Math.random()*(99999999-999999+1))+999999,
                  text: entity2Text,
                  startOffset: parseInt(scribbleStart) + start + entitysInTemplate[0].text.length,
                  endOffset: parseInt(scribbleStart) + start + entitysInTemplate[0].text.length + entity2Text.length - 1,
                  labelId: entitysInTemplate[1].labels[0].id,
                  labelText: entitysInTemplate[1].labels[0].title,
                  mrId
              }

              newEntitys.push(entity1, entity2);
          } else {
              // 两个不是挨着的情况
              //如果第二个实体是“+”或者“-”，则以“+”或者“-”号分割，注意这里加减号认为是一样的
              if (entitysInTemplate[1].text === '+' || entitysInTemplate[1].text === '-') {
                  let index = scribbleText.indexOf('+', -1)
                  if (index === -1) {
                      index = scribbleText.indexOf('-', -1)
                  }

                  if (index > -1) {
                      const entity1Text = scribbleText.substr(0, index)
                      const entity1 = {
                          id: Math.floor(Math.random()*(99999999-999999+1))+999999,
                          text: entity1Text,
                          startOffset: parseInt(scribbleStart),
                          endOffset: parseInt(scribbleStart) + index - 1,
                          labelId: entitysInTemplate[0].labels[0].id,
                          labelText: entitysInTemplate[0].labels[0].title,
                          mrId
                      }

                      const entity2Text = scribbleText.substr(index)
                      const entity2 = {
                          id: Math.floor(Math.random()*(99999999-999999+1))+999999,
                          text: entity2Text,
                          startOffset: parseInt(scribbleStart) + index,
                          endOffset: parseInt(scribbleEnd),
                          labelId: entitysInTemplate[1].labels[0].id,
                          labelText: entitysInTemplate[1].labels[0].title,
                          mrId
                      }

                      newEntitys.push(entity1, entity2)
                  }
              } else {
                  // 第二个实体不是“+”或者“-”的情况
                  //无法以加减号区分，则以括号分割
                  if (/^(.*)[(（].*[)）]$/.test(entitysInTemplate[1].text)) {
                      const matches = /^(.*)([(（].*[)）])$/.exec(scribble.text)
                      if (matches) {
                          const entity1Text = matches[1],
                              entity2Text = matches[2]

                          const entity1 = {
                              id: Math.floor(Math.random()*(99999999-999999+1))+999999,
                              text: entity1Text,
                              startOffset: parseInt(scribbleStart),
                              endOffset: parseInt(scribbleStart) + entity1Text.length - 1,
                              labelId: entitysInTemplate[0].labels[0].id,
                              labelText: entitysInTemplate[0].labels[0].title,
                              mrId
                          }

                          const entity2 = {
                              id: Math.floor(Math.random()*(99999999-999999+1))+999999,
                              text: entity2Text,
                              startOffset: parseInt(scribbleStart) + entity1Text.length,
                              endOffset: parseInt(scribbleEnd),
                              labelId: entitysInTemplate[1].labels[0].id,
                              labelText: entitysInTemplate[1].labels[0].title,
                              mrId
                          }

                          newEntitys.push(entity1, entity2)
                      }
                  }

              }
          }
          // 为什么写在这里
          if (newEntitys.length == 2) {
              //如果ab建立了关系
              if (hasRelation) {
                  let reationId = 0
                  // 遍历关系数组
                  for (let i = 0; i < entityRelations.length; i++) {
                      const entityRelation = entityRelations[i]
                      //关系有正向、反向
                      if (entityRelation.fromId == entitysInTemplate[0].id && entityRelation.toId == entitysInTemplate[1].id) {
                          reationId = entityRelation.relationId
                          //from、to表示识别到的实体数组的下表索引
                          newEntityRelations.push({
                              from: 0,
                              to: 1,
                              relationId: reationId,
                              relationText: entityRelation.relationVo.title
                          })
                          break
                      }

                      if (entityRelation.fromId == entitysInTemplate[1].id && entityRelation.toId == entitysInTemplate[0].id) {
                          reationId = entityRelation.relationId
                          newEntityRelations.push({
                              from: 1,
                              to: 0,
                              relationId: reationId,
                              relationText: entityRelation.relationVo.title
                          })
                          break
                      }
                  }
              }
              break
          } else {
              newEntitys = []
          }
          break;

      default:
          /**
            * 注意注意注意：如果不满足case 2的格式，会尝试执行default
            * 1.以实体之间的分割符去拆分。形如：美罗华、600mg、d0，分别建立了3个实体，并创建了关系，
            * 此时以美罗华、600mg、d0作为模板去寻找xxx、xxx、xxx，并创建实体与关系
            *
            * 2.第一种情况不满足，则尝试正则匹配，
            */


          // eslint-disable-next-line no-case-declarations
          const lasttry = function (entitysInTemplate, scribble) {
              let entitysInScribble = []
              let scribbleText = scribble.text
              let offset = 0
              entitysInTemplate.forEach(entity => {
                  // 匹配实体的text里是否有中文
                  if (/^[\u4e00-\u9fa5]+$/.test(entity.text)) {
                      // 划取的部分是否有中文
                      const result = /^[\u4e00-\u9fa5]+/.exec(scribbleText);
                      if (result && result.length > 0) {
                          const start = scribbleText.indexOf(result[0]);
                          entitysInScribble.push({
                              text: result[0],
                              startOffset: scribbleStart + offset + start,
                              endOffset: scribbleStart + offset + start + result[0].length - 1,
                              labelId: entity.labels[0].id,
                          });
                          scribbleText = scribbleText.substr(start + result[0].length);
                          offset += start + result[0].length;
                      }
                  } else {
                      const result = /[\w-()（）+-]+/.exec(scribbleText);
                      if (result && result.length > 0) {
                          const start = scribbleText.indexOf(result[0]);
                          entitysInScribble.push({
                              text: result[0],
                              startOffset: scribbleStart + offset + start,
                              endOffset: scribbleStart + offset + start + result[0].length - 1,
                              labelId: entity.labels[0].id,
                          });
                          scribbleText = scribbleText.substr(start + result[0].length);
                          offset += start + result[0].length;
                      }
                  }
              })
              return entitysInScribble
          }

          // eslint-disable-next-line no-case-declarations
          let wrong = false
          // eslint-disable-next-line no-case-declarations
          let seperators = []
          // 把第一次模版中实体之间的内容当做分隔符
          entitysInTemplate.forEach(entity => {
              let start = templateText.indexOf(entity.text)

              const seperator = templateText.substr(offset, start - offset)
              // 偏移量
              offset = start + entity.text.length
              // 识别到seperator有值就放进去
              if (seperator.length > 0) {
                  seperators.push(seperator)
              }
          })


          //当实体之间没有分隔符的时候(紧挨着)，两者不等，这种情况无法复制
          // 写得太烂了，只有一种情况能够走通，就是左右实体的两边都贴着边，还有其他的三种没贴边的情况都被毙掉了，有待商榷
          if (seperators.length + 1 != entitysInTemplate.length) {
              wrong = true
          }

          // 分隔符偏移量
          // eslint-disable-next-line no-case-declarations
          let seperatorOffset = 0
          for (let i = 0; !wrong && i < seperators.length; i++) {
              let index = scribbleText.indexOf(seperators[i], seperatorOffset)
              //没有对应的分隔符
              if (index == -1) {
                  wrong = true
                  break
              }

              //以分隔符去寻找实体
              const text = scribbleText.substr(seperatorOffset, index - seperatorOffset)
              newEntitys.push({
                  id: Math.floor(Math.random()*(99999999-999999+1))+999999,
                  text: text,
                  startOffset: parseInt(scribbleStart) + seperatorOffset,
                  endOffset: parseInt(scribbleStart) + seperatorOffset + text.length - 1,
                  labelId: entitysInTemplate[i].labels[0].id,
                  labelText: entitysInTemplate[i].labels[0].title,
                  mrId
              })

              // TODO：这里有问题
              // 这里不该是index + 1， 应该是index + seperators[i].length - 1，这里-1还是不减要实际处理一下才知道
              seperatorOffset = index + 1
          }
          // 假如顺利走完了
          if (!wrong) {
              //实体会比分隔符多一个，所以这里要再添加一个实体
              const last = scribbleText.substr(seperatorOffset)
              newEntitys.push({
                  id: Math.floor(Math.random()*(99999999-999999+1))+999999,
                  text: last,
                  startOffset: parseInt(scribbleStart) + seperatorOffset,
                  endOffset: parseInt(scribbleStart) + seperatorOffset + last.length - 1,
                  labelId: entitysInTemplate[entitysInTemplate.length - 1].labels[0].id,
                  labelText: entitysInTemplate[entitysInTemplate.length - 1].labels[0].title,
                  mrId
              })
          } else {
              newEntitys = lasttry(entitysInTemplate, scribble)
          }

          if (newEntitys.length != entitysInTemplate.length) {
              ElMessage.error('无效复制模式');
              carver.revoke();
              return
          }

          //寻找关系
          if (hasRelation) {
              entityRelations.forEach(entityRelation => {
                  let findFrom = false, findTo = false,
                      fromIndex, toIndex

                  for (let i = 0; i < entitysInTemplate.length; i++) {
                      if (!findFrom && entityRelation.fromId == entitysInTemplate[i].id) {
                          findFrom = true
                          fromIndex = i
                      }

                      if (!findTo && entityRelation.toId == entitysInTemplate[i].id) {
                          findTo = true
                          toIndex = i
                      }

                      if (findFrom && findTo) {
                          newEntityRelations.push({
                              from: fromIndex,
                              to: toIndex,
                              relationId: entityRelation.relationId,
                              relationText: entityRelation.relationVo.title
                          })

                          break
                      }
                  }
              })
          }

          break
  }


  console.log('template:', templateText);
  console.log('entitysInTemplate:', entitysInTemplate);
  console.log('newEntitys:', newEntitys);
  console.log('entityRelations:', newEntityRelations);

  // 处理用于展示的数据
  copyShowData.templateText = templateText;
  copyShowData.scribbleText = scribbleText;
  copyShowData.entitys = newEntitys.map(entity => {
    return {
      text: entity.text,
      label: entity.labelText
    };
  });
  copyShowData.relations = newEntityRelations.map((newEntityRelation) => {
    const {id: fromId} = newEntitys[newEntityRelation.from],
    {id: toId} = newEntitys[newEntityRelation.to];
    return {
      fromId,
      toId,
      relationId: newEntityRelation.relationId,
      mrId,
    };
  });
  // 处理复制接口参数
  copyParams.mrEntityRequestList = newEntitys;
  copyParams.mrEntityRelationRequestList = newEntityRelations.map((newEntityRelation) => {
    const {text: startText, labelText: startLabel} = newEntitys[newEntityRelation.from],
    {text: endText, labelText: endLabel} = newEntitys[newEntityRelation.to];
    return {
      startText,
      startLabel,
      relationText: newEntityRelation.relationText,
      endText,
      endLabel,
    };
  });
  // 打开dialog
  copyVisible.value = true;
};
// 划词操作
const carverSelect = ({fromIndex, toIndex, text, eventIndex, fromNode, toNode}) => {
  console.log(fromIndex, toIndex, text, eventIndex, fromNode, toNode);
  if (!text) return;
  const {clientX, clientY} = mousePosition;
  // 设置菜单
  scribeProps.clientX = clientX;
  scribeProps.clientY = clientY;
  scribeProps.target = {fromIndex, toIndex, text, eventIndex, fromNode, toNode};
  scribeProps.click = false;
  scribeProps.type = 'label';
  if (scribeCopy.value) {
    // 代表点击了复制按钮，执行handleCopy方法，且复制时不显示菜单
    handleCopy({fromIndex, toIndex, text, eventIndex, fromNode, toNode});
  } else {
    const page = pages[currentPage.value - 1];
    const scribbleStart = pageOffsetToGlobalOffset(fromIndex, page);
    const scribbleEnd = pageOffsetToGlobalOffset(toIndex, page);
    // 如果划取的内容里面有实体就展示复制按钮
    scribeProps.copyShow = entitys.some(entity => !(entity.startOffset > scribbleEnd || entity.endOffset < scribbleStart));
    if (scribeProps.copyShow) {
      // 初始化复制模版
      const entitysInTemplate = entitys.filter(entity => !(entity.startOffset > scribbleEnd || entity.endOffset < scribbleStart));
      //因为模板实体中包含未划取完整的实体，所以需要重新计算划取的起止范围
      let start = scribbleStart, end = scribbleEnd;
      // 计算出来所有实体中最开始的位置和最后面的位置
      entitysInTemplate.forEach(item => {
          // 开始位置谁在前用谁
          start = item.startOffset > start ? start : item.startOffset;
          // 结束位置谁在后用谁
          end = item.endOffset > end ? item.endOffset : end;
      })

      // 取出包含划词中实体的真实文本内容
      const scribbleText = page.text.substr(globalOffsetToPageOffset(start, page), end - start + 1);

      // 将复制模版中的实体存入变量（第一次作为模版）
      copyTemplate.entitys = entitysInTemplate;
      // 将计算出的文本存入变量（第一次作为模版）
      copyTemplate.text = scribbleText;
      console.log(copyTemplate, '看看计算之后的对不对');
    }
    scribeShow.value = true;
  }
  contextShow.value = false;
}
const handleTransfer = () => {
  if(carverBtn.value) {
    // 结束划词操作
    carver.cancelSelect();
    scribeShow.value = false;
    scribeRef.value.reset();
  } else {
    // 开启划词操作
    carver.select(true, carverSelect).catch(() => {
    });
    if (connectBtn.value) {
      // 关闭连线
      // 结束连线操作
      carver.cancelConnect();
      // 关闭菜单
      scribeShow.value = false;
      connectBtn.value = !connectBtn.value;
    }
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
    if (carverBtn.value) {
      // 开启连线操作
      // 结束划词操作
      carver.cancelSelect();
      scribeShow.value = false;
      scribeRef.value.reset();
      carverBtn.value = !carverBtn.value;
    }
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
const renderPageEntityRelation = (alone) => {
  return new Promise((reslove, reject) => {
    const page = pages[currentPage.value - 1];
    const contentStartOffset = page.startOffset;
    const contentEndOffset = page.endOffset;
    const handleArr = alone || entityRelations;
    const promiseArr = [];

    handleArr.filter(item => {
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
  if (e.ctrlKey == true && e.keyCode == 90) {//Ctrl+Z
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

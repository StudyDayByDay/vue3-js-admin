<template>
    <div class="carver">
      <div class="id">{{mrId}}</div>
      <div class="header">
        <el-button :color="color" :dark="true" @click="signSingle">单个划词</el-button>
        <el-button :color="color" :dark="true" @click="cancelSignSingle">取消单个划词</el-button>
        <el-button :color="color" :dark="true" @click="multipleWordTime">多选划词</el-button>
        <el-button :color="color" :dark="true" @click="multipleEnd">多选结束</el-button>
        <el-button :color="color" :dark="true" @click="multipleRevoke">多选撤销</el-button>
        <el-button :color="color" :dark="true" @click="addSingleLabel">添加单个标签</el-button>
        <el-button :color="color" :dark="true" @click="removeSingleLabel">移除单个标签</el-button>
        <el-button :color="color" :dark="true" @click="addExDataLabel">使用exData字段添加位置相同的标签</el-button>
        <el-button :color="color" :dark="true" @click="signLabel">单个划词并添加标签</el-button>
        <el-button :color="color" :dark="true" @click="multipleWordLabel">多个划词并添加标签</el-button>
        <el-button :color="color" :dark="true" @click="scrollToLabel">滚动到标签位置</el-button>
        <el-button :color="color" :dark="true" @click="highLightScroll">高亮并滚动到标签位置</el-button>
        <el-button :color="color" :dark="true" @click="cancelHighlight">取消高亮</el-button>
        <el-button :color="color" :dark="true" @click="addPath">添加连线</el-button>
        <el-button :color="color" :dark="true" @click="removePath">删除连线</el-button>
        <el-button :color="color" :dark="true" @click="editPath">编辑连线</el-button>
        <el-button :color="color" :dark="true" @click="collectLabel">收集标签</el-button>
        <el-button :color="color" :dark="true" @click="endCollectLabel">结束收集标签</el-button>
        <el-button :color="color" :dark="true" @click="cancelCollectLabel">取消收集标签</el-button>
        <el-button @click="addLargeEntity">新建大量实体</el-button>
        <el-button @click="addLargePath">大量连线操作</el-button>
        <el-button @click="addPathOnly">复杂页面新建关系</el-button>
        <el-button @click="deletePath">复杂页面删除关系</el-button>
        <el-button @click="addEntity">复杂页面新建实体</el-button>
        <el-button @click="deleteEntity">复杂页面删除实体</el-button>
        <el-button @click="getAllLabelNode">获取全部的labelNode</el-button>
        <el-button @click="getAllPathNode">获取全部的pathNode</el-button>
        
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
              <el-tree-select v-model="relation" :data="data" :render-after-expand="false" />
            </el-collapse-item>
            <el-collapse-item name="tag">
              <template #title>
                标签分类
                <el-icon class="header-icon">
                  <info-filled />
                </el-icon>
              </template>
              <el-tree-select v-model="tag" :data="data" :render-after-expand="false" />
            </el-collapse-item>
          </el-collapse>
        </div>
        <div class="content-center" ref="carverPanel"></div>
        <div class="content-right">
          <el-tabs v-model="activeName">
            <el-tab-pane label="实体" name="entity">
              <el-collapse>
                <el-collapse-item name="relation" title="肺炎">
                  xxx
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
import { Carver, labels, paths } from '@/utils';
// import apis from '@/api';
import {useRoute} from 'vue-router';

const color = ref('#2c3e50');
const collapse = reactive(['relation', 'tag']);
const relation = ref(), tag = ref();
const activeName = ref('entity');
const filterText = ref('');
const treeRef = ref(null);
const defaultProps = {
  children: 'children',
  label: 'label',
}
const carverPanel = ref(null);
let carver;

const {query: {mrId}} = useRoute();

onMounted(() => {
  initialize();
});

watch(filterText, (val) => {
  treeRef.value.filter(val);
});

const filterNode = (value, data) => {
  if (!value) return true
  return data.label.includes(value)
}

const data = [
  {
    value: '1',
    label: 'Level one 1',
    children: [
      {
        value: '1-1',
        label: 'Level two 1-1',
        children: [
          {
            value: '1-1-1',
            label: 'Level three 1-1-1',
          },
        ],
      },
    ],
  },
  {
    value: '2',
    label: 'Level one 2',
    children: [
      {
        value: '2-1',
        label: 'Level two 2-1',
        children: [
          {
            value: '2-1-1',
            label: 'Level three 2-1-1',
          },
        ],
      },
      {
        value: '2-2',
        label: 'Level two 2-2',
        children: [
          {
            value: '2-2-1',
            label: 'Level three 2-2-1',
          },
        ],
      },
    ],
  },
  {
    value: '3',
    label: 'Level one 3',
    children: [
      {
        value: '3-1',
        label: 'Level two 3-1',
        children: [
          {
            value: '3-1-1',
            label: 'Level three 3-1-1',
          },
        ],
      },
      {
        value: '3-2',
        label: 'Level two 3-2',
        children: [
          {
            value: '3-2-1',
            label: 'Level three 3-2-1',
          },
        ],
      },
    ],
  },
]

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

// 单选划词
const signSingle = async () => {
  try {
    const res = await carver.select();
    console.log("选中的文本信息: ", res);
  } catch (error) {
    console.log("划词被取消");
  }
};
// 取消单选划词
const cancelSignSingle = () => {
  carver.cancelSelect();
};
// 多选划词
const multipleWordTime = async () => {
  try {
    carver.select(true, e => {
      console.log(`第${e.eventIndex}次选中的文本`, e);
    })
  } catch (multipleEndRes) {
    console.log(multipleEndRes, '划词结束');
  }
};
// 多选结束
const multipleEnd = () => {
  carver.cancelSelect();
}
// 多选撤销
const multipleRevoke = () => {
  const revokeRes = carver.revoke();
  console.log(revokeRes, '撤销结果');
}
// 添加单个标签
const addSingleLabel = async () => {
  try {
    const res = await carver.addLabel({
      // 文本开始索引
      startIndex: 10,
      // 文本结束索引
      endIndex: 13,
      // 标签名
      textContent: '添加单个标签'
    });
    console.log(res, '标签添加成功');
  } catch (error) {
    console.log(error, '标签添加失败');
  }
}

// 移除单个标签
const removeSingleLabel = async () => {
  try {
    const res = carver.removeLabel({
      startIndex: 10,
      endIndex: 13,
      textContent: '添加单个标签'
    });
    console.log(res, '标签已移除');
  } catch (error) {
    console.log(error, '标签移除失败');
  }
}
// 使用exData字段添加位置相同的标签
const addExDataLabel = async () => {
  try {
    const res = await carver.addLabel([
      {
        startIndex: 10,
        endIndex: 13,
        textContent: '第一个标签',
        exData: 1,
      },
      {
        startIndex: 10,
        endIndex: 13,
        textContent: '第二个标签',
        exData: 2,
        style: {
          backgroundColor: '#FF00ff',
          color: '#fff'
        }
      }
    ]);
    console.log(res, '使用exData添加位置相同标签');
  } catch (error) {
    console.log(error, '123');
  }
}

// 单个划词并添加标签
const signLabel = async () => {
  try {
    const {fromIndex:startIndex, toIndex:endIndex} = await carver.select();
    // 执行添加标签操作
    carver.addLabel({
      startIndex,
      endIndex,
      textContent: '划词并添加标签'
    });
  } catch (error) {
    console.log(error, '划词被取消');
  }
}

// 多个划词并添加标签
const multipleWordLabel = () => {
  try {
    carver.select(true, e => {
      const {fromIndex: startIndex, toIndex: endIndex} = e;
      carver.addLabel({
        startIndex,
        endIndex,
        textContent: '多选划词添加标签'
      });
    });
  } catch (error) {
    console.log(error, '所有划词结果');
  }
}

// 滚动到某一个标签
const scrollToLabel = () => {
  carver.scrollToLabel({
      // startIndex: 2567,
      // endIndex: 2569,
      // textContent: 'kk',
      exData: 999,
    },);
}

// 高亮并滚动
const highLightScroll = () => {
  // 第二个参数传入true就是多了滚动效果
  carver.highlightLabelByExData(999, true);
}

// 取消高亮
const cancelHighlight = () => {
  carver.cancelHighlightLabelByExData(999);
}

// 添加连线
const addPath = async () => {
  // 如果需要一次添加多条连线，那么就给这个函数传入数组
  // 1、使用属性对象来添加path
  // try {
  //   const res = await carver.addPath({
  //     textContent: '连线lk',
  //     // 连线起始标签描述对象
  //     startLabel: {
  //       startIndex: 100,
  //       endIndex: 106,
  //       textContent: '11'
  //     },
  //     // 连线结束标签描述对象
  //     endLabel: {
  //       startIndex: 110,
  //       endIndex: 115,
  //       textContent: '12',
  //     }
  //   });
  //   console.log(res, '使用属性对象来添加path，成功');
  // } catch (error) {
  //   console.log(error, '使用属性对象来添加path，错误');
  // }
  // 2、使用扩展属性来添加path
  try {
    const res = await carver.addPathByExData({
      textContent: '连线lk',
      startLabelExData: 0,
      endLabelExData: 3,
      // 要使用ByExData的方式来删除的话，就需要用下面这个属性
      exData: 7
    });
    console.log(res, '使用扩展属性来添加path，成功');
  } catch (error) {
    console.log(error, '使用扩展属性来添加path，错误');
  }
}

// 删除连线
const removePath = () => {
  // 1、使用removePath来移除
  // carver.removePath({
  //   textContent: '连线lk',
  //   startLabel: {
  //     // 如果是没有使用exData方法添加的，就需要传入详细的标签属性
  //     exData: 0,
  //   },
  //   endLabel: {
  //     exData: 3
  //   }
  // });
  // 2、使用removePathByExData来移除
  carver.removePathByExData(7);
}

// 编辑连线
const editPath = () => {
  // 1、通过描述对象修改连线文字描述
  // carver.editPath({
  //   textContent: '连线lk',
  //   startLabelExData: 0,
  //   endLabelExData: 3,
  // }, '修改后的连线文字', {
  //   borderColor: 'green'
  // });
  // 2、通过连线扩展属性修改连线文字描述
  carver.editPathByExData(7, '修改后的连线文字', {highlightColor: 'yellow'});
}


// 收集标签
const collectLabel = async () => {
  try {
    const res = await carver.collectLabel();
    console.log(res, '收集成功');
  } catch (error) {
    console.log(error, '取消收集');
  }
}

// 结束收集标签
const endCollectLabel = () => {
  carver.endCollectLabel();
}

// 取消收集标签
const cancelCollectLabel = () => {
  carver.cancelCollectLabel();
}

// 新建大量实体
const addLargeEntity = () => {
    console.log(new Date(), '开始渲染实体');
    carver.addLabel(labels).then(() => {
        console.log(new Date(), '渲染实体结束');
    });
}

// 大量连线操作
const addLargePath = () => {
  // paths.forEach((item) => {
  //   carver.addPathByExData(item)
  // });
  // 4.53
    console.log(new Date(), '开始渲染关系');
    carver.addPathByExData(paths).then(() => {
    }).catch(() => {
        console.log(new Date(), '渲染关系结束');
    });
}
// 复杂页面新建关系
const addPathOnly = () => {
    console.log(new Date(), '开始新建关系');
    carver.addPathByExData({
        startLabelExData: 3,
        endLabelExData: 8,
        textContent: "复杂页面新建关系",
        exData: 564,
    }).then(() => {
        console.log(new Date(), '新建关系结束');
    });
}

// 复杂页面删除关系
const deletePath = () => {
    console.log(new Date(), '开始删除关系');
    carver.removePathByExData(88).then(() => {
        console.log(new Date(), '删除关系结束');
    });
}

// 复杂页面新建实体
const addEntity = () => {
    console.log(new Date(), '开始新建实体');
    carver.addLabel({
        startIndex: 582*4,
            endIndex: (582 + 1)*4 - 1,
            textContent: '标签',
            exData: 582,
    }).then(() => {
        console.log(new Date(), '新建实体结束');
    });
}

// 复杂页面删除实体
const deleteEntity = () => {
    console.log(new Date(), '开始删除实体');
    carver.removeLabelByExData(88).then(() => {
        console.log(new Date(), '删除实体结束');
    });
}

// 获取全部的labelNode
const getAllLabelNode = () => {
  console.log(carver.getAllLabelNode(), 'allLabel');
}

// 获取全部的pathNode
const getAllPathNode = () => {
  console.log(carver.getAllPathNode(), 'allPath');
}
// **************  carver  **************
const initialize = () => {
  const Mock = "一、JavaScript简介\nJavaScript（简称“JS”） 是一种具有函数优先的轻量级，解释型或即时编译型的编程语言。虽然它是作为开发Web页面的脚本语言而出名，但是它也被用到了很多非浏览器环境中，JavaScript 基于原型编程、多范式的动态脚本语言，并且支持面向对象、命令式、声明式、函数式编程范式。\nJavaScript在1995年由Netscape公司的Brendan Eich，在网景导航者浏览器上首次设计实现而成。因为Netscape与Sun合作，Netscape管理层希望它外观看起来像Java，因此取名为JavaScript。但实际上它的语法风格与Self及Scheme较为接近。\nJavaScript的标准是ECMAScript 。截至 2012 年，所有浏览器都完整的支持ECMAScript 5.1，旧版本的浏览器至少支持ECMAScript 3 标准。2015年6月17日，ECMA国际组织发布了ECMAScript的第六版，该版本正式名称为 ECMAScript 2015，但通常被称为ECMAScript 6 或者ES2015。\n\n二、产生背景\nJavaScript最初由Netscape的Brendan Eich设计，最初将其脚本语言命名为LiveScript，后来Netscape在与Sun合作之后将其改名为JavaScript。JavaScript最初受Java启发而开始设计的，目的之一就是“看上去像Java”，因此语法上有类似之处，一些名称和命名规范也借自Java，但JavaScript的主要设计原则源自Self和Scheme。JavaScript与Java名称上的近似，是当时Netscape为了营销考虑与Sun微系统达成协议的结果。微软同时期也推出了JScript来迎战JavaScript的脚本语言。\n发展初期，JavaScript的标准并未确定，同期有Netscape的JavaScript，微软的JScript和CEnvi的ScriptEase三足鼎立。为了互用性，Ecma国际（前身为欧洲计算机制造商协会）创建了ECMA-262标准（ECMAScript），两者都属于ECMAScript的实现，尽管JavaScript作为给非程序人员的脚本语言，而非作为给程序人员的脚本语言来推广和宣传，但是JavaScript具有非常丰富的特性。 [10]  1997年，在ECMA（欧洲计算机制造商协会）的协调下，由Netscape、Sun、微软、Borland组成的工作组确定统一标准：ECMA-262。完整的JavaScript实现包含三个部分：ECMAScript，文档对象模型，浏览器对象模型。\nJavaScript是甲骨文公司的注册商标。Ecma国际以JavaScript为基础制定了ECMAScript标准。JavaScript也可以用于其他场合，如服务器端编程（Node.js）。\n\n三、主要功能\n1.嵌入动态文本于HTML页面。\n2.对浏览器事件做出响应。\n3.读写HTML元素。\n4.在数据被提交到服务器之前验证数据。\n5.检测访客的浏览器信息，控制cookies，包括创建和修改等。\n6.基于Node.js技术进行服务器端编程。\n\n四、语言组成\nECMAScript，描述了该语言的语法和基本对象。\n文档对象模型（DOM），描述处理网页内容的方法和接口。\n浏览器对象模型（BOM），描述与浏览器进行交互的方法和接口。\n\n五、运行模式\nJavaScript是一种属于网络的高级脚本语言,已经被广泛用于Web应用开发,常用来为网页添加各式各样的动态功能,为用户提供更流畅美观的浏览效果。通常JavaScript脚本是通过嵌入在HTML中来实现自身的功能的。\n是一种解释性脚本语言（代码不进行预编译）。\n主要用来向HTML（标准通用标记语言下的一个应用）页面添加交互行为。\n可以直接嵌入HTML页面，但写成单独的js文件有利于结构和行为的分离。\n跨平台特性，在绝大多数浏览器的支持下，可以在多种平台下运行（如Windows、Linux、Mac、Android、iOS等）。\nJavaScript脚本语言同其他语言一样，有它自身的基本数据类型，表达式和算术运算符及程序的基本程序框架。JavaScript提供了四种基本的数据类型和两种特殊数据类型用来处理数据和文字。而变量提供存放信息的地方，表达式则可以完成较复杂的信息处理。\n\n六、语言特点\nJavaScript脚本语言具有以下特点\n(1)脚本语言。JavaScript是一种解释型的脚本语言，C、C++等语言先编译后执行，而JavaScript是在程序的运行过程中逐行进行解释。\n(1)脚本语言。JavaScript是一种解释型的脚本语言，C、C++等语言先编译后执行，而JavaScript是在程序的运行过程中逐行进行解释。\n(3)简单。JavaScript语言中采用的是弱类型的变量类型，对使用的数据类型未做出严格的要求，是基于Java基本语句和控制的脚本语言，其设计简单紧凑。\n(4)动态性。JavaScript是一种采用事件驱动的脚本语言，它不需要经过Web服务器就可以对用户的输入做出响应。在访问一个网页时，鼠标在网页中进行鼠标点击或上下移、窗口移动等操作JavaScript都可直接对这些事件给出相应的响应。\n(5)跨平台性。JavaScript脚本语言不依赖于操作系统，仅需要浏览器的支持。因此一个JavaScript脚本在编写后可以带到任意机器上使用，前提是机器上的浏览器支 持JavaScript脚本语言，JavaScript已被大多数的浏览器所支持。 [6]  不同于服务器端脚本语言，例如PHP与ASP，JavaScript主要被作为客户端脚本语言在用户的浏览器上运行，不需要服务器的支持。所以在早期程序员比较青睐于JavaScript以减少对服务器的负担，而与此同时也带来另一个问题，安全性。\n而随着服务器的强壮，虽然程序员更喜欢运行于服务端的脚本以保证安全，但JavaScript仍然以其跨平台、容易上手等优势大行其道。同时，有些特殊功能（如AJAX）必须依赖JavaScript在客户端进行支持。";
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
  carver.text = Mock;
  carver.onPathClick = (target, e) => {
    console.log(target, e, 'path');
  };
  carver.onLabelClick = async (target, e) => {
    console.log(target, e, 'label');
    // ***********  删除标签  ***********
    // const {exData} = target;
    // if (exData) {
    //   // 根据exData删除
    //   carver.removeLabelByExData(exData);
    // } else {
    //   // 根据虚拟节点删除标签
    //   carver.removeLabel({id});
    // }
    // 还有一种根据属性对象删除  removeLabel传入全部属性

    // ***********  编辑标签  ***********
    // 1、editLabel传对象
    // carver.editLabel({startIndex: target.startIndex, endIndex: target.endIndex, textContent: target.textContent}, 'lk', {backgroundColor: 'red'});
    // 2、editLabel传id
    // carver.editLabel({id: target.id}, 'lk', {backgroundColor: 'red'});
    // 3、editLabelByExData
    // carver.editLabelByExData(exData, 'lk_', {backgroundColor: 'pink'});

    // ***********  连接标签动画  ***********
    try {
      // 还有一个connect方法是：connectByExData
      const {startLabel, endLabel} = await carver.connect(target);
      carver.addPath({
        textContent: '连线动画'+new Date().getTime(),
        startLabel,
        endLabel
      });
    } catch (error) {
      console.log(error, '连线取消');
    }
  };
  // carver.addLabel([
  //   {
  //     startIndex: 0,
  //     endIndex: 3,
  //     textContent: "标签1",
  //     exData: 2,
  //   },
  //   {
  //     startIndex: 15,
  //     endIndex: 20,
  //     textContent: "重复的标签",
  //     exData: 34,
  //   },
  //   {
  //     startIndex: 56,
  //     endIndex: 60,
  //     textContent: Mock.slice(56, 60) + "2",
  //     exData: 0,
  //   },
  //   {
  //     startIndex: 37,
  //     endIndex: 42,
  //     textContent: Mock.slice(37, 42) + "3",
  //   },
  //   {
  //     startIndex: 31,
  //     endIndex: 33,
  //     textContent: Mock.slice(31, 33) + "4",
  //   },
  //   {
  //     startIndex: 90,
  //     endIndex: 98,
  //     textContent: Mock.slice(90, 98) + "5",
  //   },
  //   {
  //     startIndex: 100,
  //     endIndex: 106,
  //     textContent: '11',
  //   },
  //   {
  //     startIndex: 110,
  //     endIndex: 115,
  //     textContent: '12',
  //     exData: 3,
  //   },
  //   {
  //     startIndex: 130,
  //     endIndex: 138,
  //     textContent: Mock.slice(90, 98) + "8",
  //     exData: 1,
  //   },
  //   {
  //     startIndex: 2567,
  //     endIndex: 2569,
  //     textContent: 'kk',
  //     exData: 999,
  //   },
  // ]);
  // carver.editLabel(
  //   {
  //     startIndex: 0,
  //     endIndex: 3,
  //   },
  //   "编辑",
  //   {
  //     backgroundColor: "red",
  //   }
  // );

  // carver.addPathByExData({
  //   startLabelExData: 0,
  //   endLabelExData: 999,
  //   textContent: "连线1",
  //   exData: 22,
  // })
  // .then((res) => {
  //   console.log(res, 'res');
  // });

  // carver.addPathByExData({
  //   startLabelExData: 0,
  //   endLabelExData: 999,
  //   textContent: "连线",
  //   exData: 23,
  // })
  // .then((res) => {
  //   console.log(res, 'res');
  // });

  // carver.editPathByExData(23, "hhhhh", {
  //   heightLightColor: "#000",
  //   borderColor: "red",
  // });

  // carver.addMarkByIndex({
  //   fromIndex: 67,
  //   toIndex: 80,
  //   // labelId: vlabel.id,
  //   style: {
  //     backgroundColor: "red",
  //     opacity: 0.5,
  //   },
  // })
  // .then((res) => {
  //   console.log(res);
  // });

  // carver.addMarkByIndex({
  //   fromIndex: 169,
  //   toIndex: 180,
  //   // labelId: vlabel.id,
  //   style: {
  //     backgroundColor: "green",
  //     opacity: 0.5,
  //   },
  // })
  // .catch((res) => {
  //   console.log(res);
  // });

}
</script>

<style lang="scss" scoped>
.carver {
  width: calc(100% - 40px);
  height: 100%;
  padding: 0 20px;
  display: grid;
  grid-template-columns: auto;
  grid-template-rows: 31px 41px calc(100% - 74px);
  .id {
    display: flex;
    justify-content: center;
    align-items: center;
    // height: 31px;
    border-bottom: 1px dashed #ccc;
  }
  .header {
    height: 41px;
    line-height: 29px;
    // align-self: center;
    padding: 5px 10px;
    border-bottom: 1px solid #ebeef5;
    overflow-x: auto;
    white-space: nowrap;
    &::-webkit-scrollbar{
      display:none
    }
  }
  .content {
    // height: calc(100% - 74px);
    display: grid;
    grid-template-columns: 20% 60% 20%;
    grid-template-rows: auto;
    &-left {
      border-right: 1px solid #ebeef5;
    }
    &-center {
      overflow: auto;
      border-right: 1px solid #ebeef5;
    }
    &-right {}
  }
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
</style>

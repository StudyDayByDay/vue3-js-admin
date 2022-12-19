import { VNodeFactory } from "../vnode/index.js";
import {
  config as defaultConfig,
  style as defaultStyle,
} from "../options/index.js";
import { PSCalculator } from "./pscalculator.js";
import { SVGFactory } from "./svg-factory.js";
import { VText } from "../vnode/vtext.js";
import {
  textDiff,
  labelDiff,
  pathDiff,
  compare,
  deepMerge,
} from "../util/index.js";
import { EBus } from "./ebus.js";
import { TextSelection } from "./text-selection.js";
import { VLabel } from "../vnode/vlabel.js";

export class VM {
  /**
   * 构造函数
   * @param {object} options - 参数配置
   * @param {Element} options.root - 用于挂载svg的dom容器
   * @param {boolean} [options.autoResize] - 是否启用自动监听容器大小变化
   * @param {boolean} [options.onResizeinterval] - 监听容器大小变化的频率 以ms为单位
   * @param {object} [options.config] - 参考config.js
   * @param {object} [options.style] - 参考style.js
   */
  constructor(options) {
    this.$root = options.root; // 容器节点
    this.$vnodeFactory = new VNodeFactory(); // 虚拟节点工厂类
    this.$pscalculator = new PSCalculator(); // 位置计算器
    this.$svg = null; // svg节点
    this.$markLayer = null; // 标记容器
    this.$textLayer = null; // 文本容器
    this.$labelLayer = null; // 标签容器
    this.$relationLayer = null; // 关系描述容器
    this.$topLayer = null; // 最高层级存放容器
    this.$dottedLineLayer = null; // 虚线轨迹存放容器
    this.config = {}; // 布局配置信息
    this.style = deepMerge({}, defaultStyle, options.style); // 样式配置信息
    // 是否自动监听容器大小
    this.autoResize =
      typeof options.autoResize === "undefined" ? true : !!options.autoResize;
    // 容器自动监听频率
    this.onResizeinterval =
      typeof options.onResizeinterval === "number"
        ? options.onResizeinterval
        : 200;
    // 虚拟节点
    this.nodeList = {
      textNodeList: [],
      labelNodeList: [],
      selectMarkNodeList: [],
      labelMarkNodeList: [],
      pathNodeList: [],
    };
    this.selectStatus = 0; // 文本选中状态 0=>禁用；1=>单选；2=>多选
    this.$bus = new EBus(); // 事件总线
    this.currentSelectList = []; // 当前选中的文本
    this.onLabelClick = null; // 标签点击事件 (target:VLabel;data:MouseEvent;) => viod
    this.onPathClick = null; // 路径标签点击事件 (target:VPath;data:MouseEvent;) => viod

    this.lineData = {}; // connect时用来存放标签的对象

    this.setConfig(options.config);
    this.__onResize();
    this.__create();
  }

  /*
   * 获取全部的label
   */
  getAllLabelNode() {
    return this.nodeList.labelNodeList;
  }

  /*
   * 获取全部的path
   */
  getAllPathNode() {
    return this.nodeList.pathNodeList;
  }
  /**
   * 设置样式配置
   * @param {object} config
   */
  setConfig(config) {
    this.config = deepMerge({}, defaultConfig, config);
    this.$pscalculator.setOptions(this.config);
  }

  /**
   * 设置文本内容 每次执行时会重新计算文本节点位置
   * @param {string} text
   */
  setText(text) {
    // 移除虚拟节点
    Object.keys(this.nodeList).forEach((key) => {
      if (this.nodeList[key].length) {
        this.nodeList[key].forEach((item) => {
          item.remove();
        });
      }
      this.nodeList[key] = [];
    });
    this.currentSelectList = []; // 当前选中的文本
    this.$bus.events.forEach((eventItem) => {
      if (eventItem.name !== "labelClick" && eventItem.name !== "pathClick") {
        eventItem.callBacks = [];
      }
    });
    this.lineData = {};
    this.$pscalculator.text = text;
  }

  /**
   * 划词
   * @param {boolean} multiple - 是否多选
   * @param {(e:{eventIndex:number;fromIndex:number;toIndex:number;text:string;fromNode:VText;toNode:VText;})=>viod} [multipleListener] - 多选监听事件 每次选择时执行回调
   * @returns {Promise<{fromIndex:number;toIndex:number;text:string;fromNode:VText;toNode:VText;}>}
   */
  select(multiple, multipleListener = null) {
    this.$bus.register("selectCancel"); // 在事件总线上注册selectCancel取消划词事件

    if (!multiple) {
      this.__setSelectStatus(1); // 设置划词状态为单个划词
    }

    if (multiple) {
      this.__setSelectStatus(2); // 设置划词状态为多个划词
    }

    // 创建文本选择对象
    const textSelection = new TextSelection(
      this.$root,
      this.$pscalculator,
      this.nodeList.textNodeList,
      {
        multiple,
      }
    );

    this.__setCurrentSelectList([]);

    // 通过promise在划词行为结束时返回划中的词及其索引
    return new Promise((resolve, reject) => {
      // 添加划词取消事件监听
      this.$bus.addEventListener("selectCancel", () => {
        // 移除selectCancel事件
        this.$bus.unregister("selectCancel");
        // 销毁文本选择对象
        textSelection.destroy();

        // 多选通过reject返回数组
        if (multiple) {
          reject(this.currentSelectList);
          return;
        }

        // 单选通过reject返回第一项
        reject(this.currentSelectList[0]);
      });

      // 判断是否在划词状态中 如果在划词状态中则添加监听划词变化的事件
      if (this.selectStatus !== 0) {
        // 监听划词变化并触发textSelect事件 通知文本添加或取消选中的高亮标记
        textSelection.onchange = (min, max) => {
          this.$emit({
            eventName: "textSelect",
            data: { start: min, end: max },
          });
        };
      }

      // 监听划词结束 通过resolve返回划中的词及其索引 并取消划词状态
      textSelection.onstop = ({ min, max }) => {
        // 点击所在行 不存在文本 的情况
        if (min === -1 && max === -1) {
          if (!multiple) {
            reject("请选择正确的位置开始划词");
            this.cancelSelect();
          }
          return;
        }

        // 获取 选中的文本信息
        const currentTextList = this.$pscalculator.textInfo.filter(
          (item) => item.index >= min && item.index <= max
        );
        // 点击行  是一个换行符所在的行
        if (
          currentTextList.length === 1 &&
          currentTextList[0].textContent === this.config.linebreaks
        ) {
          if (!multiple) {
            reject("请选择正确的位置开始划词");
            this.cancelSelect();
          }
          return;
        }

        // 记录下当前的划中内容
        this.__setCurrentSelectList(
          this.currentSelectList
            .slice()
            .concat([this.__getTextInfoBy(min, max)])
        );

        if (!multiple) {
          // 单选通过resolve返回最后一项
          resolve(this.currentSelectList[this.currentSelectList.length - 1]);
          this.__setSelectStatus(0);
          return;
        }

        // 触发取消划词状态事件
        this.$emit({ eventName: "textCancel" });

        // 多选回调如果存在则执行 通过函数返回当前的多选的次数索引和当前次划中的内容
        if (multipleListener) {
          multipleListener({
            eventIndex: this.currentSelectList.length - 1, // 多选的第几次划词
            ...this.currentSelectList[this.currentSelectList.length - 1], // 当前次的划词内容
          });
        }
      };
    });
  }

  /**
   * 划词取消
   */
  cancelSelect() {
    this.__setSelectStatus(0);
    this.$emit({ eventName: "selectCancel" });
    this.__setCurrentSelectList([]);
  }

  /**
   * 多选回退到上一步
   * @returns {{deleted:object;current:object[]}}
   */
  multiSelectPrev() {
    let current = [];
    let deleted = {};
    if (this.selectStatus === 2 && this.currentSelectList.length) {
      current = this.currentSelectList.slice();
      deleted = current.pop();
      this.__setCurrentSelectList(current);
    }
    return {
      deleted,
      current,
    };
  }

  /**
   * 设置当前选中文本
   * @param {{fromIndex:number;toIndex:number;text:string;fromNode:VText;toNode:VText;}[]} list
   */
  __setCurrentSelectList(list) {
    // 新增的选中项
    const addArr = list.filter(
      ({ fromIndex, toIndex }) =>
        !this.currentSelectList.find(
          (item) => item.fromIndex === fromIndex && item.toIndex === toIndex
        )
    );
    addArr.forEach((item) => {
      this.__addSelectMark(item);
    });

    // 移除的选中项
    const desArr = this.currentSelectList.filter(
      ({ fromIndex, toIndex }) =>
        !list.find(
          (item) => item.fromIndex === fromIndex && item.toIndex === toIndex
        )
    );
    desArr.forEach((item) => {
      this.__cancelSelectMark(item);
    });

    this.currentSelectList = list;
  }

  /**
   * 添加标签文本高亮标记
   * @param {object} mark
   * @param {number} mark.fromIndex
   * @param {number} mark.toIndex
   * @param {string} mark.labelId
   * @param {style} mark.style
   */
  __addLabelMark(mark) {
    this.__cancelSelectMark({
      fromIndex: mark.fromIndex,
      toIndex: mark.toIndex,
    });
    const textList = this.nodeList.textNodeList.filter(
      ({ index }) => index >= mark.fromIndex && index <= mark.toIndex
    );
    const style = deepMerge({}, this.style.mark, mark.style);
    const vmark = this.$vnodeFactory.createNode("vmark", { textList });
    vmark.$bus = this.$bus;
    vmark.fromIndex = mark.fromIndex;
    vmark.toIndex = mark.toIndex;
    vmark.labelId = mark.labelId;
    vmark.createElement(style);
    this.$markLayer.appendChild(vmark.$el);
    this.nodeList.labelMarkNodeList.push(vmark);
  }

  /**
   * 根据索引值 添加 mark
   * @param {object} mark
   * @param {number} mark.fromIndex
   * @param {number} mark.toIndex
   * @param {style} mark.style
   */
  addMarkByIndex(mark) {
    const textList = this.nodeList.textNodeList.filter(
      ({ index }) => index >= mark.fromIndex && index <= mark.toIndex
    );
    if (!textList.length) {
      throw new Error("传递的索引有误");
    }
    const style = deepMerge({}, this.style.mark, mark.style);
    const vmark = this.$vnodeFactory.createNode("vmark", { textList });
    vmark.$bus = this.$bus;
    vmark.fromIndex = mark.fromIndex;
    vmark.toIndex = mark.toIndex;
    vmark.createElement(style);
    this.$markLayer.appendChild(vmark.$el);
    this.nodeList.labelMarkNodeList.push(vmark);
    return vmark;
  }

  /**
   * 通过labelId移除标签对应的文本高亮标记
   * @param {string} labelId - 标签虚拟节点id
   * @returns
   */
  __cancelLabelMark(labelId) {
    const index = this.nodeList.labelMarkNodeList.findIndex(
      (item) => labelId === item.labelId
    );
    if (index < 0) {
      return;
    }
    this.nodeList.labelMarkNodeList[index].remove();
    this.nodeList.labelMarkNodeList.splice(index, 1);
  }

  /**
   * 添加选中文本高亮标记
   * @param {{fromIndex:number;toIndex:number;text:string;fromNode:VText;toNode:VText;}} mark
   */
  __addSelectMark(mark) {
    const textList = this.nodeList.textNodeList.filter(
      ({ index }) => index >= mark.fromIndex && index <= mark.toIndex
    );
    const style = deepMerge({}, this.style.mark, mark.style);
    const vmark = this.$vnodeFactory.createNode("vmark", { textList });
    vmark.$bus = this.$bus;
    vmark.fromIndex = mark.fromIndex;
    vmark.toIndex = mark.toIndex;
    vmark.createElement(style);
    this.$markLayer.appendChild(vmark.$el);
    this.nodeList.selectMarkNodeList.push(vmark);
  }

  /**
   * 移除选中文本高亮标记
   * @param {{fromIndex:number;toIndex:number;text:string;fromNode:VText;toNode:VText;}} mark
   */
  __cancelSelectMark(mark) {
    const index = this.nodeList.selectMarkNodeList.findIndex(
      ({ labelId, fromIndex, toIndex }) =>
        mark.labelId
          ? labelId === mark.labelId
          : fromIndex === mark.fromIndex && toIndex === mark.toIndex
    );
    if (index < 0) {
      return;
    }
    this.nodeList.selectMarkNodeList[index].remove();
    this.nodeList.selectMarkNodeList.splice(index, 1);
  }

  /**
   * 设置状态
   * @private
   * @param {0 | 1 | 2 } status
   */
  __setSelectStatus(status) {
    if (status === 0) {
      this.$textLayer.style.cursor = "default";
      this.$textLayer.style.pointerEvents = "none";
      this.$labelLayer.style.pointerEvents = "all";
      this.$markLayer.style.pointerEvents = "all";
      this.$relationLayer.style.pointerEvents = "all";
    }

    if (status !== 0) {
      this.$textLayer.style.cursor = "text";
      this.$textLayer.style.pointerEvents = "all";
      this.$labelLayer.style.pointerEvents = "none";
      this.$markLayer.style.pointerEvents = "none";
      this.$relationLayer.style.pointerEvents = "none";
    }

    const lastStatus = this.selectStatus;
    this.selectStatus = status;

    if (lastStatus === 1 && status === 0) {
      this.$emit({ eventName: "textCancel" });
    }
  }

  /**
   * 事件触发
   * @param {object} params
   * @param {'textSelect' | 'textCancel' | 'selectCancel' | 'rowOffsetY' | 'textPositionChange' | 'labelClick' | 'labelStyleChange' } params.eventName - 事件名称
   * @param {*} [params.target] - 事件触发对象
   * @param {object} [params.data] - 事件参数
   * @param {number} [params.data.rowIndex] - rowOffsetY事件中的文本偏移起始行
   * @param {number} [params.data.offsetHeight] - rowOffsetY事件中的文本纵向偏移量
   * @param {number} [params.data.min] - textSelect事件中的选中文本起始索引值
   * @param {number} [params.data.max] - textSelect事件中的选中文本结束索引值
   * params.data参数说明：
   * rowOffsetY事件：{ rowIndex: number; offsetHeight: number } - 文本偏移
   * textSelect事件：{ min: number; max: number; } - 文本选中
   * textCancel事件：{} - 取消文本选中
   * selectCancel事件 {} - 划词取消
   * textPositionChange {index:number;position:object;} - 文本位置移动
   * labelClick {MouseEvent} - 标签被点击
   * labelStyleChange {styles} - 标签样式变化
   */
  $emit(params) {
    this.$bus.emit(params.eventName, params.target, params.data);
  }

  /**
   * 添加标签
   * @param {object[]} data
   * @param {number} data[].startIndex - 关联文本起始字符索引值
   * @param {number} data[].endIndex - 关联文本结束字符索引值
   * @param {string} data[].textContent - 标签内容
   * @param {object} [data[].style] - 标签样式
   * @param {string} [data[].style.backgroundColor] - 背景颜色
   * @param {string} [data[].style.color] - 文字颜色
   */
  addLabel(data) {
    data.forEach((item) => {
      item["style"] = deepMerge({}, this.style.label, item.style);
    });
    this.$pscalculator.addLabel(data);
    return this.nodeList.labelNodeList.filter(
      ({ startIndex, endIndex, textContent, exData }) =>
        data.findIndex(
          (el) =>
            el.startIndex === startIndex &&
            el.endIndex === endIndex &&
            el.textContent === textContent &&
            el.exData === exData
        ) >= 0
    );
  }

  /**
   * 移除标签
   * @param {VLabel} vlabel
   */
  removeLabel(vlabel) {
    const targets = this.nodeList.labelNodeList.filter((el) => {
      if (typeof vlabel.id !== "undefined") {
        return el.id === vlabel.id;
      }
      return compare(vlabel, el);
    });
    if (targets.length === 0) {
      throw new Error("未找到对应标签。");
    }
    if (targets.length > 1) {
      throw new Error("未找到唯一标签。");
    }

    this.__deleteLabelPath(targets[0]); // 删除路径虚拟节点
    this.cancelHighlightLabel(targets[0]); // 移除标签对应的文本高亮标记
    this.__cancelLabelMark(targets[0].id); // 移除标签对应的文本标记
    this.__deleteLabel(targets[0]); // // 删除标签虚拟节点
    this.$pscalculator.removeLabel(targets[0]); // 更新labelData => 更新pathData => 更新labelInfo => 更新pathInfo
    return targets[0];
  }

  /**
   * 通过扩展属性移除标签
   * @param {*} exData
   */
  removeLabelByExData(exData) {
    const targets = this.nodeList.labelNodeList.filter(
      (el) => el.exData === exData
    );
    if (targets.length === 0) {
      throw new Error("未找到对应标签。");
    }
    if (targets.length > 1) {
      throw new Error("未找到唯一标签。");
    }
    return this.removeLabel(targets[0]);
  }

  /**
   * 删除当前标签上的path路径;更新this.nodeList.pathNodeList;
   * @param {object} vlabel
   */
  __deleteLabelPath(vlabel) {
    let i = this.nodeList.pathNodeList.length;
    while (i--) {
      if (
        this.nodeList.pathNodeList[i].startLabel.id === vlabel.id ||
        this.nodeList.pathNodeList[i].endLabel.id === vlabel.id
      ) {
        this.$relationLayer.removeChild(this.nodeList.pathNodeList[i].$el);
        this.nodeList.pathNodeList.splice(i, 1);
      }
    }
  }

  /**
   * 删除标签虚拟节点
   * @param {object} vlabel
   * @returns
   */
  __deleteLabel(vlabel) {
    const index = this.nodeList.labelNodeList.findIndex(
      (item) => item === vlabel
    );
    if (index < 0) {
      return;
    }
    this.nodeList.labelNodeList.splice(index, 1);
    vlabel.remove();
  }

  /**
   * 编辑标签
   * @param {object} vlabel
   * @param {string} [vlabel.id] - 虚拟节点id
   * @param {number} [vlabel.startIndex] - 关联文本起始字符索引值
   * @param {number} [vlabel.endIndex] - 关联文本结束字符索引值
   * @param {string} [vlabel.textContent] - 标签内容
   * @param {*} [vlabel.exData] - 扩展属性
   * @param {string} textContent - 标签内容
   * @param {Object} [style] - 标签样式
   * @param {string} [style.color]
   * @param {string} [style.backgroundColor]
   */
  editLabel(vlabel, textContent, style) {
    const targets = this.nodeList.labelNodeList.filter((el) => {
      if (typeof vlabel.id !== "undefined") {
        return el.id === vlabel.id;
      }
      return compare(vlabel, el);
    });
    if (targets.length === 0) {
      throw new Error("未找到对应标签。");
    }
    if (targets.length > 1) {
      throw new Error("未找到唯一标签。");
    }
    this.$pscalculator.editLabel(targets[0], textContent, style);
    return targets[0];
  }

  /**
   * 通过扩展属性编辑标签
   * @param {*} exData
   * @param {string} textContent - 标签内容
   * @param {Object} [style] - 标签样式
   * @param {string} [style.color]
   * @param {string} [style.backgroundColor]
   */
  editLabelByExData(exData, textContent, style) {
    const targets = this.nodeList.labelNodeList.filter(
      (el) => el.exData === exData
    );
    if (targets.length === 0) {
      throw new Error("未找到对应标签。");
    }
    if (targets.length > 1) {
      throw new Error("未找到唯一标签。");
    }
    return this.editLabel(targets[0], textContent, style);
  }

  /**
   * 根据 开始标签 和 结束标签 连线成路径
   * @param {Object} data
   * @param {Object} data.startLabel - 连线起始标签虚拟节点
   * @param {Object} data.endLabel - 连线结束标签虚拟节点
   * @param {String} data.textContent - 连线标签文本内容
   * @param {*} data.exData - 自定义属性
   *
   * @param {Object} data.style - 标签样式
   * @param {string} data.style.highlightColor - 路径高亮时的颜色
   * @param {string} data.style.backgroundColor - 路径正常显示时的颜色
   */
  __addLabelPath(data) {
    if (!data.textContent) {
      return;
    }
    if (data.startLabel.id === data.endLabel.id) {
      return;
    }
    data["style"] = deepMerge({}, this.style.path, data.style);
    data.style.backgroundColor = this.style.backgroundColor;
    this.$pscalculator.addLabelPath(data);
    // 返回最新添加的 path
    return this.nodeList.pathNodeList.filter(
      ({ startLabel, endLabel, textContent, exData }) => {
        return (
          data.startLabel.id === startLabel.id &&
          data.endLabel.id === endLabel.id &&
          data.textContent === textContent &&
          data.exData === exData
        );
      }
    );
  }

  /**
   * 添加路径 通过标签信息 找到对应 标签 并调用生成路径方法
   * @param {Object} startLabel
   * @param {string} startLabel.id - 开始标签的id
   * @param {string} startLabel.startIndex - 开始标签的开始序号
   * @param {string} startLabel.endIndex - 开始标签的结束序号
   * @param {string} startLabel.textContent - 开始标签的文本
   * @param {string} startLabel.exData - 开始标签的exData
   * @param {Object} endLabel - 与开始标签一样  具有 startindex、endindex等属性
   * @param {string} textContent - 路径的标签的文本
   * @param {*} data.exData - 自定义属性
   *
   * @param {Object} data.style - 标签样式
   * @param {string} data.style.highlightColor - 路径高亮时的颜色
   * @param {string} data.style.backgroundColor - 路径正常显示时的颜色
   *
   *
   */
  addPath(data) {
    let pathArr = []; // 根据data数组生成的新path数组；
    for (let i = 0; i < data.length; i++) {
      let dataItem = data[i]; // 单个path信息 描述
      const startLabelList = this.nodeList.labelNodeList.filter((el) => {
        if (typeof dataItem.startLabel.id !== "undefined") {
          return el.id === dataItem.startLabel.id;
        }
        return compare(dataItem.startLabel, el);
      });

      const endLabelList = this.nodeList.labelNodeList.filter((el) => {
        if (typeof dataItem.endLabel.id !== "undefined") {
          return el.id === dataItem.endLabel.id;
        }
        return compare(dataItem.endLabel, el);
      });

      if (!startLabelList.length || startLabelList.length > 1) {
        throw new Error(`无效的标签描述。`);
      }

      if (!endLabelList.length || endLabelList.length > 1) {
        throw new Error(`无效的标签描述。`);
      }

      if (startLabelList.length === 1 && endLabelList.length === 1) {
        const startLabel = startLabelList[0];
        const endLabel = endLabelList[0];
        const labelData = {
          startLabel,
          endLabel,
          textContent: dataItem.textContent,
          style: dataItem.style,
          exData: dataItem.exData,
        };
        const newVpath = this.__addLabelPath(labelData); // 每次生成的新的虚拟节点
        pathArr.push(newVpath);
      }
    }
    return pathArr; // 新生成的path的 集合
  }

  /**
   *
   * @param {string} data[].startLabelExData - 开始标签的exData
   * @param {string} data[].endLabelExData - 结束标签的exData
   * @param {string} data[].textContent - 路径的标签的文本
   * @param {*} data[].exData - 自定义属性
   *
   * @param {Object} data[].style - 标签样式
   * @param {string} data[].style.highlightColor - 路径高亮时的颜色
   * @param {string} data[].style.backgroundColor - 路径正常显示时的颜色
   */
  addPathByExData(data) {
    let pathArr = []; // 新生成的path 数组;
    for (let i = 0; i < data.length; i++) {
      let dataItem = data[i];
      const startLabelList = this._findLabelByLabelExdata(
        dataItem.startLabelExData
      );
      const endLabelList = this._findLabelByLabelExdata(
        dataItem.endLabelExData
      );

      if (!startLabelList.length || startLabelList.length > 1) {
        throw new Error(`无效的标签描述。`);
      }

      if (!endLabelList.length || endLabelList.length > 1) {
        throw new Error(`无效的标签描述。`);
      }

      if (startLabelList.length === 1 && endLabelList.length === 1) {
        const startLabel = startLabelList[0]; // 要是找到的标签没有exData?
        const endLabel = endLabelList[0];
        const labelData = {
          startLabel,
          endLabel,
          textContent: dataItem.textContent,
          style: dataItem.style,
          exData: dataItem.exData,
        };
        const newVpath = this.__addLabelPath(labelData);
        pathArr.push(newVpath);
      }
    }
    return pathArr;
  }

  /**
   * 通过标签的exData 找到对应的标签
   * @param {string} exData - 标签的exData
   * @returns {Array} - 一个数组, 包含从nodelist找到的 vlabel
   */
  _findLabelByLabelExdata(exData) {
    return this.nodeList.labelNodeList.filter((item) => item.exData === exData);
  }

  /**
   * 添加路径时添加虚线
   * @param {Object} startLabel - startLabel对象信息
   */
  __addDottedLine(startLabel) {
    const svgGroupLine = SVGFactory.createPolyline();
    svgGroupLine.style =
      "fill:none;stroke:black;stroke-width:1.5;stroke-dasharray: 6 6 ";
    // 存放虚线连接
    this.$dottedLineLayer.appendChild(svgGroupLine);

    // 鼠标移动函数
    this.svgMousemove = (e) => {
      const x1 = startLabel.x + startLabel.width / 2;
      const y1 = startLabel.y + startLabel.height / 2;
      let x2 = 0;
      let y2 = 0;
      let x3 = 0;
      let y3 = 0;
      const x4 = e.offsetX;
      const y4 = e.offsetY;
      let points;
      if (Math.abs(y1 - e.offsetY) > 45) {
        if (this.$svg.width.baseVal.value - x1 - e.offsetX >= 0) {
          x2 = this.config.paddingLeft - 40;
          y2 = y1;
          x3 = x2;
          y3 = e.offsetY;
        } else {
          x2 = this.$svg.width.baseVal.value - 40;
          y2 = y1;
          x3 = x2;
          y3 = e.offsetY;
        }
        points = `${x1},${y1}  ${x2},${y2} ${x3},${y3} ${x4},${y4}`;
      } else {
        points = `${x1},${y1} ${x4},${y4}`;
      }

      svgGroupLine.setAttribute("points", points);
    };

    this.$root.addEventListener("mousemove", this.svgMousemove, true);
  }

  /**
   * 对外暴露的连线方法
   * @param {Object} startLabel
   * @param {string} startLabel.id - 开始标签的id
   * @param {string} startLabel.startIndex - 开始标签的开始序号
   * @param {string} startLabel.endIndex - 开始标签的结束序号
   * @param {string} startLabel.textContent - 开始标签的文本
   * @param {string} startLabel.exData - 开始标签的exData
   */
  connect(startLabel) {
    return new Promise((resolve, reject) => {
      const startLabelList = this.nodeList.labelNodeList.filter((el) => {
        if (typeof startLabel.id !== "undefined") {
          return el.id === startLabel.id;
        }
        return compare(startLabel, el);
      });

      if (!startLabelList.length || startLabelList.length > 1) {
        reject("标签的描述有误。");
        return;
      }

      this.__addDottedLine(startLabelList[0]); // 点击连线的虚线
      this.lineData["startLabel"] = startLabelList[0];

      // 右键事件函数
      let contextmenuHandler = (e) => {
        e.preventDefault(); //阻止右键弹窗
        this.$root.removeEventListener("mousemove", this.svgMousemove, true); // 移除事件监听
        document.removeEventListener("contextmenu", contextmenuHandler, true);
        this.$bus.remove("labelClick", handler); // 移除监听事件
        this.lineData = {};
        if (this.$dottedLineLayer.childNodes.length) {
          this.$dottedLineLayer.removeChild(
            this.$dottedLineLayer.childNodes[0]
          ); // 虚线节点移除
        }
        reject("连线取消。");
      };

      let handler = (target, data) => {
        document.removeEventListener("contextmenu", contextmenuHandler, true);
        this.$root.removeEventListener("mousemove", this.svgMousemove, true); // 移除事件监听
        this.$bus.remove("labelClick", handler); // 移除监听事件
        this.lineData["endLabel"] = target.target; // 结束标签
        resolve(this.lineData);
        this.lineData = {}; // 在第二次点击之后 将this.lineData 重置为空
        if (this.$dottedLineLayer.childNodes.length) {
          this.$dottedLineLayer.removeChild(
            this.$dottedLineLayer.childNodes[0]
          ); // 虚线节点移除
        }
      };

      document.addEventListener("contextmenu", contextmenuHandler, true);
      this.$bus.addEventListener("labelClick", handler);
    });

    // 事件处理函数
  }

  /**
   * 对外暴露的连线方法
   * @param startLabelExData - 开始标签的exData
   */
  connectByExData(startLabelExData) {
    return new Promise((resolve, reject) => {
      const startLabelList = this.nodeList.labelNodeList.filter(
        (el) => el.exData === startLabelExData
      );

      if (!startLabelList.length || startLabelList.length > 1) {
        reject("标签的描述有误。");
        return;
      }

      this.__addDottedLine(startLabelList[0]); // 点击连线的虚线
      this.lineData["startLabel"] = startLabelList[0];

      // 右键事件函数
      let contextmenuHandler = (e) => {
        e.preventDefault(); //阻止右键弹窗
        this.$root.removeEventListener("mousemove", this.svgMousemove, true); // 移除事件监听
        document.removeEventListener("contextmenu", contextmenuHandler, true);
        this.$bus.remove("labelClick", handler); // 移除监听事件
        this.lineData = {};
        if (this.$dottedLineLayer.childNodes.length) {
          this.$dottedLineLayer.removeChild(
            this.$dottedLineLayer.childNodes[0]
          ); // 虚线节点移除
        }
        reject("连线取消。");
      };

      let handler = (target, data) => {
        document.removeEventListener("contextmenu", contextmenuHandler, true);
        this.$root.removeEventListener("mousemove", this.svgMousemove, true); // 移除事件监听
        this.$bus.remove("labelClick", handler); // 移除监听事件
        this.lineData["endLabel"] = target.target; // 结束标签
        resolve(this.lineData);
        this.lineData = {}; // 在第二次点击之后 将this.lineData 重置为空
        if (this.$dottedLineLayer.childNodes.length) {
          this.$dottedLineLayer.removeChild(
            this.$dottedLineLayer.childNodes[0]
          ); // 虚线节点移除
        }
      };

      document.addEventListener("contextmenu", contextmenuHandler, true);
      this.$bus.addEventListener("labelClick", handler);
    });
  }

  /**
   * 移除路径
   * @param {Object} path
   * @param {string} path.id - 路径的id
   * @param {object} path.startLabel - 路径的开始标签信息
   * @param {object} path.endLabel - 路径的结束标签信息
   * @param {object} path.textContent - 路径上的标签文本
   * @param {object} path.exData - 路径自定义信息
   *
   * @param {string} path.startLabel.id - 开始标签的id
   * @param {string} path.startLabel.startIndex - 开始标签的开始序号
   * @param {string} path.startLabel.endIndex - 开始标签的结束序号
   * @param {string} path.startLabel.textContent - 开始标签的文本
   * @param {string} path.startLabel.exData - 开始标签的exData
   * @param {object} path.endLabel - endlabel 包含的信息 与startLabel类似
   * @returns {object} vpath - 被删除的虚拟节点
   */
  removePath(path) {
    // 删除相关联的虚拟节点
    if (typeof path.id !== "undefined") {
      // 根据path的id 找到相应的虚拟节点
      let pathList = this.nodeList.pathNodeList.filter(
        (el) => el.id === path.id
      );

      if (!pathList.length || pathList.length > 1) {
        throw new Error("路径信息id 有误");
      }
      // 如果唯一id 的path 存在 则删除这个 vpath 即可
      if (pathList.length === 1) {
        let vpath = pathList[0]; // 如果要删除换行的项；则需要 连带其他两项一块删除；
        let i = this.nodeList.pathNodeList.length;
        while (i--) {
          let pathItem = this.nodeList.pathNodeList[i];
          // 找出其他连带的两项path 一块删除
          if (
            pathItem.startLabel.id === vpath.startLabel.id &&
            pathItem.endLabel.id === vpath.endLabel.id &&
            pathItem.textContent === vpath.textContent &&
            pathItem.exData === vpath.exData
          ) {
            this.$relationLayer.removeChild(pathItem.$el);
            this.nodeList.pathNodeList.splice(i, 1);
          }
        }
        this.$pscalculator.removePath(vpath); // 去pscalculatorc 重新计算位置信息；
        return this.nodeList.pathNodeList.filter((el) => {
          return (
            el.startLabel.id === vpath.startLabel.id &&
            el.endLabel.id === vpath.endLabel.id &&
            el.textContent === vpath.textContent &&
            el.exData === vpath.exData
          );
        });
        // 返回被删除的节点  包括关联的节点
      }
    }

    // 根据startLableInfo 和 endlabelInfo 信息去找
    let startLabelList;
    let endLabelList;
    if (path.startLabel) {
      startLabelList = this.nodeList.labelNodeList.filter((el) => {
        if (typeof path.startLabel.id !== "undefined") {
          return el.id === path.startLabel.id;
        }
        return compare(path.startLabel, el);
      });
      if (!startLabelList.length || startLabelList.length > 1) {
        throw new Error(`无效的标签描述。`);
      }
    }

    if (path.endLabel) {
      endLabelList = this.nodeList.labelNodeList.filter((el) => {
        if (typeof path.endLabel.id !== "undefined") {
          return el.id === path.endLabel.id;
        }
        return compare(path.endLabel, el);
      });

      if (!endLabelList.length || endLabelList.length > 1) {
        throw new Error(`无效的标签描述。`);
      }
    }

    // 当id 不存在的时候；生成最新的pathInfo；再去从pathNodeList 找对应的 虚拟节点
    const newPathInfo = {};

    if (startLabelList?.length) {
      newPathInfo.startLabel = startLabelList[0];
    }
    if (endLabelList?.length) {
      newPathInfo.endLabel = endLabelList[0];
    }
    if (path.textContent) {
      newPathInfo.textContent = path.textContent;
    }
    if (path.exData) {
      newPathInfo.exData = path.exData;
    }

    // 如果存在换行的话 ; 这种情况会存在 3个
    let pathList = this.nodeList.pathNodeList.filter((el) => {
      return compare(newPathInfo, el);
    });

    if (pathList.length === 1 || pathList.length === 3) {
      let vpath = pathList[0]; // 找到那个唯一的vpath 路径节点
      let i = this.nodeList.pathNodeList.length;
      while (i--) {
        let pathItem = this.nodeList.pathNodeList[i];
        // 把相关联的 路径都删掉
        if (
          pathItem.startLabel.id === vpath.startLabel.id &&
          pathItem.endLabel.id === vpath.endLabel.id &&
          pathItem.textContent === vpath.textContent &&
          pathItem.exData === vpath.exData
        ) {
          this.$relationLayer.removeChild(pathItem.$el);
          this.nodeList.pathNodeList.splice(i, 1);
        }
      }
      this.$pscalculator.removePath(vpath); // 去pscalculatorc 重新计算位置信息；
      return pathList; // 返回被删除的节点
    }

    if (!pathList.length || pathList.length !== 3) {
      throw new Error("找不到该路径或该路径存在多个");
    }
  }

  /**
   * 通过pathExData 删除vpath
   * @param {string} pathExData - 路径节点的exData
   * @returns vpath - 被删除的虚拟节点
   */
  removePathByExData(pathExData) {
    let pathList = this.nodeList.pathNodeList.filter(
      (el) => el.exData === pathExData
    );

    if (pathList.length === 1 || pathList.length === 3) {
      let vpath = pathList[0]; // 取第一条路径
      let i = this.nodeList.pathNodeList.length;
      while (i--) {
        if (this.nodeList.pathNodeList[i].exData === vpath.exData) {
          this.$relationLayer.removeChild(this.nodeList.pathNodeList[i].$el);
          this.nodeList.pathNodeList.splice(i, 1);
        }
      }
      this.$pscalculator.removePath(vpath); // 去pscalculatorc 重新计算位置信息；
      return pathList; // 返回被删除的节点
    }

    if (!pathList.length || pathList.length !== 3) {
      throw new Error("找不到该路径或该路径存在多个");
    }
  }
  /**
   * 编辑路径
   * @param {Object} vpath -虚拟节点
   * @param {String} textContent - 修改后的的文本内容
   * @param {Object} style - 标签样式
   * @param {string} style.highlightColor - 路径高亮时的颜色
   * @param {string} style.backgroundColor - 路径正常显示时的颜色
   * @returns 修改成功后的vpath
   */
  __editPathByInfo(vpath, textContent, style) {
    // 如果将要改成的路径 与已经存在的路径一样 ；则不允许改变
    const samePath = this.nodeList.pathNodeList.find((item) => {
      return (
        item.startLabel.id === vpath.startLabel.id &&
        item.endLabel.id === vpath.endLabel.id &&
        item.textContent === textContent
      );
    });

    if (samePath) {
      return;
    }
    // 找到要修改的那个path 虚拟节点  如果是换行的path ;找到其中一个vpath;
    const path = this.nodeList.pathNodeList.find((item) => {
      return item.id === vpath.id;
    });
    if (!path) {
      return;
    }
    this.$pscalculator.editPath(path, textContent, style); // 这里是 根据 path 去找到pathData里面对应的原始数据；

    // 返回修改成功后的 vpath;  可能返回一个  也可能返回3个
    return this.nodeList.pathNodeList.filter((item) => {
      return (
        item.startLabel.id === vpath.startLabel.id &&
        item.endLabel.id === vpath.endLabel.id &&
        item.exData === vpath.exData
      );
    });
  }

  /**
   * 通过pathInfo textContent style 修改path
   * @param {Object} path
   * @param {string} path.id - 路径的id
   * @param {object} path.startLabel - 路径的开始标签信息
   * @param {object} path.endLabel - 路径的结束标签信息
   * @param {object} path.textContent - 路径上的标签文本
   * @param {object} path.exData - 路径自定义信息
   *
   * @param {string} path.startLabel.id - 开始标签的id
   * @param {string} path.startLabel.startIndex - 开始标签的开始序号
   * @param {string} path.startLabel.endIndex - 开始标签的结束序号
   * @param {string} path.startLabel.textContent - 开始标签的文本
   * @param {string} path.startLabel.exData - 开始标签的exData
   * @param {object} path.endLabel - endlabel 包含的信息 与startLabel类似
   * @param {string} textContent - 路径修改后的文本
   * @param {Object} style - 标签样式
   * @param {string} style.highlightColor - 路径高亮时的颜色
   * @param {string} style.backgroundColor - 路径正常显示时的颜色
   */
  editPath(path, textContent, style) {
    style = deepMerge(
      {
        backgroundColor: this.style.backgroundColor,
      },
      this.style.path,
      style
    );

    if (typeof path.id !== "undefined") {
      // 根据path的id 找到相应的虚拟节点
      let pathList = this.nodeList.pathNodeList.filter(
        (el) => el.id === path.id
      );
      if (!pathList.length || pathList.length > 1) {
        throw new Error("路径信息id 有误");
      }
      // 如果唯一id 的path 存在 则删除这个 vpath 即可
      if (pathList.length === 1) {
        let vpath = pathList[0];
        const newVpath = this.__editPathByInfo(vpath, textContent, style); //如果是换行  任意一个vpath 最后都能修改成功
        return newVpath;
      }
    }

    // 如果path里面提供的 东西 没有 startLabel endLabel ;但也能找到 唯一的 path ?
    let startLabelList;
    let endLabelList;
    if (path.startLabel) {
      startLabelList = this.nodeList.labelNodeList.filter((el) => {
        if (typeof path.startLabel.id !== "undefined") {
          return el.id === path.startLabel.id;
        }
        return compare(path.startLabel, el);
      });
      if (!startLabelList.length || startLabelList.length > 1) {
        throw new Error(`无效的标签描述。`);
      }
    }

    if (path.endLabel) {
      endLabelList = this.nodeList.labelNodeList.filter((el) => {
        if (typeof path.endLabel.id !== "undefined") {
          return el.id === path.endLabel.id;
        }
        return compare(path.endLabel, el);
      });

      if (!endLabelList.length || endLabelList.length > 1) {
        throw new Error(`无效的标签描述。`);
      }
    }

    // 当id 不存在的时候；生成最新的pathInfo；再去从pathNodeList 找对应的 虚拟节点
    const newPathInfo = {};

    if (startLabelList?.length) {
      newPathInfo.startLabel = startLabelList[0];
    }
    if (endLabelList?.length) {
      newPathInfo.endLabel = endLabelList[0];
    }
    if (path.textContent) {
      newPathInfo.textContent = path.textContent;
    }
    if (path.exData) {
      newPathInfo.exData = path.exData;
    }

    // 得到的数据 可能为 1 也可能为 3

    let pathList = this.nodeList.pathNodeList.filter((el) => {
      return compare(newPathInfo, el);
    });
    if (pathList.length === 1 || pathList.length === 3) {
      let vpath = pathList[0]; // 找到那个唯一的vpath 路径节点
      const newVpath = this.__editPathByInfo(vpath, textContent, style);
      return newVpath;
    }
    if (!pathList.length || pathList.length !== 3) {
      throw new Error("找不到该路径或该路径存在多个");
    }
  }

  /**
   * 通过pathExData 找到path 并修改
   * @param {string} pathExData - 路径的 exData
   * @param {string} textContent - 路径修改后的文本
   * @param {Object} style - 标签样式
   * @param {string} style.highlightColor - 路径高亮时的颜色
   * @param {string} style.backgroundColor - 路径正常显示时的颜色
   * @returns {object} - newVpath 修改后的vpath
   */
  editPathByExData(pathExData, textContent, style) {
    style = deepMerge(
      { backgroundColor: this.style.backgroundColor },
      this.style.path,
      style
    ); // 如果没传 就使用默认的；传了就使用穿得style
    // 如果是换行的路径 ；则会有 3 个 vpath;
    let pathList = this.nodeList.pathNodeList.filter(
      (el) => el.exData === pathExData
    );
    if (pathList.length === 1 || pathList.length === 3) {
      let vpath = pathList[0];
      const newVpath = this.__editPathByInfo(vpath, textContent, style);
      return newVpath;
    }
    if (!pathList.length || pathList.length !== 3) {
      throw new Error("找不到该路径或该路径存在多个");
    }
  }

  /**
   * 获取文本信息
   * @private
   * @param {number} start - 起始节点索引
   * @param {number} end - 结束节点索引
   * @returns {{fromIndex:number;toIndex:number;text:string;fromNode:VText;toNode:VText;}}
   */
  __getTextInfoBy(start, end) {
    if (start === -1 && end === -1) {
      return {
        start: -1,
        end: -1,
        text: "",
      };
    }
    if (start < 0) {
      start = 0;
    }
    if (end < 0) {
      end = 0;
    }
    return {
      fromIndex: start,
      toIndex: end,
      text: this.$pscalculator.text.slice(start, end + 1),
      fromNode: this.nodeList.textNodeList[start].$el,
      toNode: this.nodeList.textNodeList[end].$el,
    };
  }

  /**
   * 添加标签高亮
   * @param {VLabel} vlabel
   * @param {boolean} scrollTo - 是否自动滚动至可视区域
   */
  highlightLabel(vlabel, scrollTo) {
    const targets = this.nodeList.labelNodeList.filter((el) => {
      if (typeof vlabel.id !== "undefined") {
        return el.id === vlabel.id;
      }
      return compare(vlabel, el);
    });
    if (targets.length === 0) {
      throw new Error("未找到对应标签。");
    }
    if (targets.length > 1) {
      throw new Error("未找到唯一标签。");
    }

    this.__addHeightLight(targets[0], this.style.label.highlightColor);
    if (scrollTo) {
      this.scrollToLabel(targets[0]);
    }
  }

  /**
   * 通过扩展属性添加标签高亮
   * @param {*} exData
   * @param {boolean} scrollTo - 是否自动滚动至可视区域
   */
  highlightLabelByExData(exData, scrollTo) {
    const targets = this.nodeList.labelNodeList.filter(
      (el) => el.exData === exData
    );
    if (targets.length === 0) {
      throw new Error("未找到对应标签。");
    }
    if (targets.length > 1) {
      throw new Error("未找到唯一标签。");
    }

    this.__addHeightLight(targets[0], this.style.label.highlightColor);
    if (scrollTo) {
      this.scrollToLabel(targets[0]);
    }
  }

  /**
   * 移除标签高亮
   * @param {VLabel} vlabel
   */
  cancelHighlightLabel(vlabel) {
    const targets = this.nodeList.labelNodeList.filter((el) => {
      if (typeof vlabel.id !== "undefined") {
        return el.id === vlabel.id;
      }
      return compare(vlabel, el);
    });
    if (targets.length === 0) {
      throw new Error("未找到对应标签。");
    }
    if (targets.length > 1) {
      throw new Error("未找到唯一标签。");
    }

    this.__removeHeightLight(targets[0]);
  }

  /**
   * 通过扩展属性移除标签高亮
   * @param {*} exData
   */
  cancelHighlightLabelByExData(exData) {
    const targets = this.nodeList.labelNodeList.filter(
      (el) => el.exData === exData
    );
    if (targets.length === 0) {
      throw new Error("未找到对应标签。");
    }
    if (targets.length > 1) {
      throw new Error("未找到唯一标签。");
    }

    this.__removeHeightLight(targets[0]);
  }

  /**
   * 滚动至指定标签位置
   * @param {VLabel} vlabel
   */
  scrollToLabel(vlabel) {
    const targets = this.nodeList.labelNodeList.filter((el) => {
      if (typeof vlabel.id !== "undefined") {
        return el.id === vlabel.id;
      }
      return compare(vlabel, el);
    });
    if (targets.length === 0) {
      throw new Error("未找到对应标签。");
    }
    if (targets.length > 1) {
      throw new Error("未找到唯一标签。");
    }
    this.$root.scrollTop = targets[0].y;
  }

  /**
   * 连续点击收集标签
   */
  collectLabel() {
    return new Promise((resolve, reject) => {
      let collectedLabel = {
        startLabel: null,
        endLabel: [],
      };
      let collectLabelHandler = (target, data) => {
        target.target.mouseoverListener = null; // 悬停高亮事件效果移除
        target.target.mouseleaveListener = null; // 离开 事件移除
        this.__addHeightLight(target.target, this.style.label.highlightColor);
        if (collectedLabel.startLabel) {
          collectedLabel.endLabel.push(target.target);
        }
        if (!collectedLabel.startLabel) {
          collectedLabel.startLabel = target.target;
        }
      };
      this.$bus.addEventListener("labelClick", collectLabelHandler);

      // 收集标签行为 改变 事件处理函数
      let collectLabelStatusHandler = (data) => {
        this.$bus.remove("labelClick", collectLabelHandler); // 移除监听事件
        this.$bus.remove("CollectLabelStatus", collectLabelStatusHandler);
        let totalCollectedLabel = collectedLabel.endLabel.concat(
          collectedLabel.startLabel
        );
        if (collectedLabel.startLabel) {
          totalCollectedLabel.forEach((item) => {
            this.__removeHeightLight(item);
            item.mouseoverListener = () => {
              this.__addHeightLight(item, this.style.label.highlightColor);
            };
            item.mouseleaveListener = () => {
              this.__removeHeightLight(item);
            };
          });
        }
        if (data.target) {
          resolve(collectedLabel); // 结束收集标签；返回数据
          return;
        }
        collectedLabel.startLabel = null;
        collectedLabel.endLabel = [];
        reject(collectedLabel); // 取消收集标签；返回空数据
      };
      // 监听的事件;
      this.$bus.addEventListener(
        "CollectLabelStatus",
        collectLabelStatusHandler
      );
    });
  }

  /**
   * 结束收集标签;并返回已收集的标签
   */
  endCollectLabel() {
    this.$bus.emit("CollectLabelStatus", true);
  }

  /**
   * 取消收集标签;不返回收集的标签
   */
  cancelCollectLabel() {
    this.$bus.emit("CollectLabelStatus", false);
  }

  /**
   * 标签和对应的标记添加高亮效果
   * @param {Object} vlabel
   * @param {String} style
   */
  __addHeightLight(vlabel, style) {
    // 找到标签对应的标记
    const currentMark = this.nodeList.labelMarkNodeList.find(
      (markItem) => markItem.labelId === vlabel.id
    );
    // console.log(currentMark);
    currentMark.textList.forEach((item) => {
      item.$el.setAttribute("fill", style);
    });
    vlabel.$el.children[0].setAttribute("stroke", style);
    vlabel.$el.children[0].setAttribute("stroke-width", "1.5");
  }

  /**
   * 移出高亮效果
   * @param {Object} vlabel
   */
  __removeHeightLight(vlabel) {
    const currentMark = this.nodeList.labelMarkNodeList.find((markItem) => {
      return markItem.labelId === vlabel.id;
    });
    currentMark.textList.forEach((item) => {
      item.$el.removeAttribute("fill");
    });
    // 移出标签高亮效果
    vlabel.$el.children[0].removeAttribute("stroke");
    vlabel.$el.children[0].removeAttribute("stroke-width");
  }

  /**
   *  删除 toplayer中对应的 高亮显示节点
   */
  __removeToplayerChildren() {
    for (let i = 0; i < this.$topLayer.children.length; i++) {
      this.$topLayer.removeChild(this.$topLayer.children[i]);
    }
  }

  /**
   * 创建节点
   * @private
   */
  __create() {
    // 创建并挂载容器节点
    this.$svg = SVGFactory.createSVG();
    this.$svg.setAttribute("type", "carver__svg");
    this.$svg.setAttribute("width", this.$root.offsetWidth);
    this.$svg.style.backgroundColor = this.style.backgroundColor;
    this.$markLayer = SVGFactory.createG();
    this.$textLayer = SVGFactory.createG();
    this.$labelLayer = SVGFactory.createG();
    this.$relationLayer = SVGFactory.createG();
    this.$topLayer = SVGFactory.createG();
    this.$dottedLineLayer = SVGFactory.createG();
    this.$topLayer.style.pointerEvents = "none"; // 鼠标事件自动添加到下一层
    this.$svg.appendChild(this.$markLayer);
    this.$svg.appendChild(this.$textLayer);

    this.$svg.appendChild(this.$relationLayer);
    this.$svg.appendChild(this.$labelLayer);
    this.$svg.appendChild(this.$topLayer);
    this.$svg.appendChild(this.$dottedLineLayer);
    this.$root.append(this.$svg);
    this.$root.style.overflowY = "auto";
    this.$root.style.overflowX = "hidden";

    this.__setSelectStatus(0); // 设置划词选中状态
    // 注册事件
    this.$bus.register([
      "textSelect",
      "textCancel",
      "rowOffsetY",
      "textPositionChange",
      "labelClick",
      "labelStyleChange",
      "pathClick",
      "CollectLabelStatus",
    ]);

    this.$pscalculator.$bus = this.$bus; // 为位置计算工具设置事件总线

    // 设置文本位置计算监听事件
    this.$pscalculator.onTextCalc = ({ textInfo, box }, refresh) => {
      // 如果文本发生更新
      this.__onTextCalc(textInfo, refresh);
      this.$svg.setAttribute("height", box.height);
    };
    // 添加标签信息监听
    this.$pscalculator.onLabelCalc = ({ labelInfo, box }) => {
      const { newLabel } = labelDiff(this.nodeList.labelNodeList, labelInfo);
      this.$svg.setAttribute("height", box.height);
      if (!newLabel) {
        return;
      }
      newLabel.forEach((item) => {
        const vlabel = this.$vnodeFactory.createNode(
          "vlabel",
          {
            position: {
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              rowIndex: item.rowIndex,
            },
            textContent: item.textContent,
            startIndex: item.startIndex,
            endIndex: item.endIndex,
          },
          item.exData
        );
        vlabel.$bus = this.$bus;
        vlabel.createElement(item.style);
        this.nodeList.labelNodeList.push(vlabel);
        this.$labelLayer.appendChild(vlabel.$el);
        this.__addLabelMark({
          fromIndex: item.startIndex,
          toIndex: item.endIndex,
          labelId: vlabel.id,
          style: item.style,
        });
        vlabel.mouseoverListener = () => {
          this.__addHeightLight(vlabel, this.style.label.highlightColor);
        };
        vlabel.mouseleaveListener = () => {
          this.__removeHeightLight(vlabel);
        };
      });
    };

    // 监听标签点击事件
    this.$bus.addEventListener("labelClick", ({ target, data }) => {
      if (this.onLabelClick) {
        if (JSON.stringify(this.lineData) != "{}") {
          return;
        }
        this.onLabelClick(target, data);
      }
    });

    // 监听pathInfo变化
    this.$pscalculator.onPathCalc = ({ pathInfo }) => {
      this.__deleteRepeatedPath(pathInfo); // 在 pathNodelist中找到与新添加的路径信息的 singleLine 相反的节点； 并删除
      const { updated, newPath } = pathDiff(
        this.nodeList.pathNodeList,
        pathInfo
      );

      if (!newPath) {
        this.__sortsPathNode(); //  diff算法运行后；对 $relationLayer 的子节点进行排序
        return;
      }
      for (let i = 0; i < newPath.length; i++) {
        const vpath = this.$vnodeFactory.createNode(
          "vpath",
          {
            position: {
              x: 0,
              y: 0,
              width: newPath[i].width,
              height: newPath[i].height,
              rowIndex: newPath[i].rowIndex ? newPath[i].rowIndex : "",
            },
            textContent: newPath[i].textContent,
            startLabel: newPath[i].startLabel,
            endLabel: newPath[i].endLabel,
            pathPosition: newPath[i].pathPosition,
            style: newPath[i].style,
            isArrow: newPath[i].isArrow,
            singleLine: newPath[i].singleLine,
            connect: newPath[i].connect,
          },
          newPath[i].exData
        );
        vpath.$bus = this.$bus;
        vpath.createElement();
        this.nodeList.pathNodeList.push(vpath);
        this.$relationLayer.appendChild(vpath.$el);
        vpath.pathTextClick = (el) => {
          this.removePath(el);
        };
        // 鼠标移入显示高亮，移除不显示高亮
        vpath.pathTextMouseover = (el) => {
          // 在虚拟节点中找出与之相关联的节点;做联动效果
          this.nodeList.pathNodeList.forEach((pathItem) => {
            if (
              pathItem.startLabel.id === el.startLabel.id &&
              pathItem.endLabel.id === el.endLabel.id &&
              pathItem.exData === el.exData &&
              pathItem.textContent === el.textContent
            ) {
              this.__addHeightLight(
                pathItem.startLabel,
                pathItem.style.highlightColor
              );
              this.__addHeightLight(
                pathItem.endLabel,
                pathItem.style.highlightColor
              );
              this.$topLayer.appendChild(pathItem.svgGroupClone);
            }
          });
        };
        vpath.pathTextMouseleave = (el) => {
          // 在虚拟节点中找出与之相关联的节点;做联动效果
          this.nodeList.pathNodeList.forEach((pathItem) => {
            if (
              pathItem.startLabel.id === el.startLabel.id &&
              pathItem.endLabel.id === el.endLabel.id &&
              pathItem.exData === el.exData &&
              pathItem.textContent === el.textContent
            ) {
              this.__removeHeightLight(pathItem.startLabel);
              this.__removeHeightLight(pathItem.endLabel);
              this.$topLayer.removeChild(pathItem.svgGroupClone);
            }
          });
        };
      }
      this.__sortsPathNode(); // 添加完路径；对所有路径重新排序
    };
    // 监听路径标签点击事件
    this.$bus.addEventListener("pathClick", ({ target, data }) => {
      if (this.onPathClick) {
        this.onPathClick(target, data);
      }
    });

    // 监听宽度变化
    this.$pscalculator.onWidthChange = (width) => {
      if (!this.$svg) {
        return;
      }
      this.$svg.setAttribute("width", width);
    };
  }

  /**
   * 路径节点排序
   */
  __sortsPathNode() {
    if (this.nodeList.pathNodeList.length) {
      this.nodeList.pathNodeList.sort(this.__sortByValue("y2")); // 对于父节点中已经存在的节点；再次添加节点不会重复添加；只是会改变顺序
      this.nodeList.pathNodeList.forEach((item) => {
        this.$relationLayer.appendChild(item.$el);
      });
    }
  }

  /**
   * 根据对象的某个属性进行排序
   * @param {String} value
   * @returns
   */
  __sortByValue(value) {
    return function (a, b) {
      return a.pathPosition[value] - b.pathPosition[value];
    };
  }

  /**
   * // 在 pathNodelist中找到与新添加的路径信息的 singleLine 相反的节点； 并删除
   * @param {Object} pathInfo
   */
  __deleteRepeatedPath(pathInfo) {
    for (let i = 0; i < pathInfo.length; i++) {
      const pathItem = pathInfo[i];
      for (let j = 0; j < this.nodeList.pathNodeList.length; j++) {
        const vnodeItem = this.nodeList.pathNodeList[j];
        if (
          pathItem.startLabel.id === vnodeItem.startLabel.id &&
          pathItem.endLabel.id === vnodeItem.endLabel.id &&
          pathItem.exData === vnodeItem.exData &&
          pathItem.textContent === vnodeItem.textContent &&
          pathItem.singleLine === !vnodeItem.singleLine
        ) {
          this.nodeList.pathNodeList.splice(j, 1);
          this.$relationLayer.removeChild(vnodeItem.$el);
          j--;
          break;
        }
      }

    }
  }

  /**
   * 文本位置信息计算监听
   * @private
   * @param {object[]} textInfo
   * @param {number} textInfo.rowIndex
   * @param {number} textInfo.index
   * @param {string} textInfo.value
   * @param {number} textInfo.width
   * @param {number} textInfo.x
   * @param {number} textInfo.y
   * @param {boolean} refresh - 是否刷新文本
   * @returns
   */
  __onTextCalc(textInfo, refresh) {
    // 刷新全部文本节点
    if (refresh) {
      const temp = [];
      textInfo.forEach((item) => {
        const vtext = this.$vnodeFactory.createNode("vtext", {
          position: {
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rowIndex: item.rowIndex,
          },
          index: item.index,
          textContent: item.textContent,
        });
        vtext.$bus = this.$bus;
        vtext.createElement({ fontSize: this.config.fontSize });
        temp.push(vtext);
      });
      this.__setTextNode(temp);
      return;
    }
    // 比较节点位置信息 对位置发生变化的节点进行更新
    textDiff(this.nodeList.textNodeList, textInfo);
  }
  /**
   * 设置文本节点信息
   * @private
   * @param {VText[] | VText} list - 文本节点信息
   * @param {string} [id] - 文本节点id 注：当list为VText类型且id存在时，表示更新指定节点信息；当list为数组类型时表示更新全部文本节点
   */
  __setTextNode(list, id) {
    // 更新全部节点
    if (list instanceof Array) {
      this.nodeList.textNodeList.forEach((item) => {
        item.remove();
      });
      this.nodeList.textNodeList = list;
      this.nodeList.textNodeList.forEach((item) => {
        this.$textLayer.appendChild(item.$el);
      });
      return;
    }

    // 更新指定节点
    if (list instanceof VText && id) {
      return;
    }
  }
  /**
   * 监听根节点容器大小变化 在容器位置大小变化结束后重新获取容器真实宽度
   * @private
   */
  __onResize() {
    if (!this.autoResize) {
      return;
    }
    let lastWidth = this.$root.offsetWidth;
    this.$pscalculator.width = lastWidth;
    let change = false;
    setInterval(() => {
      const width = this.$root.offsetWidth;
      if (change === false && width !== lastWidth) {
        change = true;
      }
      if (change === true && width === lastWidth) {
        change = false;
        this.$pscalculator.width = width; // 通过改变pscalculator的监听属性width来使得内容重新排版
      }
      lastWidth = width;
    }, this.onResizeinterval);
  }
}

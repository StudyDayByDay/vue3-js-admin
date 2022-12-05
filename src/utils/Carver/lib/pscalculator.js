import { getCharPix, rectIsOverlap } from "../util/index.js";
import { VLabel } from "../vnode/vlabel.js";

export class PSCalculator {
  /**
   * 构造函数
   * @param {object} [options]
   * @param {string} options.text
   * @param {number} options.width
   * @param {number} options.paddingTop
   * @param {number} options.paddingRight
   * @param {number} options.paddingBottom
   * @param {number} options.paddingLeft
   * @param {number} options.lineHeight
   * @param {number} options.letterSpacing
   * @param {number} options.fontSize
   * @param {string} options.linebreaks
   * @param {string} options.segmentSpacing
   * @param {string} options.beforeParagraph
   */
  constructor(options) {
    this.onTextCalc = null; // 文本信息发生改变时的监听事件 ({textInfo, box}, refresh) => viod
    this.onLabelCalc = null; // 标签信息发生改变时的监听事件(lableInfo) => viod
    this.onWidthChange = null; // 容器宽度发生变化的监听事件 (width) => viod
    this.left = 0; // 左侧坐标即计算位置时的最小x坐标
    this.right = 0; // 右侧坐标即计算位置时的最大右侧坐标
    this.options = {
      text: "", // 文本
      width: 0, // 容器宽度
      paddingTop: 0, // 上边距
      paddingRight: 0, // 右边距
      paddingBottom: 0, // 下边距
      paddingLeft: 0, // 左边距
      lineHeight: 0, // 行高
      letterSpacing: 0, // 字间距
      fontSize: 0, // 字体大小
      linebreaks: "", // 换行符
      segmentSpacing: 0, // 段间距
      beforeParagraph: 0, // 段前
    };
    this.wrapInfo = []; // 文本换行信息
    this.textInfo = []; // 计算后的文本位置信息
    this.labelData = []; // 标签原始数据
    this.labelInfo = []; // 计算后的标签位置信息
    this.pathData = []; // 路径原始数据
    this.pathInfo = []; // 路径的坐标点信息
    this.$bus = null; // 事件总线
    this.setOptions(options);
    this.__setWatcher();
  }

  /**
   * 设置配置参数
   * @param {object} options
   */
  setOptions(options) {
    Object.assign(this.options, options);
    this.__optionsChange(options);
  }

  /**
   * 参数配置变化触发
   * @private
   * @param {object}map - 发生改变的属性和值
   */
  __optionsChange(map) {
    if (!map) {
      return;
    }

    // 宽度或右侧边距发生变化时重新计算右侧坐标
    if (
      typeof map.width !== "undefined" ||
      typeof map.paddingRight !== "undefined"
    ) {
      this.right = this.options.width - this.options.paddingRight;
    }

    // 宽度监听
    if (typeof map.width !== "undefined" && this.onWidthChange) {
      this.onWidthChange(map.width);
    }

    // 当左侧边距发生变化时重新计算左侧边距
    if (typeof map.paddingLeft !== "undefined") {
      this.left = this.options.paddingLeft;
    }

    let refresh = typeof map.text !== "undefined";
    if (refresh) {
      this.wrapInfo = []; // 文本换行信息
      this.textInfo = []; // 计算后的文本位置信息
      this.labelData = []; // 标签原始数据
      this.labelInfo = []; // 计算后的标签位置信息
      this.pathData = []; // 路径原始数据
      this.pathInfo = []; // 路径的坐标点信息
    }
    this.__textCalc(refresh);
    this.__refreshLabel();
  }

  /**
   * 获取指定行的位置范围
   * @param {number} rowIndex - 行号
   * @returns {{x0:number;y0:number;x1:number;y1:number}}
   */
  getRowPosition(rowIndex) {
    const rows = this.textInfo.filter((item) => item.rowIndex === rowIndex); // 找出当前行的文本节点
    const start = rows[0]; // 当前行的第一个文本节点
    const end = rows[rows.length - 1]; // 当前行的最后一个文本节点
    // 行偏移高度
    let offsetHeight = this.wrapInfo
      .filter((item) => item.rowIndex <= rowIndex)
      .reduce((total, { height }) => total + height, 0);

    return {
      x0: start.x,
      y0: start.y + offsetHeight,
      x1: end.x + end.width,
      y1: end.y + end.height + offsetHeight,
    };
  }

  /**
   * 文本位置信息计算
   * @private
   * @param {boolean} [refresh] - 是否刷新文本
   */
  __textCalc(refresh = false) {
    const text = this.options.text;
    if (!text) {
      return;
    }
    const temp = []; // 文本信息临时存储

    let rowIndex = 1; // 行号 从1开始
    let currentRowWidth = 0; // 当前行宽累计
    let segmentSpacingCount = 0; // 段间距累计
    const maxWidth = this.right - this.left; // 减去边距后的最大行宽
    let beforeParagraph = 0; // 段前空白间距

    for (let i = 0; i < text.length; i++) {
      const textItem = text.charAt(i); // 第i个字符
      const textSize = getCharPix(textItem, this.options.fontSize); // 获取字符像素大小

      // 字符像素宽度 + 字间距
      const width = textSize.width + this.options.letterSpacing;

      // 当前字符是否为换行符
      const isLinebreaks = textItem === this.options.linebreaks;
      segmentSpacingCount += isLinebreaks ? this.options.segmentSpacing : 0; // 如果时换行符则累加段间距

      // 如果是换行符或者是第一个字符 计算段前空白间距
      if (isLinebreaks || i === 0) {
        beforeParagraph = this.options.beforeParagraph;
      }

      // 是否换行
      const isWrap = currentRowWidth + width + beforeParagraph > maxWidth;

      // 若换行重新计算行号和新的行宽
      if (isLinebreaks || isWrap) {
        rowIndex++;
        currentRowWidth = 0;
        if (temp[i - 1]) {
          temp[i - 1]["lineEnd"] = true; // 是否为行尾
        }
      }
      // 若非换行符控制换行 则清除段前空白间距
      if (isWrap && !isLinebreaks) {
        beforeParagraph = 0;
      }

      temp.push({
        rowIndex, // 行号
        index: i, // 索引
        textContent: textItem, // 字符
        width, // 字符像素宽度
        height: textSize.height, // 字符像素宽度
        x: this.left + currentRowWidth + beforeParagraph, // 横坐标
        y:
          this.options.paddingTop +
          (rowIndex - 1) * this.options.lineHeight +
          segmentSpacingCount, // 纵坐标
        lineBegin: currentRowWidth === 0, // 是否为行首
      });

      currentRowWidth += width; // 累加行宽
    }

    this.textInfo = temp; // 保存文本位置信息

    // 如果存在文本计算监听回调 则执行
    if (this.onTextCalc) {
      this.onTextCalc(
        {
          textInfo: this.textInfo, // 文本位置信息
          box: {
            // 容器高度
            height: this.__getTotalHeight(),
          },
        },
        refresh // 是否重绘文本
      );
    }
  }

  /**
   * 添加标签
   * @param {object[]} data
   * @param {number} data[].startIndex - 关联文本起始字符索引值
   * @param {number} data[].endIndex - 关联文本结束字符索引值
   * @param {string} data[].textContent - 标签内容
   * @param {*} data[].exData - 自定义数据
   * @param {object} [data[].style] - 标签样式
   * @param {string} [data[].style.backgroundColor] - 背景颜色
   * @param {string} [data[].style.color] - 文字颜色
   */
  addLabel(data) {
    if (!data || !data.length) {
      return;
    }
    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // 为了保证标签的唯一性 不允许存在startIndex、endIndex、textContent、exData完全相同的标签
      if (
        this.labelData.findIndex(
          (el) =>
            el.startIndex === item.startIndex &&
            el.endIndex === item.endIndex &&
            el.textContent === item.textContent &&
            el.exData === item.exData
        ) >= 0
      ) {
        continue;
      }
      this.labelData.push(item);
      const { labelInfo, offsetInfo } = this.__getLabelInfo(item);
      if (offsetInfo.linebreaks) {
        this.__setWrapInfo(offsetInfo);
        this.labelInfo.forEach((el) => {
          if (el.rowIndex >= offsetInfo.rowIndex) {
            el.y += offsetInfo.height;
          }
        });
      }
      this.labelInfo.push(labelInfo);
    }

    // 标签位置发生变化时执行回调
    if (this.onLabelCalc) {
      this.onLabelCalc({
        labelInfo: this.labelInfo,
        box: {
          height: this.__getTotalHeight(),
        },
      });
      this.__refreshPath(); // 标签信息改变时 重新计算pathInfo ;重新渲染
    }
  }

  /**
   * 移除标签 计算工具只负责计算并移除标签占用的像素位置节点移除实际发生在vm中
   * @param {VLabel} vlabel
   */
  removeLabel(vlabel) {
    // 移除labelData中对应的信息
    const labelDataIndex = this.__findLabelDataIndexBy(vlabel);
    if (labelDataIndex < 0) {
      return;
    }
    this.labelData.splice(labelDataIndex, 1); // 更新labelData
    this.__textCalc(false);
    this.removePathByLabel(vlabel); // 更新pathData
    this.__refreshLabel(); // 更新labelInfo
  }

  /**
   * 编辑标签
   * @param {VLabel} vlabel
   * @param {string} textContent - 标签内容
   * @param {Object} style - 标签样式
   * @param {string} style.color
   * @param {string} style.backgroundColor
   */
  editLabel(vlabel, textContent, style) {
    const labelDataIndex = this.__findLabelDataIndexBy(vlabel);
    if (labelDataIndex < 0) {
      return;
    }
    this.labelData[labelDataIndex].textContent = textContent;
    Object.assign(this.labelData[labelDataIndex].style, style);
    this.__textCalc(false);
    this.__refreshLabel();
  }

  /**
   * 通过虚拟标签查找标签节点对应原始数据索引
   * @param {VLabel} vlabel
   */
  __findLabelDataIndexBy(vlabel) {
    return this.labelData.findIndex(
      ({ startIndex, endIndex, textContent, exData }) =>
        vlabel.startIndex === startIndex &&
        vlabel.endIndex === endIndex &&
        vlabel.textContent === textContent &&
        vlabel.exData === exData
    );
  }

  /**
   * 重新计算label的位置信息
   * @private
   */
  __refreshLabel() {
    this.labelInfo = [];
    this.wrapInfo = [];
    for (let i = 0; i < this.labelData.length; i++) {
      const item = this.labelData[i];
      const { labelInfo, offsetInfo } = this.__getLabelInfo(item);
      if (offsetInfo.linebreaks) {
        this.__setWrapInfo(offsetInfo);
        this.labelInfo.forEach((el) => {
          if (el.rowIndex >= offsetInfo.rowIndex) {
            el.y += offsetInfo.height;
          }
        });
      }
      this.labelInfo.push(labelInfo);
    }

    // 标签位置发生变化时执行回调
    if (this.onLabelCalc) {
      this.onLabelCalc({
        labelInfo: this.labelInfo,
        box: {
          height: this.__getTotalHeight(),
        },
      });
      this.__refreshPath(); // 更新pathInfo
    }
  }

  /**
   * 设置偏移信息
   * @private
   * @param {object} offsetInfo
   * @param {number} offsetInfo.rowIndex
   * @param {number} offsetInfo.height
   */
  __setWrapInfo(offsetInfo) {
    // 先检查当前的偏移信息中是否存在相同行号
    const wrapIndex = this.wrapInfo.findIndex(
      (el) => el.rowIndex === offsetInfo.rowIndex
    );

    // 若存在则更新已存在的偏移信息
    if (wrapIndex >= 0) {
      this.wrapInfo[wrapIndex].height += offsetInfo.height;
    }

    // 若不存在则添加新的偏移信息
    if (wrapIndex < 0) {
      this.wrapInfo.push(offsetInfo);
    }

    this.$bus.emit("rowOffsetY", null, {
      rowIndex: offsetInfo.rowIndex,
      offsetHeight: offsetInfo.height,
    });
  }

  /**
   * 计算标签位置信息
   * @private
   * @param {object} label
   * @param {number} label.startIndex
   * @param {number} label.endIndex
   * @param {string} label.textContent
   * @param {object} [label.style]
   * @returns {{labelInfo:object;offsetInfo:object;}}
   */
  __getLabelInfo(label) {
    const startText = this.textInfo[label.startIndex]; // 起始位置文本节点
    const startRowIndex = startText.rowIndex; // 起始位置的行号
    const labelContentSize = getCharPix(
      label.textContent ? label.textContent : "Carver", // 当标签内容为空时以字符串“Carver”的像素大小为默认大小 用以占位
      "12px"
    ); // 获取文本内容大小
    labelContentSize.width += 4; // +4表示标签边距为2
    labelContentSize.height += 4;

    // 当前行的文本偏移高度
    const textOffset = this.wrapInfo
      .filter((item) => item.rowIndex < startRowIndex)
      .reduce((total, { height }) => total + height, 0);

    // 行前偏移高度
    const rowBefore = this.wrapInfo
      .filter(({ rowIndex }) => rowIndex === startRowIndex)
      .reduce((total, { height }) => total + height, 0);

    // 位置信息
    let position = {
      x: startText.x,
      y: startText.y + textOffset,
      width: labelContentSize.width,
      height: labelContentSize.height,
    };

    // 根据行前是否有偏移高度判定是否需要换行
    let linebreaks = rowBefore ? false : true;

    if (linebreaks) {
      return {
        labelInfo: {
          rowIndex: startRowIndex,
          textContent: label.textContent,
          startIndex: label.startIndex,
          endIndex: label.endIndex,
          ...position,
          style: label.style,
          exData: label.exData,
        },
        offsetInfo: {
          linebreaks: linebreaks,
          rowIndex: startRowIndex,
          height: labelContentSize.height,
        },
      };
    }

    position.y += rowBefore - labelContentSize.height;

    // 获取当前行的位置信息
    const { x0, y0, x1 } = this.getRowPosition(startRowIndex);
    // box中存放行前偏移空间的坐标范围
    const box = {
      x0: x0,
      y0: y0 - rowBefore,
      x1: x1,
      y1: y0,
    };
    // 在已存在的标签中查找在box坐标范围内的标签
    const labelList = this.labelInfo.filter(
      ({ x, y }) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1
    );

    // 判断当前坐标位置是否与已存在的标签位置发生重叠
    let isOverlap = this.__labelIsOverlap(position, labelList);

    if (!isOverlap) {
      return {
        labelInfo: {
          rowIndex: startRowIndex,
          textContent: label.textContent,
          startIndex: label.startIndex,
          endIndex: label.endIndex,
          ...position,
          style: label.style,
          exData: label.exData,
        },
        offsetInfo: {
          linebreaks: false,
        },
      };
    }

    while (isOverlap) {
      if (position.y - labelContentSize.height < box.y0) {
        return {
          labelInfo: {
            rowIndex: startRowIndex,
            textContent: label.textContent,
            startIndex: label.startIndex,
            endIndex: label.endIndex,
            ...position,
            style: label.style,
            exData: label.exData,
          },
          offsetInfo: {
            linebreaks: true,
            rowIndex: startRowIndex,
            height: labelContentSize.height,
          },
        };
      }
      position.y -= labelContentSize.height;
      isOverlap = this.__labelIsOverlap(position, labelList);
    }

    return {
      labelInfo: {
        rowIndex: startRowIndex,
        textContent: label.textContent,
        startIndex: label.startIndex,
        endIndex: label.endIndex,
        ...position,
        style: label.style,
        exData: label.exData,
      },
      offsetInfo: {
        linebreaks: false,
      },
    };
  }

  /**
   * 计算标签位置是否与已经存在的标签位置重叠
   * @private
   * @param {object} position
   * @param {number} position.x
   * @param {number} position.y
   * @param {number} position.width
   * @param {number} position.height
   * @param {position[]} list
   */
  __labelIsOverlap(position, list) {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (rectIsOverlap(item, position)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取文本总高度
   * @private
   * @returns {number}
   */
  __getTotalHeight() {
    const lastY = this.textInfo[this.textInfo.length - 1].y;
    let wrapHeight = this.wrapInfo.reduce(
      (total, item) => total + item.height,
      0
    );
    return (
      lastY + wrapHeight + this.options.lineHeight + this.options.paddingBottom
    );
  }

  /**
   * 添加路径
   * @param {Object} data
   * @param {Object}  data.startLabel - 连线起始标签虚拟节点
   * @param {Object}  data.endLabel - 连线结束标签虚拟节点
   * @param {String}  data.textContent - 连线标签文本内容
   * @param {Object}  data.style - 连线标签高亮颜色
   * @param {Object}  data.exData - 自定义数据
   */
  addLabelPath(data) {
    if (
      this.pathData.findIndex(
        (el) =>
          el.startLabel.id === data.startLabel.id &&
          el.endLabel.id === data.endLabel.id &&
          el.textContent === data.textContent &&
          el.exData === data.exData
      ) >= 0
    ) {
      return;
    }
    this.pathData.push(data); // 保存路径的原始数据； 不允许创建完全相同的路径关系
    const pathInfo = this.__getPathInfo(data); // 返回数据为数组  因为如果存在换行path;会存在两个pathInfo信息;

    this.pathInfo.push(...pathInfo); // 将所有路径信息添加到 数组中
    // 如果偏移信息存在；则设置偏移信息；不存在直接跳过
    pathInfo.forEach((pathInfoItem) => {
      this.__setPathOffset(pathInfoItem);
    });

    this.__getConnectInfo(); // 计算connetInfo
    if (this.onPathCalc) {
      this.onPathCalc({
        pathInfo: this.pathInfo,
      });
    }
  }

  /**
   * 根据最新的pathInfo;生成最新的connnetInfo;并把他并入到pathInfo里
   */
  __getConnectInfo() {
    for (let i = 0; i < this.pathInfo.length; i++) {
      if (this.pathInfo[i].connect === true) {
        this.pathInfo.splice(i, 1);
        i--;
      }
    }
    const needPathInfo = this.pathInfo.filter((item) => {
      return (
        item.startLabel.rowIndex !== item.endLabel.rowIndex &&
        item.connect === false
      );
    });

    let dataArr = []; // 一对一对存放
    needPathInfo.map((mapItem) => {
      if (dataArr.length == 0) {
        dataArr.push({
          startLabelId: mapItem.startLabel.id,
          endLabelId: mapItem.endLabel.id,
          textContent: mapItem.textContent,
          startLabel: mapItem.startLabel,
          endLabel: mapItem.endLabel,
          style: mapItem.style,
          exData: mapItem.exData,
          List: [mapItem],
        });
      } else {
        let res = dataArr.some((item) => {
          //判断相同日期，有就添加到当前项
          if (
            item.startLabelId === mapItem.startLabel.id &&
            item.endLabelId === mapItem.endLabel.id &&
            item.textContent === mapItem.textContent
          ) {
            item.List.push(mapItem);
            return true;
          }
        });
        if (!res) {
          //如果没找相同日期添加一个新对象
          dataArr.push({
            startLabelId: mapItem.startLabel.id,
            endLabelId: mapItem.endLabel.id,
            textContent: mapItem.textContent,
            startLabel: mapItem.startLabel,
            endLabel: mapItem.endLabel,
            style: mapItem.style,
            exData: mapItem.exData,
            List: [mapItem],
          });
        }
      }
    });

    dataArr.forEach((infoItem) => {
      const connectPosition = {}; // 连接路径的坐标点信息存放
      infoItem.List.forEach((pathItem) => {
        if (!pathItem.singleLine) {
          if (!pathItem.isArrow) {
            connectPosition.x1 = pathItem.pathPosition.x4;
            connectPosition.y1 = pathItem.pathPosition.y4;
            connectPosition.x2 = pathItem.pathPosition.x4;
            connectPosition.y2 = pathItem.pathPosition.y4;
          } else {
            connectPosition.x3 = pathItem.pathPosition.x1;
            connectPosition.y3 = pathItem.pathPosition.y1;
            connectPosition.x4 = pathItem.pathPosition.x1;
            connectPosition.y4 = pathItem.pathPosition.y1;
          }
        }
      });
      const connectPathInfo = {
        pathPosition: connectPosition,
        startLabel: infoItem.startLabel,
        endLabel: infoItem.endLabel,
        textContent: infoItem.textContent,
        style: infoItem.style,
        isArrow: false, // 连接路径的标签需要创建箭头
        singleLine: false,
        connect: true, // 标记路经 为连接路径
        exData: infoItem.exData,
        // rowIndex: data.startLabel.rowIndex,
      };
      this.pathInfo.push(connectPathInfo);
    });
  }

  /**
   * 根据每一个 pathInfo的OffsetInfo  设置path,text,label,mark的偏移
   * @param {Object} pathInfo
   */
  __setPathOffset(pathInfo) {
    if (Object.keys(pathInfo.offsetInfo).length !== 0) {
      this.__setWrapInfo(pathInfo.offsetInfo); // 设置偏移信息
      this.pathInfo.forEach((el) => {
        if (el.rowIndex >= pathInfo.offsetInfo.rowIndex) {
          el.pathPosition.y1 += pathInfo.offsetInfo.height;
          el.pathPosition.y2 += pathInfo.offsetInfo.height;
          el.pathPosition.y3 += pathInfo.offsetInfo.height;
          el.pathPosition.y4 += pathInfo.offsetInfo.height;
        }
      });
      // warpInfo  更新后；重新计算labelInfo;再重新通过labelInfo信息；重新创建label标签
      this.labelInfo.forEach((el) => {
        if (el.rowIndex >= pathInfo.offsetInfo.rowIndex) {
          el.y += pathInfo.offsetInfo.height;
        }
      });
      if (this.onLabelCalc) {
        this.onLabelCalc({
          labelInfo: this.labelInfo,
          box: {
            height: this.__getTotalHeight(),
          },
        });
      }
    }
  }

  /**
   * 获取路径信息
   * @param {Object} data
   * @param {Object}  data.startLabel - 连线起始标签虚拟节点
   * @param {Object}  data.endLabel - 连线结束标签虚拟节点
   * @param {String}  data.textContent - 连线标签文本内容
   * @param {Object}  data.style - 连线标签高亮颜色
   * @returns {[pathInfo:Object]}
   */
  __getPathInfo(data) {
    const pathTextSize = getCharPix(data.textContent, "12px");
    pathTextSize.height += 4; // 路径的单行高度为 20
    // 路径标签在同一行
    if (data.startLabel.rowIndex === data.endLabel.rowIndex) {
      const pathInfo = this.__getSameLinePathInfo(data, pathTextSize); // 得到的同一行的pathInfo信息; 单个对象

      this.__getScopeLabel(pathInfo.pathPosition, pathTextSize); // 判断标签是否在路径直线下方的矩形范围内;并改变路径信息直到不存在
      this.__getScopePath(pathInfo.pathPosition, pathTextSize); // 判断当前路径的矩形范围内是否存在其他路径；并改变路径信息直到不存在

      const currentRowIndex = pathInfo.rowIndex; // 当前行的行号
      const { y0 } = this.getRowPosition(currentRowIndex); // 获取当前行信息
      // 当前行与上一行的间距值；
      const rowBefore = this.wrapInfo
        .filter(({ rowIndex }) => rowIndex === currentRowIndex)
        .reduce((total, { height }) => total + height, 0);

      const rowMiny = y0 - rowBefore; // 当前行内最高点坐标的y值
      //  添加每个路径的 offsetInfo信息
      if (pathInfo.pathPosition.y2 < rowMiny) {
        pathInfo.offsetInfo = {
          rowIndex: currentRowIndex,
          height: pathTextSize.height,
        };
      } else {
        pathInfo.offsetInfo = {};
      }
      return [pathInfo];
    }

    // 路径标签不在同一行
    if (data.startLabel.rowIndex !== data.endLabel.rowIndex) {
      const pathInfo = this.__getNotSameLinePathInfo(data, pathTextSize); // 得到的不同的两个 开始路径 和 结束路径 的pathInfo 消息 ;包含两个对象的数组
      pathInfo.forEach((item) => {
        this.__getScopeLabel(item.pathPosition, pathTextSize); // 判断标签是否在路径直线下方的矩形范围内;并改变路径信息直到不存在
        this.__getScopePath(item.pathPosition, pathTextSize); // 判断当前路径的矩形范围内是否存在其他路径；并改变路径信息直到不存在

        // 在上面两个方法中；y4 y1保持不变；但是对于换行的数据而言；y4 和 y1必需 和y2保持一致
        if (!item.isArrow) {
          item.pathPosition.y4 = item.pathPosition.y3;
        }
        if (item.isArrow) {
          item.pathPosition.y1 = item.pathPosition.y2;
        }
        const currentRowIndex = item.rowIndex; // 当前行的行号

        const { y0 } = this.getRowPosition(currentRowIndex); // 获取当前行信息
        // 当前行与上一行的间距值；
        const rowBefore = this.wrapInfo
          .filter(({ rowIndex }) => rowIndex === currentRowIndex)
          .reduce((total, { height }) => total + height, 0);

        const rowMiny = y0 - rowBefore; // 当前行内最高点坐标的y值

        //  添加每个路径的 offsetInfo信息
        if (item.pathPosition.y2 < rowMiny) {
          item.offsetInfo = {
            rowIndex: currentRowIndex,
            height: pathTextSize.height,
          };
        } else {
          item.offsetInfo = {};
        }
      });
      return pathInfo;
    }
  }

  /**
   * 获取标签在同一行的pathInfo 信息
   * @param {Object} data
   * @returns
   */
  __getSameLinePathInfo(data, pathTextSize) {
    const pathPosition = {}; // 标签连线的位置信息存放
    if (data.startLabel.rowIndex === data.endLabel.rowIndex) {
      if (data.startLabel.x < data.endLabel.x) {
        pathPosition.x1 = data.startLabel.x + data.startLabel.width;
        pathPosition.y1 = data.startLabel.y;
        pathPosition.x2 =
          data.startLabel.x + data.startLabel.width + pathTextSize.height;
        pathPosition.y2 =
          data.startLabel.y < data.endLabel.y
            ? data.startLabel.y - pathTextSize.height
            : data.endLabel.y - pathTextSize.height;
        pathPosition.x3 = data.endLabel.x - pathTextSize.height;
        pathPosition.y3 =
          data.startLabel.y < data.endLabel.y
            ? data.startLabel.y - pathTextSize.height
            : data.endLabel.y - pathTextSize.height;
        pathPosition.x4 = data.endLabel.x;
        pathPosition.y4 = data.endLabel.y;
      } else {
        pathPosition.x1 = data.startLabel.x;
        pathPosition.y1 = data.startLabel.y;
        pathPosition.x2 = data.startLabel.x - pathTextSize.height;
        pathPosition.y2 =
          data.startLabel.y < data.endLabel.y
            ? data.startLabel.y - pathTextSize.height
            : data.endLabel.y - pathTextSize.height;
        pathPosition.x3 =
          data.endLabel.x + data.endLabel.width + pathTextSize.height;
        pathPosition.y3 =
          data.startLabel.y < data.endLabel.y
            ? data.startLabel.y - pathTextSize.height
            : data.endLabel.y - pathTextSize.height;
        pathPosition.x4 = data.endLabel.x + data.endLabel.width;
        pathPosition.y4 = data.endLabel.y;
      }

      // 路径所有信息的存放
      const pathInfo = {
        pathPosition,
        startLabel: data.startLabel,
        endLabel: data.endLabel,
        textContent: data.textContent,
        style: data.style,
        isArrow: true, // 在同一行，需要创建标签
        rowIndex: data.startLabel.rowIndex, // 路径若在同一行则取开始标签的行号即可
        singleLine: true,
        connnect: false, // 标识  该路径不是连接路径
        exData: data.exData,
      };

      const baseLength = pathTextSize.width + 2 * pathTextSize.height; // 路径的最低长度；小于这个长度则需要更换路径展示方式；
      const labelsInterval = Math.abs(pathPosition.x1 - pathPosition.x4); // 两个标签之间的间距

      // 针对文字宽度大于路径直线长度 ；对路径的坐标点位置做出一些调整
      if (labelsInterval < baseLength) {
        if (pathPosition.x1 > pathPosition.x4) {
          pathPosition.x1 = data.startLabel.x + data.startLabel.width;
          pathPosition.x2 =
            data.startLabel.x + data.startLabel.width + pathTextSize.height;
          pathPosition.x3 = data.endLabel.x - pathTextSize.height;
          pathPosition.x4 = data.endLabel.x;
        }
        if (pathPosition.x1 < pathPosition.x4) {
          pathPosition.x1 = data.startLabel.x;
          pathPosition.x2 = data.startLabel.x - pathTextSize.height;
          pathPosition.x3 =
            data.endLabel.x + data.endLabel.width + pathTextSize.height;
          pathPosition.x4 = data.endLabel.x + data.endLabel.width;
        }
      }

      return pathInfo; //  初始化的pathInfo信息
    }
  }

  /**
   * 当path路径的两个标签不在同一行
   * @param {Object} data
   * @returns
   */
  __getNotSameLinePathInfo(data, pathTextSize) {
    if (data.startLabel.rowIndex !== data.endLabel.rowIndex) {
      const formPathPosition = {}; // 开始路径
      const toPathPosition = {}; // 结束路径

      const startLabelx0 = data.startLabel.x;
      const startLabelx1 = data.startLabel.x + data.startLabel.width;
      const endLabelx0 = data.endLabel.x;
      const endLabelx1 = data.endLabel.x + data.endLabel.width;
      const leftDistance = startLabelx0 - this.left + (endLabelx0 - this.left);
      const rightDistance =
        this.right - startLabelx1 + (this.right - endLabelx1);
      if (leftDistance >= rightDistance) {
        formPathPosition.x1 = startLabelx1;
        formPathPosition.y1 = data.startLabel.y;
        formPathPosition.x2 = startLabelx1 + pathTextSize.height;
        formPathPosition.y2 = data.startLabel.y - pathTextSize.height;
        formPathPosition.x3 = this.right + 2 * pathTextSize.height;
        formPathPosition.y3 = data.startLabel.y - pathTextSize.height;
        formPathPosition.x4 = this.right + 2 * pathTextSize.height;
        formPathPosition.y4 = data.startLabel.y - pathTextSize.height;

        toPathPosition.x1 = this.right + 2 * pathTextSize.height;
        toPathPosition.y1 = data.endLabel.y - pathTextSize.height;
        toPathPosition.x2 = this.right + 2 * pathTextSize.height;
        toPathPosition.y2 = data.endLabel.y - pathTextSize.height;
        toPathPosition.x3 = endLabelx1 + pathTextSize.height;
        toPathPosition.y3 = data.endLabel.y - pathTextSize.height;
        toPathPosition.x4 = endLabelx1;
        toPathPosition.y4 = data.endLabel.y;

        // 当路径直线距离小于 文本宽度时
        const formLineDistance = Math.abs(
          formPathPosition.x2 - formPathPosition.x3
        );
        const toLineDistance = Math.abs(toPathPosition.x2 - toPathPosition.x3);
        if (formLineDistance <= pathTextSize.width + 10) {
          formPathPosition.x1 = data.startLabel.x;
          formPathPosition.x2 = data.startLabel.x - pathTextSize.height;
        }
        if (toLineDistance <= pathTextSize.width + 10) {
          toPathPosition.x3 = data.endLabel.x - pathTextSize.height;
          toPathPosition.x4 = data.endLabel.x;
        }
      } else {
        formPathPosition.x1 = data.startLabel.x;
        formPathPosition.y1 = data.startLabel.y;
        formPathPosition.x2 = data.startLabel.x - pathTextSize.height;
        formPathPosition.y2 = data.startLabel.y - pathTextSize.height;
        formPathPosition.x3 = this.left - 2 * pathTextSize.height;
        formPathPosition.y3 = data.startLabel.y - pathTextSize.height;
        formPathPosition.x4 = this.left - 2 * pathTextSize.height;
        formPathPosition.y4 = data.startLabel.y - pathTextSize.height;

        toPathPosition.x1 = this.left - 2 * pathTextSize.height;
        toPathPosition.y1 = data.endLabel.y - pathTextSize.height;
        toPathPosition.x2 = this.left - 2 * pathTextSize.height;
        toPathPosition.y2 = data.endLabel.y - pathTextSize.height;
        toPathPosition.x3 = data.endLabel.x - pathTextSize.height;
        toPathPosition.y3 = data.endLabel.y - pathTextSize.height;
        toPathPosition.x4 = data.endLabel.x;
        toPathPosition.y4 = data.endLabel.y;

        // 当路径直线距离小于 文本宽度时
        const formLineDistance = Math.abs(
          formPathPosition.x2 - formPathPosition.x3
        );
        const toLineDistance = Math.abs(toPathPosition.x2 - toPathPosition.x3);
        if (formLineDistance <= pathTextSize.width + 10) {
          formPathPosition.x1 = data.startLabel.x + data.startLabel.width;
          formPathPosition.x2 =
            data.startLabel.x + data.startLabel.width - pathTextSize.height;
        }
        if (toLineDistance <= pathTextSize.width + 10) {
          toPathPosition.x3 =
            data.endLabel.x + data.endLabel.width - pathTextSize.height;
          toPathPosition.x4 = data.endLabel.x + data.endLabel.width;
        }
      }

      // 开始路径
      const formPathInfo = {
        pathPosition: formPathPosition,
        startLabel: data.startLabel,
        endLabel: data.endLabel,
        textContent: data.textContent,
        style: data.style,
        isArrow: false, // 开始路径的标签不需要创建箭头
        rowIndex: data.startLabel.rowIndex, // 开始路径的行号 用的是开始标签的行号
        singleLine: false,
        connect: false, // 标识该路径不是连接路径
        exData: data.exData,
      };
      // 到达路径
      const toPathInfo = {
        pathPosition: toPathPosition,
        startLabel: data.startLabel,
        endLabel: data.endLabel,
        textContent: data.textContent,
        style: data.style,
        isArrow: true, // 结束路径的标签需要创建箭头
        rowIndex: data.endLabel.rowIndex, // 结束路径的行号 用结束标签的行号
        singleLine: false,
        connect: false, // 标识该路径不是连接路径
        exData: data.exData,
      };
      return [formPathInfo, toPathInfo]; // 初始化好的路径信息
    }
  }

  /**
   * 判断当前要添加的路径下方矩形是否存在标签；存在则当前路径往上移动一定距离；再次判断；直到当前要添加的路径下方矩形不存在标签为止
   * @param {Object} pathPosition
   * @param {Object} pathTextSize
   * @returns
   */
  __getScopeLabel(pathPosition, pathTextSize) {
    const box = {
      x0: pathPosition.x2 > pathPosition.x3 ? pathPosition.x3 : pathPosition.x2,
      y0: pathPosition.y2,
      x1: pathPosition.x2 > pathPosition.x3 ? pathPosition.x2 : pathPosition.x3,
      y1: pathPosition.y3 + pathTextSize.height,
    };

    // 与当前路径重叠的矩形
    let labelList = this.labelInfo.filter((item) => {
      const x0 = item.x; // label标签的左上角坐标值
      const y0 = item.y; // label标签的左上角坐标值
      const x1 = item.x + item.width; // label标签的右下角坐标值
      const y1 = item.y + item.height; // label标签的右下角坐标值
      return !(box.y1 <= y0 || box.x0 >= x1 || box.y0 >= y1 || box.x1 <= x0); // 返回与当前路径下方矩形重叠的标签；
    });

    if (labelList.length === 0) {
      return;
    } else {
      while (labelList.length !== 0) {
        pathPosition.y2 -= pathTextSize.height;
        pathPosition.y3 -= pathTextSize.height;
        // 当前路径直线下的 矩形的 左上角坐标和右下角坐标
        const box = {
          x0:
            pathPosition.x2 > pathPosition.x3
              ? pathPosition.x3
              : pathPosition.x2,
          y0: pathPosition.y2,
          x1:
            pathPosition.x2 > pathPosition.x3
              ? pathPosition.x2
              : pathPosition.x3,
          y1: pathPosition.y3 + pathTextSize.height,
        };
        // 标签直线下的矩形包含的标签
        labelList = this.labelInfo.filter((item) => {
          const x0 = item.x; // label标签的左上角坐标值
          const y0 = item.y; // label标签的左上角坐标值
          const x1 = item.x + item.width; // label标签的右下角坐标值
          const y1 = item.y + item.height; // label标签的右下角坐标值
          return !(
            box.y1 <= y0 ||
            box.x0 >= x1 ||
            box.y0 >= y1 ||
            box.x1 <= x0
          ); // 返回与当前路径下方矩形重叠的标签；
        });
      }
    }
  }

  /**
   * 判断当前路径下方的矩形与已经存在路径下方的矩形是否重叠；如果当前路径与已存在路径存在重叠；则让坐标往上移动一定距离；再做判断;直到不重叠为止；返回不重叠时的路径信息
   * @param {Object} position
   * @param {Object} pathTextSize
   * @returns
   */
  __getScopePath(pathPosition, pathTextSize) {
    let position = pathPosition;
    if (!this.pathInfo.length) {
      return; // 如果是第一次添加路径 就返回当前路径信息；不用判断
    }
    // 当前的path的直线下方矩形
    const currentRect = {
      x: position.x2 > position.x3 ? position.x3 : position.x2,
      y: position.y2,
      width: Math.abs(position.x2 - position.x3),
      height: pathTextSize.height,
    };
    const RectList = []; // 已经存在的path路径直线下方的矩形存放
    this.pathInfo.forEach((item) => {
      const box = {
        x:
          item.pathPosition.x2 > item.pathPosition.x3
            ? item.pathPosition.x3
            : item.pathPosition.x2,
        y: item.pathPosition.y2,
        width: Math.abs(item.pathPosition.x2 - item.pathPosition.x3),
        height: pathTextSize.height,
      };
      RectList.push(box);
    });
    let result = this.__pathRectIsOverlap(RectList, currentRect);
    if (!result) {
      return; // 如果当前路径与已存在的路径不重叠；则返回当前路径信息
    } else {
      while (result) {
        // 如果当前路径与已存在路径存在重叠；则让坐标往上移动一定距离；再做判断;直到不重叠为止；返回不重叠时的路径信息
        position.y2 -= pathTextSize.height;
        position.y3 -= pathTextSize.height;
        // 重新计算当前改变后的路径下方的矩形
        let currentRect = {
          x: position.x2 > position.x3 ? position.x3 : position.x2,
          y: position.y2,
          width: Math.abs(position.x2 - position.x3),
          height: pathTextSize.height,
        };
        result = this.__pathRectIsOverlap(RectList, currentRect); // 再次判断与已存在的路径是否重叠
      }
    }
  }

  /**
   * 判断当前路径下方的矩形与已经存在路径下方的矩形是否重叠
   * @param {Array} existBoxList  - 已有的路径下的矩形
   * @param {Object} currentBox - 当前的矩形
   * @returns
   */
  __pathRectIsOverlap(RectList, currentRect) {
    for (let i = 0; i < RectList.length; i++) {
      let item = RectList[i];
      if (rectIsOverlap(item, currentRect)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 标签添加完成后；重新计算path 路径信息；重新渲染path路径
   * @private
   */
  __refreshPath() {
    this.pathInfo = [];
    // 重新创建信息
    this.pathData.forEach((item) => {
      const pathInfo = this.__getPathInfo(item);
      this.pathInfo.push(...pathInfo);
      // 如果偏移信息存在；则设置偏移信息；不存在直接跳过

      pathInfo.forEach((pathInfoItem) => {
        this.__setPathOffset(pathInfoItem);
      });

      this.__getConnectInfo(); // 计算connetInfo
      if (this.onPathCalc) {
        this.onPathCalc({
          pathInfo: this.pathInfo,
        });
      }
    });
  }

  /**
   * 移除路径
   * @param {Object} vpath
   */
  removePath(vpath) {
    const index = this.__findPathDataIndexBy(vpath);
    if (index < 0) {
      return;
    }
    this.pathData.splice(index, 1);
    this.__textCalc(false);
    this.__refreshLabel();
  }

  /**
   * 当删除的标签上面有路径时;路径删除后；更新pathData
   * @param {object} vlabel
   */
  removePathByLabel(vlabel) {
    for (let i = 0; i < this.pathData.length; i++) {
      if (
        this.pathData[i].startLabel.id === vlabel.id ||
        this.pathData[i].endLabel.id === vlabel.id
      ) {
        this.pathData.splice(i, 1);
        i--;
      }
    }
  }

  /**
   * 编辑路径
   * @param {Object} path
   * @param {String} textContent
   * @param {Object} style
   */
  editPath(vpath, textContent, style) {
    const index = this.__findPathDataIndexBy(vpath);
    if (index < 0) {
      return;
    }
    this.pathData[index].textContent = textContent
      ? textContent
      : this.pathData[index].textContent;
    this.pathData[index].style = style;
    this.__refreshPath();
  }

  /**
   * 通过虚拟路径查找路径节点对应原始数据索引
   * @param {VLabel} vpath
   */
  __findPathDataIndexBy(vpath) {
    return this.pathData.findIndex(
      ({ startLabel, endLabel, exData }) =>
        startLabel.id === vpath.startLabel.id &&
        endLabel.id === vpath.endLabel.id &&
        exData === vpath.exData
    );
  }
  /**
   * 设置监听
   * @private
   */
  __setWatcher() {
    Object.keys(this.options).forEach((key) => {
      Object.defineProperty(this, key, {
        set: (val) => {
          if (this.options[key] === val) {
            return;
          }
          this.options[key] = val;
          const map = {};
          map[key] = val;
          this.__optionsChange(map);
        },
        get: () => this.options[key],
      });
    });
  }
}

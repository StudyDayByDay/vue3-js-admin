import { VNode } from "./vnode.js";
import { SVGFactory } from "../lib/svg-factory.js";
import { getCharPix, getArrowPoint } from "../util/index.js";

export class VPath extends VNode {
  /**
   * 构造函数
   * @param {object} options - 参数配置
   * @param {object} options.position - 位置信息
   * @param {number} options.position.x - 横坐标
   * @param {number} options.position.y - 纵坐标
   * @param {number} options.position.width - 宽度
   * @param {number} options.position.height - 高度
   * @param {number} options.position.rowIndex - 行号
   * @param {string} options.textContent - 关系标签文本内容
   * @param {string} options.startLabel - 关系路径的开始标签
   * @param {string} options.endLabel - 关系路径的结束标签
   * @param {Object} options.pathPosition - 关系路径上的坐标信息
   * @param {string} options.id - 节点唯一标识
   * @param {*} [exData] - 自定义数据
   */
  constructor(options, exData) {
    super({ position: options.position, id: options.id }, exData);
    this.textContent = options.textContent || "";
    this.startLabel = options.startLabel;
    this.endLabel = options.endLabel;
    this.pathPosition = {
      x1: options.pathPosition?.x1,
      x2: options.pathPosition?.x2,
      x3: options.pathPosition?.x3,
      x4: options.pathPosition?.x4,
      y1: options.pathPosition?.y1,
      y2: options.pathPosition?.y2,
      y3: options.pathPosition?.y3,
      y4: options.pathPosition?.y4,
    };
    this.isArrow = options.isArrow; // 路径是否加上箭头
    this.singleLine = options.singleLine; // 路径是单行 还是 换行
    this.connect = options.connect; // 路径是否是连接路径
    this.svgGroupClone = null; // 拷贝的节点存放
    this.style = options.style; // 样式信息存放
    this.pathTextMouseover = null; // 鼠标移动到上方执行回调
    this.pathTextMouseleave = null; // 鼠标移除上方时执行回调
    this.__watcher(); // pathPosition 变化设置监听
    this.type = "path";
  }

  /**
   * 创建真实节点
   * @override 重写父类中的接口
   * @param {object} [style] 创建的路径关系标签样式
   */
  createElement() {
    if (!this.$el) {
      const svgGroup = SVGFactory.createG();
      const svgPolyline = SVGFactory.createPolyline();

      svgPolyline.style.fill = "none";
      svgPolyline.style.stroke = "black";
      svgPolyline.style.strokeWidth = "1.5";
      svgGroup.appendChild(svgPolyline);
      // 创建路径文本
      if (!this.connect) {
        const svgRect = SVGFactory.createRect();
        const svgText = SVGFactory.createText();
        svgText.style.fontSize = "12px";
        svgText.style.cursor = "pointer";
        svgText.setAttribute("dominant-baseline", "text-before-edge"); // 让text与rect位置可以重叠在一起
        svgGroup.appendChild(svgRect);
        svgGroup.appendChild(svgText);
        svgText.onclick = (e) => {
          this.$bus.emit("pathClick", this, e);
        };
      }

      // 创建箭头
      if (this.isArrow) {
        const svgArrowPolyline = SVGFactory.createPolyline();
        svgGroup.appendChild(svgArrowPolyline); // 添加箭头
      }
      // 路径文本设置点击事件
      this.$el = svgGroup;
    }

    this.__setOptions(this.pathPosition); // 根据 pathPosition 计算出path节点下子节点的配置信息；并设置
    this.setAttributes();
  }

  /**
   *  计算出path节点下子节点的配置信息；并设置
   * @param {Object} pathPosition
   */
  __setOptions(pathPosition) {
    const pathTextSize = getCharPix(this.textContent, "12px"); // 根据path路径标签内容获取路径宽
    // 标签的路径坐标点
    const pathPolylineOptions = {
      points: `${pathPosition.x1},${pathPosition.y1} ${pathPosition.x2},${pathPosition.y2} ${pathPosition.x3},${pathPosition.y3} ${pathPosition.x4},${pathPosition.y4}`,
    };

    this.__setAttributes(pathPolylineOptions, this.$el.children[0]);

    // 路径标签的文字和背景配置
    if (this.$el.children[1] && this.$el.children[2]) {
      // 路径标签背景颜色的配置
      const pathRectOptions = {
        x: (pathPosition.x2 + pathPosition.x3 - pathTextSize.width) / 2,
        y: pathPosition.y3 - pathTextSize.height / 2,
        width: pathTextSize.width,
        height: pathTextSize.height,
        fill: this.style.backgroundColor,
      };
      // 路径标签文字的配置
      const pathTextOptions = {
        x: (pathPosition.x2 + pathPosition.x3 - pathTextSize.width) / 2,
        y: pathPosition.y3 - pathTextSize.height / 2,
        fill: "black",
      };
      this.__setAttributes(pathRectOptions, this.$el.children[1]);
      this.__setAttributes(pathTextOptions, this.$el.children[2]);
      this.$el.children[2].textContent = this.textContent; // 关系标签内容赋值
    }

    // 如果该路径存在箭头；则计算箭头信息
    if (this.$el.children[3]) {
      // 箭头坐标信息存放
      const pointPosition = getArrowPoint(
        pathPosition.x4,
        pathPosition.y4,
        pathPosition.x3,
        pathPosition.y3
      );
      // 箭头坐标配置
      const pathArrowPolylineOptions = {
        points: `${pointPosition.x1},${pointPosition.y1} ${pathPosition.x4},${pathPosition.y4} ${pointPosition.x2},${pointPosition.y2}`,
      };
      this.__setAttributes(pathArrowPolylineOptions, this.$el.children[3]);
    }
    this.setStyle(); // 设置节点样式

    this.svgGroupClone = this.$el.cloneNode(true); // 拷贝当前路径 每一个路径都有自己的一份拷贝路径 存在this.svgGroupClone中
    this.setSvgGroupCloneStyle(); //  克隆的svg 设置样式；
    // 鼠标移动到节点上方时;执行回调
    if (this.$el.children[2]) {
      this.$el.children[2].onmouseover = () => {
        if (this.pathTextMouseover) {
          this.pathTextMouseover(this);
        }
      };
      // 鼠标移出到节点上方时；执行回调
      this.$el.children[2].onmouseleave = () => {
        if (this.pathTextMouseleave) {
          this.pathTextMouseleave(this);
        }
      };
    }
  }
  /**
   *  为标记设置属性
   */
  __setAttributes(attributes, el) {
    if (attributes) {
      Object.keys(attributes).forEach((k) => {
        el.setAttribute(k, attributes[k]);
      });
    }
  }

  /**
   * 设置文本内容
   * @param {string} textContent
   * @returns
   */
  setContent(textContent) {
    this.textContent = textContent;
    // 这里是否应该用 nodeName 判断一下;  因为有的path 的 children[2]不是 svgText;
    if (this.$el.children[2]) {
      this.$el.children[2].textContent = textContent;
      this.svgGroupClone.children[2].textContent = textContent;
    }
    this.__setOptions(this.pathPosition);
  }

  /**
   * 设置克隆节点样式
   */
  setSvgGroupCloneStyle() {
    this.svgGroupClone.children[0].style.stroke = `${this.style.highlightColor}`;
    if (this.svgGroupClone.children[2]) {
      this.svgGroupClone.children[2].style.fill = `${this.style.highlightColor}`;
    }
    if (this.svgGroupClone.children[3]) {
      this.svgGroupClone.children[3].style.fill = `${this.style.highlightColor}`;
    }
  }

  /**
   * 设置节点样式
   */
  setStyle() {
    this.$el.children[0].style.stroke = `${this.style.borderColor}`;
    if (this.$el.children[2]) {
      this.$el.children[2].style.fill = `${this.style.borderColor}`;
    }
    if (this.$el.children[3]) {
      this.$el.children[3].style.fill = `${this.style.borderColor}`;
    }
  }

  /**
   * pathPosition 变化监听
   */
  __watcher() {
    Object.keys(this.pathPosition).forEach((key) => {
      Object.defineProperty(this, key, {
        set: (val) => {
          if (this.pathPosition[key] === val) {
            return;
          }
          this.pathPosition[key] = val;
          if (this.$el && typeof this.pathPosition[key] !== undefined) {
            // 由于箭头的坐标计算问题；需要异步获取到最新的路径坐标信息
            let timer = setTimeout(() => {
              this.__setOptions(this.pathPosition);
              clearTimeout(timer);
            }, 0);
          }
        },
        get: () => this.pathPosition[key],
      });
    });
  }
}

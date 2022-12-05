import { VNode } from "./vnode.js";
import { SVGFactory } from "../lib/svg-factory.js";

/**
 * 虚拟文本节点类
 * @extends VNode
 */
export class VLabel extends VNode {
  /**
   * 构造函数
   * @param {object} options - 参数配置
   * @param {object} options.position - 位置信息
   * @param {number} options.position.x - 横坐标
   * @param {number} options.position.y - 纵坐标
   * @param {number} options.position.width - 宽度
   * @param {number} options.position.height - 高度
   * @param {number} options.position.rowIndex - 行号
   * @param {string} options.textContent - 标签文本内容
   * @param {string} options.startIndex - 标签关联的文本起始索引值
   * @param {string} options.endIndex - 标签关联的文本结束标签索引值
   * @param {string} options.id - 节点唯一标识
   * @param {*} [exData] - 自定义数据
   */
  constructor(options, exData) {
    super({ position: options.position, id: options.id }, exData);
    this.textContent = options.textContent || "";
    this.startIndex = options.startIndex;
    this.endIndex = options.endIndex;
    this.type = "label";
    this.mouseoverListener = null; // 鼠标移动到标签上的回调
    this.mouseleaveListener = null; // 鼠标移出标签时的回调
  }

  /**
   * 创建真实节点
   * @override 重写父类中的接口
   * @param {object} [styles] group 、rect 、text 的样式
   */
  createElement(styles) {
    if (!this.$el) {
      const svgGroup = SVGFactory.createG();
      const svgRect = SVGFactory.createRect();
      const svgText = SVGFactory.createText();
      svgText.setAttribute("dominant-baseline", "text-before-edge");
      svgText.style.fontSize = "12px";
      svgText.style.pointerEvents = "none";
      svgGroup.appendChild(svgText);
      svgGroup.insertBefore(svgRect, svgText);
      this.$el = svgGroup;
      this.$el.style.userSelect = "none";
      this.$el.style.cursor = "pointer";
      this.$el.onmouseover = (e) => {
        if (this.mouseoverListener) {
          this.mouseoverListener();
        }
      };
      this.$el.onmouseleave = (e) => {
        if (this.mouseoverListener) {
          this.mouseleaveListener();
        }
      };
      this.$el.onclick = (e) => {
        this.$bus.emit("labelClick", this, e);
      };
    }
    // 标签rect属性
    const labelRectOptions = {
      fill: `${styles.backgroundColor}`,
      width: this.position.width,
      height: this.position.height,
      rx: styles.borderRadius,
      ry: styles.borderRadius,
    };
    // 标签text属性
    const labelTextOptions = {
      fill: `${styles.color}`,
      x: 2,
      y: 2,
      width: this.position.width,
      height: this.position.height,
    };
    // 设置标签的位置
    this.$el.setAttribute(
      "transform",
      `translate(${this.position.x}, ${this.position.y})`
    );
    // 给rect  text 标签添加属性
    this.__setAttributes(labelRectOptions, this.$el.children[0]);
    this.__setAttributes(labelTextOptions, this.$el.children[1]);
    this.$el.children[1].textContent = this.textContent; // 设置标签的内容
    this.setAttributes();
  }

  /**
   * 设置文本内容
   * @param {string} textContent
   * @returns
   */
  setContent(textContent) {
    this.textContent = textContent;
    this.$el.children[1].textContent = textContent;
  }

  /**
   * 设置标签样式
   * @param {object} styles
   * @param {string} styles.backgroundColor
   * @param {string} styles.color
   */
  setStyle(styles) {
    this.$el.children[0].setAttribute("fill", styles.backgroundColor);
    this.$el.children[1].setAttribute("fill", styles.color);
    this.$bus.emit("labelStyleChange", this, styles);
  }

  /**
   *  为标签设置属性
   * @private
   */
  __setAttributes(attributes, el) {
    if (attributes) {
      Object.keys(attributes).forEach((k) => {
        el.setAttribute(k, attributes[k]);
      });
    }
  }

  /**
   *  重写位置信息发生变化时监听事件
   * @override
   */
  __positionWatcher() {
    Object.keys(this.position).forEach((key) => {
      Object.defineProperty(this, key, {
        set: (val) => {
          if (this.position[key] === val) {
            return;
          }
          this.position[key] = val;

          if ((this.$el && key === "x") || key === "y") {
            this.$el.setAttribute(
              "transform",
              `translate(${this.position.x},${this.position.y})`
            );
          }
          if (this.$el && key === "width") {
            this.$el.children[0].setAttribute("width", this.position[key]);
            this.$el.children[1].setAttribute("width", this.position[key]);
          }
          if (this.$el && key === "height") {
            this.$el.children[0].setAttribute("height", this.position[key]);
            this.$el.children[1].setAttribute("height", this.position[key]);
          }
          if (this.$el) {
            this.$el.setAttribute(key, this.position[key]);
          }
        },
        get: () => this.position[key],
      });
    });
  }
}

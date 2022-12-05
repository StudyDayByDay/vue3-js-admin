import { VNode } from "./vnode";
import { SVGFactory } from "../lib/svg-factory.js";

/**
 * 虚拟高亮标记节点类
 * @extends VNode
 */
export class VMark extends VNode {
  /**
   * 构造函数
   * @param {object} options - 参数配置
   * @param {object} options.position - 位置信息
   * @param {number} options.position.x - 横坐标
   * @param {number} options.position.y - 纵坐标
   * @param {number} options.position.width - 宽度
   * @param {number} options.position.height - 高度
   * @param {number} options.position.rowIndex - 行号
   * @param {string} options.id - 节点唯一标识
   * @param {string} options.labelId - 标记关联的标签id
   * @param {string} options.textList - 标记中单个文字的标记信息数组
   */
  constructor(options) {
    super({ position: options.position, id: options.id });
    this.labelId = options.labelId;
    this.textList = options.textList; // 标记节点信息数组
    this.nodeRectList = []; // rect数组
  }
  /**
   * 创建真实节点
   * @override 重写父类中的接口
   * @param {object} [style] rect的样式
   */
  createElement(style) {
    if (!this.$el) {
      const svgGroup = SVGFactory.createG(); // 创建g标签
      this.__onTextPositionChange(); // 文本位置信息发生改变；标记随着变化
      this.__onLabelStyleChange(); // 标签样式发生变化时高亮标记样式跟随变化
      // 根据markInfo 创建每个mark标记
      this.textList.forEach((item) => {
        const svgRect = SVGFactory.createRect();
        // 单个文字标记的信息
        const markOptions = {
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          rowIndex: item.rowIndex,
        };
        svgRect.index = item.index;
        this.__setAttributes(markOptions, svgRect);
        this.nodeRectList.push(svgRect);
        svgGroup.appendChild(svgRect);
      });
      this.$el = svgGroup;
      this.$el.onclick = (e) => {
        console.log(e);
      };
    }
    this.$el.setAttribute("fill", `${style.backgroundColor}`);
    this.$el.style.opacity = style.opacity;
    this.setAttributes();
  }

  /**
   * 接收文本位置改变信息;并以此改变标记的位置信息
   * @private
   */
  __onTextPositionChange() {
    this.$bus.addEventListener("textPositionChange", (e) => {
      this.nodeRectList.forEach((rectItem) => {
        if (rectItem.index === e.data.index) {
          rectItem.setAttribute("x", e.data.position.x);
          rectItem.setAttribute("y", e.data.position.y);
          rectItem.rowIndex = e.data.position.rowIndex;
        }
      });
    });
  }

  /**
   * 监听标签样式变化
   */
  __onLabelStyleChange() {
    this.$bus.addEventListener("labelStyleChange", ({ target, data }) => {
      if (target.id !== this.labelId) {
        return;
      }
      this.$el.setAttribute("fill", `${data.backgroundColor}`);
    });
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
}

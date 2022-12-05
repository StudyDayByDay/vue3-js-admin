import { VNode } from "./vnode.js";
import { SVGFactory } from "../lib/svg-factory.js";

/**
 * 虚拟文本节点类
 * @extends VNode
 */
export class VText extends VNode {
  /**
   * 构造函数
   * @param {object} options - 参数配置
   * @param {object} options.position - 位置信息
   * @param {number} options.position.x - 横坐标
   * @param {number} options.position.y - 纵坐标
   * @param {number} options.position.width - 宽度
   * @param {number} options.position.height - 高度
   * @param {number} options.position.rowIndex - 行号
   * @param {number} options.index - 文本索引
   * @param {string} options.textContent - 文本内容
   * @param {string} options.id - 节点唯一标识
   * @param {*} [exData] - 自定义数据
   */
  constructor(options, exData) {
    super({ position: options.position, id: options.id }, exData);
    this.index = options.index;
    this.textContent = options.textContent || "";
    this.selectedMark = null;
  }

  /**
   * 创建真实节点
   * @override 重写父类中的接口
   * @param {object} [styles]
   */
  createElement(styles) {
    if (!this.$el) {
      this.__onOffsetY();
      this.__onselect();
      this.$el = SVGFactory.createText();
      this.$el.style.userSelect = "none";
      this.$el.setAttribute("dominant-baseline", "text-before-edge");
      this.$el.setAttribute("type", "carver__text");
      if (styles) {
        Object.keys(styles).forEach((key) => {
          this.$el.style[key] = styles[key];
        });
      }
    }
    this.$el.textContent = this.textContent;
    this.$el.setAttribute("index", this.index);
    this.setAttributes();
  }

  /**
   * 监听文本行偏移事件
   * @private
   */
  __onOffsetY() {
    let handleRowOffsetY = (e) => {
      if (e.data.rowIndex <= this.position.rowIndex) {
        this.y += e.data.offsetHeight;
        this.selectedMark && this.selectedMark.setAttribute("y", this.y);
      }
    };
    this.$bus.addEventListener("rowOffsetY", handleRowOffsetY);
  }

  /**
   * 监听文本选中
   * @private
   */
  __onselect() {
    // 添加文本选中事件监听
    this.$bus.addEventListener("textSelect", (e) => {
      // console.log(e);
      let start = e.data.start;
      let end = e.data.end;

      if (start > end) {
        start = e.data.end;
        end = e.data.start;
      }

      if (this.index < start || this.index > end) {
        this.__unselected();
        return;
      }

      this.__selected();
    });

    // 添加文本取消事件监听
    this.$bus.addEventListener("textCancel", () => {
      this.__unselected();
    });
  }

  /**
   * 设置选中状态样式
   * @private
   */
  __selected() {
    if (!this.$el) {
      return;
    }
    if (!this.selectedMark) {
      // 如果不存在文本选中标记节点则创建新的文本标记节点
      this.selectedMark = SVGFactory.createRect();
      this.__createSelectMark();
    }
    this.selectedMark.setAttribute("fill", "#1786FF");
    this.$el.setAttribute("fill", "white");
  }

  /**
   * 取消文本选中
   * @private
   */
  __unselected() {
    if (!this.$el) {
      return;
    }
    if (!this.selectedMark) {
      return;
    }
    this.selectedMark.setAttribute("fill", "transparent");
    this.$el.setAttribute("fill", "black");
  }

  /**
   * 设置选中标记节点
   * @private
   */
  __createSelectMark() {
    if (!this.$el) {
      return;
    }
    const box = this.$el.getBBox();
    this.selectedMark.style.pointerEvents = "none";
    this.selectedMark.setAttribute("x", box.x);
    this.selectedMark.setAttribute("y", box.y);
    this.selectedMark.setAttribute("width", box.width);
    this.selectedMark.setAttribute("height", box.height);
    this.$el.parentElement.insertBefore(this.selectedMark, this.$el);
  }

  /**
   * 设置位置信息监听
   * @private
   */
  __positionWatcher() {
    Object.keys(this.position).forEach((key) => {
      Object.defineProperty(this, key, {
        set: (val) => {
          if (this.position[key] === val) {
            return;
          }
          this.position[key] = val;
          if (this.$el) {
            this.$el.setAttribute(key, this.position[key]);
          }
          // 当文本位置信息发生改变；将文本信息传输出去
          this.$bus.emit("textPositionChange", null, {
            index: this.index,
            position: this.position,
          });
        },
        get: () => this.position[key],
      });
    });
  }
}

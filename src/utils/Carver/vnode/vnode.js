/**
 * 虚拟节点基类
 */
export class VNode {
  /**
   * 构造函数
   * @param {object} options - 参数配置
   * @param {object} options.position - 位置信息
   * @param {number} options.position.x - 横坐标
   * @param {number} options.position.y - 纵坐标
   * @param {number} [options.position.width] - 宽度
   * @param {number} [options.position.height] - 高度
   * @param {number} options.position.rowIndex - 行号
   * @param {string} options.id - 节点唯一标识
   * @param {*} [exData] - 节点自定义数据
   */
  constructor(options, exData) {
    this.position = {
      x: options.position && options.position.x,
      y: options.position && options.position.y,
      width: options.position && options.position.width,
      height: options.position && options.position.height,
      rowIndex: options.position && options.position.rowIndex,
    };
    this.id = options.id;
    this.$el = null;
    this.$bus = null;
    this.exData = exData;
    this.__positionWatcher();
  }

  /**
   * 创建真实节点
   * @interface 需要子类中实现的接口
   */
  createElement() {}

  /**
   * 获取真实节点
   * @returns {HTMLElement}
   */
  getElement() {
    if (!this.$el) {
      this.$el = document.getElementById(this.id);
    }
    return this.$el;
  }

  /**
   * 设置属性
   */
  setAttributes() {
    if (!this.$el) {
      return;
    }
    this.$el.setAttribute("id", this.id);
    Object.keys(this.position).forEach((key) => {
      this.$el.setAttribute(key, this.position[key]);
    });
  }

  /**
   * 移除当前dom节点
   */
  remove() {
    const dom = this.getElement();
    if (dom) {
      dom.remove();
    }
    this.$el = null;
  }

  /**
   * 位置属性监听 当$el节点存在时 position中的属性发生变化时动态更新真实节点上的位置信息
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
          if (this.$el && typeof this.position[key] !== undefined) {
            this.$el.setAttribute(key, this.position[key]);
          }
        },
        get: () => this.position[key],
      });
    });
  }
}

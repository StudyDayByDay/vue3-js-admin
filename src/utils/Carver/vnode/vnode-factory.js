import { VText } from "./vtext.js";
import { UUID } from "../util/index.js";
import { VLabel } from "./vlabel.js";
import { VMark } from "./vmark.js";
import { VPath } from "./vpath.js";

/**
 * 虚拟节点工厂类
 */
export class VNodeFactory {
  constructor() {}

  /**
   * 创建节点
   * @param {"vtext" | "vmark" | "vlabel" | "vpath"} type - text 表示创建文本节点；
   * @param {object} options - 参数配置
   * @param {object} [options.position] - 位置信息
   * @param {number} options.position.x - 横坐标
   * @param {number} options.position.y - 纵坐标
   * @param {number} options.position.width - 宽度
   * @param {number} options.position.height - 高度
   * @param {number} options.position.rowIndex - 行号
   * @param {number} [options.index] - 文本索引
   * @param {string} [options.textContent] - 文本内容或标签内容
   * @param {number} [options.startIndex] - 标签关联的起始文本索引
   * @param {number} [options.endIndex] - 标签关联的结束文本索引
   * @param {*} [exData] - 自定义数据
   *
   */
  createNode(type, options, exData) {
    options["id"] = UUID.generate(32); // 生成UUID作为节点唯一标识
    return this[`__${type}`](options, exData);
  }

  /**
   * @private
   * @param {*} options
   * @param {*} exData
   * @returns
   */
  __vtext(options, exData) {
    return new VText(options, exData);
  }

  /**
   * @private
   * @param {*} options
   * @param {*} exData
   * @returns
   */
  __vlabel(options, exData) {
    return new VLabel(options, exData);
  }

  /**
   * @private
   * @param {*} options
   * @returns
   */
  __vmark(options, exData) {
    return new VMark(options, exData);
  }

  /**
   * @private
   * @param {*} options
   * @returns
   */
  __vpath(options, exData) {
    return new VPath(options, exData);
  }
}

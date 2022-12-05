import { PSCalculator } from "./pscalculator";
import { config } from "../options/config";
export class TextSelection {
  /**
   * 构造函数
   * @constructor
   * @param {HTMLElement} root - 根节点
   * @param {PSCalculator} pscalculator - 位置计算工具
   * @param {object} [options] = 配置项
   * @param {boolean} [options.multiple=false] - 是否为多选
   */
  constructor(root, pscalculator, textNodeList, options = { multiple: false }) {
    this.$root = root; // 根节点 鼠标事件的监听对象
    this.$pscalculator = pscalculator; // 位置计算工具
    this.textNodeList = textNodeList; // 虚拟文本节点
    this.multiple = options && options.multiple;
    //  鼠标按下时的起始位置坐标
    this.start = {};
    this.onstart = null; // 文本选择行为开始事件监听 以鼠标在this.$root内按下为开始
    this.onchange = null; // 文本选中监听 ([startIndex:number,endIndex:number]) => viod
    this.onstop = null; // 文本选中行为结束监听 在开始事件触发之后，以鼠标在this.$root内抬起或者鼠标移出根节点为结束
    this.destroy = null; // 销毁事件
    this.destroy = this.__init();
  }

  /**
   * 鼠标按下事件
   * @private
   * @param {MouseEvent} e
   */
  __msdown(e) {
    if (this.onstart) {
      this.onstart();
    }
    this.__msmove(e);
  }

  /**
   * 鼠标抬起事件
   * @private
   * @param {MouseEvent} e
   */
  __msup(e) {
    /**
     *  e.type为mouseup 表示当前函数是被鼠标抬起触发
     *  e.type为mousemove 表示当前函数是被全局鼠标经过事件监听到鼠标移出文本选择区域触发
     */
    if (this.onstop) {
      this.onstop(this.__msmove(e));
    }
    if (this.multiple) {
      this.destroy = this.__init();
    }
  }

  /**
   * 鼠标经过事件
   * @private
   * @param {MouseEvent} e
   */
  __msmove(e) {
    let x = null;
    let y = null;
    if (
      this.start["x"] !== undefined &&
      this.start["y"] !== undefined &&
      this.start["rowIndex"] !== undefined
    ) {
      x = e.offsetX;
      y = e.offsetY;
    }
    if (
      this.start["x"] === undefined ||
      this.start["y"] === undefined ||
      this.start["rowIndex"] === undefined
    ) {
      this.start["x"] = e.offsetX;
      this.start["y"] = e.offsetY;
      const row = this.__getRowInfoBy(e.offsetX, e.offsetY);
      this.start["rowIndex"] = row.rowIndex;
      this.start["outLine"] = row.outLine;
    }
    if (x == null || y == null) {
      return;
    }
    const row = this.__getRowInfoBy(x, y);

    const res = this.__getIndexRangeBy(this.start, { ...row, x, y });

    let realRes = {};
    if (res.min > res.max) {
      realRes["max"] = res.min;
      realRes["min"] = res.max;
    } else {
      realRes["max"] = res.max;
      realRes["min"] = res.min;
    }

    if (this.onchange) {
      // 执行选中范围发生变化时的回调
      this.onchange(realRes.min, realRes.max);
    }
    return realRes;
  }

  /**
   * 通过开始和结束位置信息获取文本索引范围
   * @private
   * @param {object} start - 开始位置信息
   * @param {number} start.x
   * @param {number} start.y
   * @param {number} start.rowIndex
   * @param {boolean} start.outLine
   * @param {object} end - 结束位置信息
   * @param {number} end.x
   * @param {number} end.y
   * @param {number} end.rowIndex
   * @param {boolean} end.outLine
   * @returns {{min:number;max:number}}
   */
  __getIndexRangeBy(start, end) {
    let p0 = null; // 计算坐标范围的起始点
    let p1 = null; // 计算坐标位置的结束点

    // 若起始和结束位置在同一行 则按x左右顺序决定起始点和结束点
    if (start.rowIndex === end.rowIndex) {
      p0 = start;
      p1 = end;
      if (start.x > end.x) {
        p0 = end;
        p1 = start;
      }
    }

    // 如果起始位置在结束位置上方 则起始位置为起始点 结束位置为结束点
    if (start.rowIndex < end.rowIndex) {
      p0 = start;
      p1 = end;
    }

    // 如果起始位置在结束位置下方 则起始位置为结束点 结束位置为起始点
    if (start.rowIndex > end.rowIndex) {
      p0 = end;
      p1 = start;
    }

    // 获取在起始点同行 并且在起始点右侧的文本数组
    let p0Rows = this.textNodeList
      .filter((item) => item.rowIndex === p0.rowIndex)
      .filter((item) => item.x >= p0.x - config.fontSize / 2)
      .filter((item) => p0.y - item.y > 0 && p0.y - item.y < config.lineHeight);
    // 获取在结束点同行 并且在结束点左侧的文本数组
    let p1Rows = this.textNodeList
      .filter((item) => item.rowIndex === p1.rowIndex)
      .filter((item) => item.x <= p1.x)
      .filter((item) => p1.y - item.y > 0 && p1.y - item.y < config.lineHeight);

    // 如果起始位置和结束位置在同行 取p0数组中的第一项作为文本选中范围的第一项 取p1数组中的最后一项作为文本选中范围的最后一项

    if (start.rowIndex === end.rowIndex && !p0Rows.length) {
      return {
        min: p1Rows[0]?.index || -1,
        max: p1Rows[p1Rows.length - 1]?.index || -1,
      };
    }
    if (start.rowIndex === end.rowIndex && !p1Rows.length) {
      return {
        min: p0Rows[0]?.index || -1,
        max: p0Rows[p0Rows.length - 1]?.index || -1,
      };
    }
    if (start.rowIndex === end.rowIndex) {
      return {
        min: p0Rows[0]?.index || -1,
        max: p1Rows[p1Rows.length - 1]?.index || -1,
      };
    }

    // 若p0为空数组 表示此时鼠标反选文本并溢出文本区域 取其下一行作为新的p0
    if (!p0Rows.length) {
      p0Rows = this.$pscalculator.textInfo.filter(
        (item) => item.rowIndex === p0.rowIndex + 1
      );
    }

    // 若p1为空数组 表示此时鼠标反选文本并溢出文本区域 取其上一行作为新的p1
    if (!p1Rows.length) {
      p1Rows = this.$pscalculator.textInfo.filter(
        (item) => item.rowIndex === p1.rowIndex - 1
      );
    }

    // 取值同上
    return {
      min: p0Rows[0]?.index || -1,
      max: p1Rows[p1Rows.length - 1]?.index || -1,
    };
  }

  /**
   * 通过x, y坐标获取行信息
   * @private
   * @param {number} x
   * @param {number} y
   * @returns {{rowIndex:number;outLine:boolean;}}
   */
  __getRowInfoBy(x, y) {
    // 最大行号
    const maxRow =
      this.$pscalculator.textInfo[this.$pscalculator.textInfo.length - 1]
        .rowIndex;
    // 结果行号
    let rowIndex = 0;
    // 坐标是否超出当前行的文本区域（不包含边距的文本区域）
    let outLine = false;

    for (let i = 1; i <= maxRow; i++) {
      const ps = this.$pscalculator.getRowPosition(i);
      // 第一个大于当前y坐标的文本行记为当前鼠标位置所在行
      if (y <= ps.y1) {
        rowIndex = i;
        break;
      }
      // 若最后一行还未取得大于当前y坐标的行 则取组后一行作为当前行
      if (i === maxRow) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === 0) {
      // 因为行号最小为1 初始值0未发生变化说明未找到符合预期的行号 说明鼠标位置溢出文本区域
      outLine = true;
    }

    if (rowIndex !== 0) {
      const ps = this.$pscalculator.getRowPosition(rowIndex);
      if (x <= ps.x0 || x >= ps.x1) {
        // 如果存在符合预期的行号 但当前x坐标不在行规定的坐标范围内 说明鼠标位置溢出文本区域
        outLine = true;
      }
    }

    return { rowIndex, outLine };
  }

  /**
   * @private
   */
  __init() {
    this.start = {};
    this.$root.addEventListener("mousedown", msdown, true); // 添加鼠标按下事件
    const _this = this;
    /**
     * 鼠标按下事件
     * @param {MouseEvent} e
     */
    function msdown(e) {
      _this.__msdown(e);
      _this.$root.removeEventListener("mousedown", msdown, true); // 移除鼠标按下事件
      _this.$root.addEventListener("mouseup", msup, true); // 添加鼠标抬起事件
      _this.$root.addEventListener("mousemove", msmove, true); // 添加鼠标经过事件
      window.addEventListener("mousemove", local_msmove, true); // 添加全局鼠标经过事件
    }

    /**
     * 鼠标抬起事件
     * @param {MouseEvent} e
     */
    function msup(e) {
      _this.__msup(e);
      _this.$root.removeEventListener("mouseup", msup, true); // 移除鼠标抬起事件
      _this.$root.removeEventListener("mousemove", msmove, true); // 移除鼠标经过事件
      window.removeEventListener("mousemove", local_msmove, true); // 移除全局鼠标经过事件
    }

    /**
     * 鼠标经过事件
     * @param {MouseEvent} e
     */
    function msmove(e) {
      _this.__msmove(e);
    }

    /**
     * 全局鼠标经过事件
     * @param {MouseEvent} e
     */
    function local_msmove(e) {
      for (let i = 0; i < e.path.length; i++) {
        // 如果鼠标经过的路径节点中包含当前根节点 继续监听
        if (e.path[i] === _this.$root) {
          return;
        }
      }

      // 如果鼠标经过节点中不包含当前根节点 说明鼠标已经移除文本容器 则结束文本选择行为并清除监听事件
      msup(e);
    }

    /**
     * 销毁事件
     */
    function destroy() {
      _this.$root.removeEventListener("mousedown", msdown, true); // 移除鼠标按下事件
      _this.$root.removeEventListener("mouseup", msup, true); // 移除鼠标抬起事件
      _this.$root.removeEventListener("mousemove", msmove, true); // 移除鼠标经过事件
      window.removeEventListener("mousemove", local_msmove, true); // 移除全局鼠标经过事件
    }

    return destroy;
  }
}

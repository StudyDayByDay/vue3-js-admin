import { VM } from "./vm.js";
export class Carver {
  /**
   * 构造函数
   * @param {object} options - 参数配置
   * @param {Element} options.root - 用于挂载svg的dom节点
   * @param {boolean} [options.autoResize] - 是否启用自动监听容器大小变化
   * @param {boolean} [options.onResizeinterval] - 监听容器大小变化的频率 以ms为单位
   * @param {object} [options.config] - 参考config.js
   * @param {object} [options.style] - 参考style.js
   */
  constructor(options) {
    try {
      this.$VM = new VM(options);
      this.$data = {
        text: "",
      };
      this.__setWatcher();
      this.onLabelClick = null; // 标签点击事件 (target:VLabel;e:MouseEvent;) => viod
      this.$VM.onLabelClick = (target, e) => {
        if (this.onLabelClick) {
          this.onLabelClick(target, e);
        }
      };
      this.onPathClick = null; // 路径标签点击事件 (target:VLabel;e:MouseEvent;) => viod
      this.$VM.onPathClick = (target, e) => {
        if (this.onPathClick) {
          this.onPathClick(target, e);
        }
      };

      console.log(
        "%c%s",
        "color:#18C59A;font-size:24px;font-family:STHupo",
        "Hello Carver",
        `v${require("../../package.json").version}`
      );
    } catch (e) {
      console.log(
        "%c%s",
        "color:#C21B1F;font-size:24px;font-family:STHupo",
        "Carver failed"
      );
      console.error(e);
    }
  }

  /*
   * 获取全部的label
   */
  getAllLabelNode() {
    return this.$VM.getAllLabelNode();
  }

  /*
   * 获取全部的path
   */
  getAllPathNode() {
    return this.$VM.getAllPathNode();
  }

  /**
   * 设置样式配置
   * @param {object} config
   * @param {number} [config.paddingTop]
   * @param {number} [config.paddingRight]
   * @param {number} [config.paddingBottom]
   * @param {number} [config.paddingLeft]
   * @param {number} [config.lineHeight]
   * @param {number} [config.letterSpacing]
   */
  setConfig(config) {
    this.$VM.setConfig(config);
  }

  /**
   * 设置文本内容 会执行一次__textCHange
   * @param {string} text - 文本内容
   */
  setText(text) {
    this.$data.text = text;
    this.__textCHange();
  }

  /**
   * 划词
   * @param {boolean} [multiple=false] - 是否多选
   * @param {(e:{eventIndex:number;fromIndex:number;toIndex:number;text:string;fromNode:VText;toNode:VText;})=>viod} [multipleListener] - 多选监听事件 每次选择时执行回调
   * @returns {Promise<{fromIndex:number;toIndex:number;text:string;fromNode:VText;toNode:VText;}>} - fromIndex、toIndex值为-1时表示未划中有效的文本
   */
  select(multiple = false, multipleListener = null) {
    return this.$VM.select(multiple, multipleListener);
  }

  /**
   * 划词取消
   */
  cancelSelect() {
    this.$VM.cancelSelect();
  }

  /**
   * 撤销划词（紧多选适用）
   * @returns {{deleted:object;current:object[]}}
   */
  revoke() {
    return this.$VM.multiSelectPrev();
  }

  /**
   * 添加标签
   * @param {object[] | object} data
   * @param {object} data[].startIndex - 关联文本起始字符索引值
   * @param {object} data[].endIndex - 关联文本结束字符索引值
   * @param {object} data[].textContent - 标签内容
   * @param {object} [data[].style] - 标签样式
   */
  addLabel(data) {
    return new Promise((resolve, reject) => {
      try {
        if (Array.isArray(data)) {
          const temp = this.$VM.addLabel(data);
          resolve(temp);
          return;
        }
        const temp = this.$VM.addLabel([data]);
        resolve(...temp);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 移除标签
   * @param {object} vlabel
   * @param {string} [vlabel.id] - 虚拟节点id
   * @param {number} [vlabel.startIndex] - 关联文本起始字符索引值
   * @param {number} [vlabel.endIndex] - 关联文本结束字符索引值
   * @param {string} [vlabel.textContent] - 标签内容
   * @param {*} [vlabel.exData] - 扩展属性
   */
  removeLabel(vlabel) {
    return new Promise((resolve, reject) => {
      try {
        resolve(this.$VM.removeLabel(vlabel));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 连续点击收集标签
   * @returns
   */
  collectLabel() {
    return this.$VM.collectLabel();
  }

  /**
   * 结束收集标签
   */
  endCollectLabel() {
    this.$VM.endCollectLabel();
  }

  /**
   * 取消收集标签
   */
  cancelCollectLabel() {
    this.$VM.cancelCollectLabel();
  }

  /**
   * 通过扩展属性移除标签
   * @param {*} exData
   */
  removeLabelByExData(exData) {
    return new Promise((resolve, reject) => {
      try {
        resolve(this.$VM.removeLabelByExData(exData));
      } catch (err) {
        reject(err);
      }
    });
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
  editLabel(vlabel, textContent, style = null) {
    return new Promise((resolve, reject) => {
      try {
        resolve(this.$VM.editLabel(vlabel, textContent, style));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 通过扩展属性编辑标签
   * @param {*} exData
   * @param {string} textContent - 标签内容
   * @param {Object} [style] - 标签样式
   * @param {string} [style.color]
   * @param {string} [style.backgroundColor]
   */
  editLabelByExData(exData, textContent, style = null) {
    return new Promise((resolve, reject) => {
      try {
        resolve(this.$VM.editLabelByExData(exData, textContent, style));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 高亮指定标签
   * @param {object} vlabel
   * @param {string} [vlabel.id] - 虚拟节点id
   * @param {number} [vlabel.startIndex] - 关联文本起始字符索引值
   * @param {number} [vlabel.endIndex] - 关联文本结束字符索引值
   * @param {string} [vlabel.textContent] - 标签内容
   * @param {*} [vlabel.exData] - 扩展属性
   * @param {boolean} scrollTo - 是否自动滚动至可视区域
   */
  highlightLabel(vlabel, scrollTo = true) {
    this.$VM.highlightLabel(vlabel, scrollTo);
  }

  /**
   * 通过扩展属性高亮指定标签
   * @param {*} exData
   * @param {boolean} scrollTo - 是否自动滚动至可视区域
   */
  highlightLabelByExData(exData, scrollTo = true) {
    this.$VM.highlightLabelByExData(exData, scrollTo);
  }

  /**
   * 取消指定标签高亮
   * @param {object} vlabel
   * @param {string} [vlabel.id] - 虚拟节点id
   * @param {number} [vlabel.startIndex] - 关联文本起始字符索引值
   * @param {number} [vlabel.endIndex] - 关联文本结束字符索引值
   * @param {string} [vlabel.textContent] - 标签内容
   * @param {*} [vlabel.exData] - 扩展属性
   */
  cancelHighlightLabel(vlabel) {
    this.$VM.cancelHighlightLabel(vlabel);
  }

  /**
   * 通过扩展属性取消指定标签高亮
   * @param {*} exData
   */
  cancelHighlightLabelByExData(exData) {
    this.$VM.cancelHighlightLabelByExData(exData);
  }

  /**
   * 取消指定标签高亮
   * @param {object} vlabel
   * @param {string} [vlabel.id] - 虚拟节点id
   * @param {number} [vlabel.startIndex] - 关联文本起始字符索引值
   * @param {number} [vlabel.endIndex] - 关联文本结束字符索引值
   * @param {string} [vlabel.textContent] - 标签内容
   * @param {*} [vlabel.exData] - 扩展属性
   */
  scrollToLabel(vlabel) {
    this.$VM.scrollToLabel(vlabel);
  }

  /**
   * 通过 两个标签的exData  创建路径
   * @param {object[] | object} data
   * @param {string} data[].startLabelExData -开始标签 exData
   * @param {string} data[].endLabelExData -结束标签 exData
   * @param {string} data[].textContent - 文本
   * @param {Object} data[].style - 标签样式
   * @param {string} data[].style.highlightColor - 路径高亮时的颜色
   * @param {string} data[].style.backgroundColor - 路径正常显示时的颜色
   * @returns
   */
  addPathByExData(data) {
    return new Promise((resolve, reject) => {
      try {
        if (Array.isArray(data)) {
          const temp = this.$VM.addPathByExData(data);
          resolve(temp);
        }
        const temp = this.$VM.addPathByExData([data]);
        resolve(...temp);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 通过两个标签的信息  创建标签
   * @param {Object[] | object} data
   * @param {Object} data[].startLabel
   * @param {Object} data[].endLabel
   * @param {string} data[].startLabel.id - 开始标签的id
   * @param {string} data[].startLabel.startIndex - 开始标签的开始序号
   * @param {string} data[].startLabel.endIndex - 开始标签的结束序号
   * @param {string} data[].startLabel.textContent - 开始标签的文本
   * @param {Object} data[].endLabel - 与开始标签一样  具有 startindex、endindex等属性
   * @param {string} data[].textContent - 路径的标签的文本
   *
   * @param {Object} data[].style - 标签样式
   * @param {string} data[].style.highlightColor - 路径高亮时的颜色
   * @param {string} data[].style.backgroundColor - 路径正常显示时的颜色
   * @returns
   */
  addPath(data) {
    return new Promise((resolve, reject) => {
      try {
        if (Array.isArray(data)) {
          const temp = this.$VM.addPath(data);
          resolve(temp);
        }
        const temp = this.$VM.addPath([data]);
        resolve(...temp);
      } catch (err) {
        reject(err);
      }
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
   */
  removePath(path) {
    this.$VM.__removeToplayerChildren(); // 移出高亮显示效果
    return new Promise((resolve, reject) => {
      try {
        if (Object.prototype.toString.call(path) === "[object Object]") {
          const temp = this.$VM.removePath(path); // 被删除的虚拟节点
          resolve(temp);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 删除路径 通过 pathExData
   * @param {string} pathExData  - 路径节点的exData
   */
  removePathByExData(pathExData) {
    this.$VM.__removeToplayerChildren(); // 移出高亮显示效果
    return new Promise((resolve, reject) => {
      try {
        if (pathExData) {
          const temp = this.$VM.removePathByExData(pathExData);
          resolve(temp);
        }
      } catch (err) {
        reject(err);
      }
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
   *
   * @param {string} textContent - 路径修改后的文本
   * @param {Object} style - 标签样式
   * @param {string} style.highlightColor - 路径高亮时的颜色
   * @param {string} style.backgroundColor - 路径正常显示时的颜色
   */
  editPath(path, textContent, style = null) {
    return new Promise((resolve, reject) => {
      try {
        if (path && textContent) {
          const temp = this.$VM.editPath(path, textContent, style);
          resolve(temp);
        }
      } catch (err) {
        reject(err);
      }
    });
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
  editPathByExData(pathExData, textContent, style = null) {
    return new Promise((resolve, reject) => {
      try {
        if (pathExData && textContent) {
          const temp = this.$VM.editPathByExData(
            pathExData,
            textContent,
            style
          );
          resolve(temp);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 点击连线
   * @param {*} startLabel
   */
  connect(startLabel) {
    return this.$VM.connect(startLabel);
  }

  /**
   * 点击连线
   * @param {*} startLabelExData
   */
  connectByExData(startLabelExData) {
    return this.$VM.connectByExData(startLabelExData);
  }

  /**
   * 根据索引值 添加 mark
   * @param {object} mark
   * @param {number} mark.fromIndex
   * @param {number} mark.toIndex
   * @param {string} mark.labelId
   * @param {style} mark.style
   */
  addMarkByIndex(mark) {
    return new Promise((resolve, reject) => {
      try {
        if (mark) {
          const temp = this.$VM.addMarkByIndex(mark);
          resolve(temp);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 文本内容改变时触发
   * @private
   */
  __textCHange() {
    this.$VM.setText(this.$data.text);
  }

  /**
   * 设置监听
   * @private
   */
  __setWatcher() {
    Object.defineProperty(this, "text", {
      set: (val) => {
        if (this.$data.text === val) {
          return;
        }
        this.$data.text = val;
        this.__textCHange();
      },
      get: () => this.$data.text,
    });
  }
}

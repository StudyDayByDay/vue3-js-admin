/**
 * 通过对比文本索引相同项的位置信息（即x, y, width, rowIndex） 找出位置信息不同的项目 并返回不同项的虚拟节点数组
 * @param {VText[]} vnodeList - 虚拟节点数组
 * @param {string} vnodeList[].id - 虚拟节点id
 * @param {number} vnodeList[].index - 文本索引
 * @param {number} vnodeList[].x
 * @param {number} vnodeList[].y
 * @param {number} vnodeList[].width
 * @param {number} vnodeList[].rowIndex
 * @param {number} [vnodeList[].lineBegin]
 * @param {number} [vnodeList[].lineEnd]
 * 
 * @param {object[]} textInfo - 文本位置信息数组
 * @param {number} textInfo[].index - 文本索引
 * @param {number} textInfo[].x
 * @param {number} textInfo[].y
 * @param {number} textInfo[].width
 * @param {number} textInfo[].rowIndex
 * @param {number} [vnodeList[].lineBegin]
 * @param {number} [vnodeList[].lineEnd]
 * 
 * @returns {VText[]}

 */
export function textDiff(vnodeList, textInfo) {
  const res = [];
  for (let i = 0; i < vnodeList.length; i++) {
    const vnodeItem = vnodeList[i];
    const textItem = textInfo[i];
    let diff = false;
    if (vnodeItem.x !== textItem.x) {
      vnodeItem.x = textItem.x;
      diff = true;
    }
    if (vnodeItem.y !== textItem.y) {
      vnodeItem.y = textItem.y;
      diff = true;
    }
    if (vnodeItem.width !== textItem.width) {
      vnodeItem.width = textItem.width;
      diff = true;
    }
    if (vnodeItem.rowIndex !== textItem.rowIndex) {
      vnodeItem.rowIndex = textItem.rowIndex;
      diff = true;
    }
    if (vnodeItem.lineBegin !== textItem.lineBegin) {
      vnodeItem.lineBegin = textItem.lineBegin;
      diff = true;
    }
    if (vnodeItem.lineEnd !== textItem.lineEnd) {
      vnodeItem.lineEnd = textItem.lineEnd;
      diff = true;
    }
    if (diff) {
      res.push(vnodeItem);
    }
  }
  return res;
}
/**
 * 通过vnodeLis和vnodeList对比；找出不同位置信息；并返回不同的虚拟节点数组
 * @param {VLabel[]} vnodeList - 标签虚拟节点数组
 * @param {number} vnodeList[].x - 横坐标
 * @param {number} vnodeList[].y - 纵坐标
 * @param {number} vnodeList[].width - 宽度
 * @param {number} vnodeList[].height - 高度
 * @param {number} vnodeList[].rowIndex - 行号
 * @param {string} vnodeList[].textContent - 标签文本内容
 * @param {string} vnodeList[].startIndex - 标签关联的文本起始索引值
 * @param {string} vnodeList[].endIndex - 标签关联的文本结束标签索引值
 * @param {string} vnodeList[].id - 唯一id
 * @param {*} vnodeList[].exData - 自定义数据
 *
 * @param {object[]} labelInfo - 新的标签位置信息数组
 * @param {number} x - 横坐标
 * @param {number} y - 纵坐标
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {string} textContent - 标签内容
 * @param {number} startIndex - 标签关联的文本起始节点
 * @param {number} endIndex - 标签关联文本结束节点
 * @param {number} rowIndex - 标签起始位置行号
 * @param {object} style - 标签样式
 * @param {*} exData - 自定义数据
 *
 * @returns {{updated:VLabel[] | null;newLabel: labelInfo[] | null}}
 */
export function labelDiff(vnodeList, labelInfo) {
  const updatedList = []; // 被更新的对象
  const newList = []; // 新添加的对象

  // 遍历新的标签位置信息
  labelInfo.forEach((labelItem) => {
    /**
     * 在当前已经存在的虚拟节点中查找与labelItem相同的标签
     * 当labelItem与虚拟节点中的 文本索引、文本内容、自定义数据都完全相同时才判定为相同标签
     */
    const vnode = vnodeList.find(
      (vnodeItem) =>
        labelItem.startIndex === vnodeItem.startIndex &&
        labelItem.endIndex === vnodeItem.endIndex &&
        labelItem.exData === vnodeItem.exData
    );

    // 如果已经存在相同的虚拟节点则对比labelItem与虚拟节点的位置信息判定是否需要对已经存在的标签位置进行更新
    if (vnode) {
      let deff = false;
      vnode.setStyle(labelItem.style);
      if (vnode.textContent !== labelItem.textContent) {
        vnode.setContent(labelItem.textContent);
      }
      if (vnode.x !== labelItem.x) {
        vnode.x = labelItem.x;
        deff = true;
      }
      if (vnode.y !== labelItem.y) {
        vnode.y = labelItem.y;
        deff = true;
      }
      if (vnode.width !== labelItem.width) {
        vnode.width = labelItem.width;
        deff = true;
      }
      if (vnode.height !== labelItem.height) {
        vnode.height = labelItem.height;
        deff = true;
      }
      if (vnode.rowIndex !== labelItem.rowIndex) {
        vnode.rowIndex = labelItem.rowIndex;
        deff = true;
      }
      if (deff) {
        updatedList.push(vnode);
      }
    }

    // 如果不存在相同的虚拟节点则返回labelItem用于创建新的虚拟节点
    if (!vnode) {
      newList.push(labelItem);
    }
  });

  return {
    updated: updatedList.length ? updatedList : null,
    newLabel: newList.length ? newList : null,
  };
}

/**
 * 通过pathInnfo 和vnodeList 的对比；找出不同位置信息；并返回不同的虚拟节点数组
 * @param {*} vnodeList
 * @param {*} pathInfo
 * @returns
 */
export function pathDiff(vnodeList, pathInfo) {
  const updatedList = []; // 被更新的对象
  const newList = []; // 新添加的对象
  const pathInfoLength = pathInfo.length;
  
  // 遍历新标签的位置
  for(let i = 0; i < pathInfoLength; i++) {
    const pathItem = pathInfo[i];
    const vnode = vnodeList.find(
      // 当单行变多行时；会生成两个pathInfo信息；当这条多行变单行时，会生成一个新的pathInfo信息；而另两个换行的pathInfo生成的vnode 则会被删除
      (vnodeItem) =>
        pathItem.startLabel.id === vnodeItem.startLabel.id &&
        pathItem.endLabel.id === vnodeItem.endLabel.id &&
        pathItem.isArrow === vnodeItem.isArrow &&
        pathItem.singleLine === vnodeItem.singleLine &&
        pathItem.exData === vnodeItem.exData &&
        pathItem.connect === vnodeItem.connect
    );

    // 如果已经存在相同的虚拟节点则对比pathItem与虚拟节点的位置信息判定是否需要对已经存在的路径位置进行更新
    if (vnode) {
      let deff = false;
      vnode.style = pathItem.style;
      if (vnode.textContent !== pathItem.textContent) {
        vnode.setContent(pathItem.textContent);
      }
      if (vnode.x1 !== pathItem.pathPosition.x1) {
        vnode.x1 = pathItem.pathPosition.x1;
        deff = true;
      }
      if (vnode.y1 !== pathItem.pathPosition.y1) {
        vnode.y1 = pathItem.pathPosition.y1;
        deff = true;
      }
      if (vnode.x2 !== pathItem.pathPosition.x2) {
        vnode.x2 = pathItem.pathPosition.x2;
        deff = true;
      }
      if (vnode.y2 !== pathItem.pathPosition.y2) {
        vnode.y2 = pathItem.pathPosition.y2;
        deff = true;
      }
      if (vnode.x3 !== pathItem.pathPosition.x3) {
        vnode.x3 = pathItem.pathPosition.x3;
        deff = true;
      }
      if (vnode.y3 !== pathItem.pathPosition.y3) {
        vnode.y3 = pathItem.pathPosition.y3;
        deff = true;
      }
      if (vnode.x4 !== pathItem.pathPosition.x4) {
        vnode.x4 = pathItem.pathPosition.x4;
        deff = true;
      }
      if (vnode.y4 !== pathItem.pathPosition.y4) {
        vnode.y4 = pathItem.pathPosition.y4;
        deff = true;
      }
      if (!pathItem.textContent) {
        if (vnode.rowIndex !== pathItem.rowIndex) {
          vnode.rowIndex = pathItem.rowIndex;
          deff = true;
        }
      }
      if (deff) {
        updatedList.push(vnode);
      }
    } else {
      newList.push(pathItem);
    }
  }
  return {
    updated: updatedList.length ? updatedList : null,
    newPath: newList.length ? newList : null,
  };
}

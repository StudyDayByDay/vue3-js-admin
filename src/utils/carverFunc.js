// 根据当前页返回开始或结束节点位置
function globalOffsetToPageOffset(offset, page) {
    return offset - page.startOffset;
}

// 
function pageOffsetToGlobalOffset(offset, page) {
    return offset + page.startOffset;
}


// entitys转labels
function entitysToLabels(arr) {
    const labelMap = new Map();
    arr.forEach((item) => {
      item.labels.forEach((label) => {
        const key = label.id + '-' + label.title;
        if (!labelMap.has(key)) {
          // 是新的label
          labelMap.set(key, {entity: [item], label});
        } else {
          // 存在的label
          const {entity: entityArr} = labelMap.get(key);
          entityArr.push(item);
        }
      })
    });
    return Array.from(labelMap);
  }
export {globalOffsetToPageOffset, pageOffsetToGlobalOffset, entitysToLabels};
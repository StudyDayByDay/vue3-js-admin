/**
 * 计算两个矩形位置是否重叠
 * @param {object} rect1
 * @param {number} rect1.x
 * @param {number} rect1.y
 * @param {number} rect1.width
 * @param {number} rect1.height
 * @param {object} rect2
 * @param {number} rect2.x
 * @param {number} rect2.y
 * @param {number} rect2.width
 * @param {number} rect2.height
 * @returns {boolean}
 */
export function rectIsOverlap(rect1, rect2) {
  // 计算出四个坐标点表示两个矩形的位置 用数组的前两项分别表示x，y坐标
  const p0 = [rect1.x, rect1.y]; // 第一个矩形的左上角坐标
  const p1 = [rect1.x + rect1.width, rect1.y + rect1.height]; // 第一个矩形的右下角坐标
  const p2 = [rect2.x, rect2.y]; // 第二个矩形的左上角坐标
  const p3 = [rect2.x + rect2.width, rect2.y + rect2.height]; // 第二个矩形的右下角坐标

  // 如果其中一个矩形宽度高度都为0 两个坐标数组相同 则认为矩形不存在即不可能重叠
  if (p0 === p1 || p2 === p3) {
    return false;
  }

  /**
   * 两个矩形不重叠的情况有：
   * 1. rect2在rect1的上方
   * 2. rect2在rect1的右侧
   * 3. rect2在rect1的下方
   * 4. rect2在rect1的左侧
   */
  if (p3[1] <= p0[1]) {
    return false;
  }
  if (p2[0] >= p1[0]) {
    return false;
  }
  if (p2[1] >= p1[1]) {
    return false;
  }
  if (p3[0] <= p0[0]) {
    return false;
  }

  // 不满足以上情况的都视为两个矩形位置重叠
  return true;
}

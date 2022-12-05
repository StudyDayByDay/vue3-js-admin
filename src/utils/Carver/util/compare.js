/**
 * 比较obj1中的所有属性是否与obj2中对应属性全等
 * @param {object} obj1
 * @param {object} obj2
 */
export const compare = (obj1, obj2) => {
  const keys = Object.keys(obj1);

  while (keys.length) {
    const key = keys.pop();
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
};

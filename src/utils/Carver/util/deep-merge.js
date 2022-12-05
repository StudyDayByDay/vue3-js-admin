/**
 * 对象深度合并
 * @param {*} target
 * @param {*} source
 */
export function deepMerge(target, source) {
  const args = Array.from(arguments).slice(2, arguments.length);
  target = deep(target, source);

  args.forEach((obj) => {
    target = deep(target, obj);
  });

  function deep(o1, o2) {
    const res = Object.assign({}, o1);
    if (!o2) {
      return res;
    }
    Object.keys(o2).forEach((k) => {
      const temp = Object.prototype.toString.call(o2[k]);
      const type = temp.slice(8, temp.length - 1).toLowerCase();

      if (type === "object") {
        res[k] = deep(res[k], o2[k]);
        return;
      }

      if (type === "array") {
        if (!Array.isArray(res[k])) {
          res[k] = o2[k];
          return;
        }
        o2[k].forEach((el, index) => {
          res[k][index] = deep(res[k][index], el);
        });
        return;
      }

      res[k] = o2[k];
    });

    return res;
  }

  return target;
}

export const UUID = {
  /**
   * 生成UUID
   * @param {number} len
   * @param {number} radix
   * @returns
   */
  generate(len, radix) {
    const chars =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split(
        ""
      );
    let uuid = [];
    radix = radix || chars.length;

    if (len) {
      for (let i = 0; i < len; i++) {
        uuid[i] = chars[0 | (Math.random() * radix)];
      }
    }

    if (!len) {
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = "-";
      uuid[14] = "4";
      let r;

      for (let i = 0; i < 36; i++) {
        if (!uuid[i]) {
          r = 0 | (Math.random() * 16);
          uuid[i] = chars[i == 19 ? (r & 0x3) | 0x8 : r];
        }
      }
    }

    return uuid.join("");
  },
};

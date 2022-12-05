/**
 * 事件总线
 */
export class EBus {
  constructor() {
    this.events = [];
  }

  /**
   * 注册事件
   * @param {string | string[]} eventName - 事件名称 不能重复
   * @returns
   */
  register(eventName) {
    if (typeof eventName == "string") {
      this.__add(eventName);
      return;
    }
    eventName.forEach((item) => {
      this.__add(item);
    });
  }

  /**
   * 移除已注册事件
   * @param {string | string[]} eventName
   * @returns
   */
  unregister(eventName) {
    if (typeof eventName == "string") {
      this.__del(eventName);
      return;
    }
    eventName.forEach((item) => {
      this.__del(item);
    });
  }

  /**
   * 移除事件
   * @param {string} eventName - 事件名称
   * @param {function} callBack - 回调函数
   * @returns
   */
  remove(eventName, callBack) {
    const index = this.events.findIndex((item) => eventName === item.name);
    if (index < 0) {
      return;
    }
    if (callBack) {
      const i = this.events[index].callBacks.findIndex(
        (item) => item === callBack
      );
      if (i < 0) {
        return;
      }
      this.events[index].callBacks.splice(i, 1);
    }
    if (!callBack) {
      this.events[index].callBacks = [];
    }
  }

  /**
   * 添加事件监听器
   * @param {string} eventName - 事件名称
   * @param {function({eventName:string; target:object; data:any;})} callBack - 回调函数
   * @returns
   */
  addEventListener(eventName, callBack) {
    const index = this.events.findIndex((item) => eventName === item.name);
    if (index < 0) {
      return;
    }
    this.events[index].callBacks.push(callBack);
  }

  /**
   * 事件触发器
   * @param {string} eventName - 事件名称
   * @param {object} target - 触发事件的对象
   * @param {*} data - 自定义参数
   * @returns
   */
  emit(eventName, target, data) {
    const index = this.events.findIndex((item) => eventName === item.name);
    if (index < 0) {
      return;
    }
    this.events[index].callBacks.forEach((item) => {
      item({ eventName, target, data });
    });
  }

  /**
   * 添加事件
   * @private
   * @param {string} eventName - 事件名称
   * @returns
   */
  __add(eventName) {
    const index = this.events.findIndex((item) => eventName === item.name);
    if (index >= 0) {
      return;
    }
    this.events.push({ name: eventName, callBacks: [] });
  }

  /**
   * 移除指定事件
   * @param {string} eventName - 事件名称
   * @returns
   */
  __del(eventName) {
    const index = this.events.findIndex((item) => eventName === item.name);
    if (index < 0) {
      return;
    }
    this.events[index].callBacks = [];
    this.events.splice(index, 1);
  }
}

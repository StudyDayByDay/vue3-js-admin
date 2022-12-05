/**
 * 获取浏览器滚动条宽度
 * @returns {number}
 */
export function getScrollbarWidth() {
  const odiv = document.createElement("div");
  const styles = {
    width: "100px",
    height: "100px",
    overflowY: "scroll",
  };
  let scrollbarWidth;
  for (let i in styles) odiv.style[i] = styles[i];
  document.body.appendChild(odiv);
  scrollbarWidth = odiv.offsetWidth - odiv.clientWidth;
  odiv.remove();
  return scrollbarWidth;
}

/**
 * 获取文本像素大小
 * @param {string} text - 文本
 * @param {number} fontSize - 字号
 * @returns {{width:number,height:number}}
 */
export function getCharPix(text, fontSize = 16) {
  let dom = document.createElement("span");
  dom.style.display = "inline-block";
  dom.style.whiteSpace = "pre";
  dom.style.fontSize = fontSize;
  dom.textContent = text;
  document.body.appendChild(dom);
  const width = dom.offsetWidth;
  const height = dom.offsetHeight;
  document.body.removeChild(dom);
  return { width, height };
}

/**
 * 根据两点坐标获取箭头的坐标
 * @param {number} x1  -横坐标
 * @param {number} y1  -纵坐标
 * @param {number} x2  - 横坐标
 * @param {number} y2  - 纵坐标
 * @returns
 */
export function getArrowPoint(x1, y1, x2, y2) {
  if (y2 > y1) {
    return;
  }
  const y = y1 - y2;
  const x = x1 > x2 ? x1 - x2 : x2 - x1;
  const angle = (Math.atan(y / x) * 180) / Math.PI;
  const pointPosition = {};
  if (x1 < x2) {
    if (angle < 70) {
      pointPosition.x1 = x1 + 12 * Math.cos(((angle - 20) * Math.PI) / 180);
      pointPosition.y1 = y1 - 12 * Math.sin(((angle - 20) * Math.PI) / 180);
      pointPosition.x2 = x1 + 12 * Math.cos(((angle + 20) * Math.PI) / 180);
      pointPosition.y2 = y1 - 12 * Math.sin(((angle + 20) * Math.PI) / 180);
    }
    if (angle >= 70) {
      pointPosition.x1 = x1 + 12 * Math.cos(((angle - 20) * Math.PI) / 180);
      pointPosition.y1 = y1 - 12 * Math.sin(((angle - 20) * Math.PI) / 180);
      pointPosition.x2 =
        x1 - 12 * Math.cos(((180 - (angle + 20)) * Math.PI) / 180);
      pointPosition.y2 =
        y1 - 12 * Math.sin(((180 - (angle + 20)) * Math.PI) / 180);
    }
  }
  if (x1 > x2) {
    if (angle < 70) {
      pointPosition.x1 = x1 - 12 * Math.cos(((angle - 20) * Math.PI) / 180);
      pointPosition.y1 = y1 - 12 * Math.sin(((angle - 20) * Math.PI) / 180);
      pointPosition.x2 = x1 - 12 * Math.cos(((angle + 20) * Math.PI) / 180);
      pointPosition.y2 = y1 - 12 * Math.sin(((angle + 20) * Math.PI) / 180);
    }
    if (angle >= 70) {
      pointPosition.x1 = x1 - 12 * Math.cos(((angle - 20) * Math.PI) / 180);
      pointPosition.y1 = y1 - 12 * Math.sin(((angle - 20) * Math.PI) / 180);
      pointPosition.x2 =
        x1 + 12 * Math.cos(((180 - (angle + 20)) * Math.PI) / 180);
      pointPosition.y2 =
        y1 - 12 * Math.sin(((180 - (angle + 20)) * Math.PI) / 180);
    }
  }
  return pointPosition;
}

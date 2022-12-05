export class SVGFactory {
  /**
   * 创建svg标签
   * @returns {SVGSVGElement}
   */
  static createSVG() {
    return SVGFactory.createSVGElement("svg");
  }

  /**
   * 创建g标签
   * @returns {SVGGElement}
   */
  static createG() {
    return SVGFactory.createSVGElement("g");
  }

  /**
   * 创建rect标签
   * @returns {SVGRectElement}
   */
  static createRect() {
    return SVGFactory.createSVGElement("rect");
  }

  /**
   * 创建text标签
   * @returns {SVGTextElement}
   */
  static createText() {
    return SVGFactory.createSVGElement("text");
  }

  /**
   * 创建polyline标签
   * @returns {SVGPolylineElement}
   */
  static createPolyline() {
    return SVGFactory.createSVGElement("polyline");
  }

  /**
   * 创建polygon标签
   * @returns {SVGPolygonElement}
   */
  static createPolygon() {
    return SVGFactory.createSVGElement("polygon");
  }

  /**
   * 创建svg标签
   * @param {string} name - 标签名称
   * @returns {SVGElement}
   */
  static createSVGElement(name) {
    return document.createElementNS("http://www.w3.org/2000/svg", name);
  }
}

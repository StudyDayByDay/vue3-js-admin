import { getScrollbarWidth } from "../util/index.js";

// 默认样式配置
export const config = {
  paddingTop: 20, // 上距离
  paddingRight: getScrollbarWidth() + 80, // 右边距
  paddingBottom: 20, // 下边距
  paddingLeft: getScrollbarWidth() + 80, // 左边距
  lineHeight: 25, // 行高
  letterSpacing: 0, // 字间距
  fontSize: 16, // 字体大小
  linebreaks: "\n", // 换行符
  segmentSpacing: 5, // 段间距
  beforeParagraph: 32, // 段前
};

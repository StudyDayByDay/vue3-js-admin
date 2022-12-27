const labels = Array.from({length: 580}).map((item, index) => {
    return {
        startIndex: index*4,
        endIndex: (index + 1)*4 - 1,
        textContent: '标签',
        exData: index,
    };
});

const paths = Array.from({length: 580}).map((item, index) => {
    return {
          startLabelExData: index,
          endLabelExData: index + 1,
          textContent: "连线",
          exData: index,
    };
});

export {labels, paths};
export { Carver } from "./Carver/lib/carver";
export * from './api.js';
export * from './axios.js';
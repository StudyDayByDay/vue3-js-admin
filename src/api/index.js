import {axios} from '@/utils';
import {assignApis, genApis} from '@/utils';
import query from './query.js';
import operation from './operation.js';

const apis = {
};

// 把全部api集中到apis上面
assignApis(
  apis,
  query,
  operation,
);

// 把apis运算并散发出去
export default genApis(apis, axios);


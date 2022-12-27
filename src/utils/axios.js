import axios from 'axios';
import qs from 'qs';
import { ElMessage } from 'element-plus';

const instance = axios.create({
  baseURL: '/dev-api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

instance.interceptors.request.use(
  (config) => {
    if (
      config.data &&
      config.headers['Content-Type'] === 'application/x-www-form-urlencoded;charset=UTF-8'
    )
      config.data = qs.stringify(config.data);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response) => {
    const {data: {error, httpStatusCode}, data:res} = response
    // 操作成功
    if ([200, 0].indexOf(httpStatusCode) !== -1) {
      return res;
    } else {
      ElMessage.error(error.message);
      return Promise.reject(error);
    }
  },
  (error) => {
    const { message } = error;
    ElMessage.error(message);
    return Promise.reject(error);
  }
);

export {instance as axios};

// utils/location.js


const waitForTMap = () => {
  return new Promise((resolve, reject) => {
    if (typeof TMap !== 'undefined' && TMap.service) {
      resolve();
      return;
    }
    let count = 0;
    const interval = setInterval(() => {
      if (typeof TMap !== 'undefined' && TMap.service) {
        clearInterval(interval);
        resolve();
      } else if (count > 50) { // 5 秒超时
        clearInterval(interval);
        reject(new Error('腾讯地图 API 加载超时'));
      }
      count++;
    }, 100);
  });
};
// 你申请的高德/腾讯地图 Key
const TENCENT_MAP_KEY = 'FAYBZ-V5CCT-B7JXY-VF6E3-AKKES-D6BNG';

/**
 * 使用腾讯定位组件获取精确位置 (GCJ-02坐标)
 * @returns {Promise<{latitude: number, longitude: number}>}
 */


// 修改 getPreciseLocation，先等待加载完成
const getPreciseLocation = async () => {
  await waitForTMap(); // 等待 TMap 就绪
  return new Promise((resolve, reject) => {
    const location = new TMap.service.Geolocation();
    location.getLocation().then(
      (result) => {
        if (result && result.latLng) {
          const { lat, lng } = result.latLng;
          resolve({ latitude: lat, longitude: lng });
        } else {
          reject(new Error('腾讯定位返回数据异常'));
        }
      },
      (error) => reject(error)
    );
  });
};

/**
 * 获取当前经纬度（Promise 封装）
 * 优先使用腾讯定位组件，失败后自动降级为腾讯 IP 定位
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
const getCurrentPosition = async () => {
  try {
    // 1. 优先尝试腾讯高精度定位
    console.log('尝试使用腾讯定位组件进行精确定位...');
    return await getPreciseLocation();
  } catch (highPrecisionError) {
    // 2. 精确定位失败，降级为 IP 定位兜底
    console.warn('高精度定位失败，尝试降级为 IP 定位...', highPrecisionError);
    return await getTencentIPLocation();
  }
};

/**
 * 通过腾讯 IP 定位获取经纬度（仅作兜底，精度市级）
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
// utils/location.js 中的 getTencentIPLocation 替换为 JSONP 版本
// utils/location.js 中的 getTencentIPLocation 替换为 JSONP 版本
const getTencentIPLocation = () => {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Date.now();
    const url = `https://apis.map.qq.com/ws/location/v1/ip?key=${TENCENT_MAP_KEY}&output=jsonp&callback=${callbackName}`;

    // 动态创建 script 标签
    const script = document.createElement('script');
    script.src = url;
    script.onerror = () => {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error('JSONP 请求失败'));
    };

    // 定义全局回调函数
    window[callbackName] = (data) => {
      delete window[callbackName];
      document.body.removeChild(script);
      if (data.status === 0 && data.result && data.result.location) {
        const { lat, lng } = data.result.location;
        resolve({ latitude: lat, longitude: lng });
      } else {
        reject(new Error(`IP 定位失败: ${data.message}`));
      }
    };

    document.body.appendChild(script);
  });
};



/**
 * 
 * 
 * 将经纬度存入 sessionStorage
 * @param {number} latitude
 * @param {number} longitude
 */
export const cacheLocation = (latitude, longitude) => {
  const data = {
    latitude,
    longitude,
    timestamp: Date.now(),
  };
  sessionStorage.setItem('emergencyLocation', JSON.stringify(data));
};

/**
 * 从 sessionStorage 读取缓存的经纬度
 * @returns {{latitude: number, longitude: number, timestamp: number} | null}
 */
export const getCachedLocation = () => {
  const raw = sessionStorage.getItem('emergencyLocation');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * 静默获取位置并更新缓存（不抛出错误，失败时保留旧缓存）
 * 供 onMounted 和定时器调用
 */
export const updateLocationCacheSilently = async () => {
  try {
    const { latitude, longitude } = await getCurrentPosition();
    cacheLocation(latitude, longitude);
    console.log('位置缓存已更新', { latitude, longitude });
  } catch (err) {
    console.warn('位置缓存更新失败，保留旧缓存', err);
    // 失败时不覆盖原有缓存，不清空
  }
};
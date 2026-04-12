// utils/location.js
/**
 * 前端定位工具：封装浏览器原生定位 + sessionStorage 缓存
 * 不依赖任何第三方 Key
 */

/**
 * 获取当前经纬度（Promise 封装）
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理位置'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,   // 高精度
        timeout: 10000,             // 10 秒超时
        maximumAge: 0,              // 不缓存位置
      }
    );
  });
};

/**
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
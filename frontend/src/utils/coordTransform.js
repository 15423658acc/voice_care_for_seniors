// utils/coordTransform.js

/**
 * 坐标转换工具（纯前端算法，无外部依赖）
 * 参考自开源实现：https://github.com/wandergis/coordTransform
 */

const PI = 3.14159265358979323846;
const A = 6378245.0;       // 长半轴
const EE = 0.00669342162296594323; // 偏心率平方

/**
 * 判断是否在中国境内（用于决定是否需要偏移）
 */
function outOfChina(lng, lat) {
  return (lng < 72.004 || lng > 137.8347) || (lat < 0.8293 || lat > 55.8271);
}

/**
 * 转换经度偏移量
 */
function transformLng(lng, lat) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

/**
 * 转换纬度偏移量
 */
function transformLat(lng, lat) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320.0 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

/**
 * WGS-84 转 GCJ-02（火星坐标系）
 * @param {number} lng WGS-84 经度
 * @param {number} lat WGS-84 纬度
 * @returns {{lng: number, lat: number}} GCJ-02 坐标
 */
export function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) {
    return { lng, lat };
  }
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  const mgLng = lng + dLng;
  const mgLat = lat + dLat;
  return { lng: mgLng, lat: mgLat };
}

/**
 * GCJ-02 转 WGS-84（粗略，适用于低精度场景）
 * @param {number} lng GCJ-02 经度
 * @param {number} lat GCJ-02 纬度
 * @returns {{lng: number, lat: number}} WGS-84 坐标
 */
export function gcj02ToWgs84(lng, lat) {
  if (outOfChina(lng, lat)) {
    return { lng, lat };
  }
  const init = wgs84ToGcj02(lng, lat);
  const dLng = init.lng - lng;
  const dLat = init.lat - lat;
  return { lng: lng - dLng, lat: lat - dLat };
}

/**
 * GCJ-02 转 BD-09（百度坐标系）
 * @param {number} lng GCJ-02 经度
 * @param {number} lat GCJ-02 纬度
 * @returns {{lng: number, lat: number}} BD-09 坐标
 */
export function gcj02ToBd09(lng, lat) {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * PI);
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * PI);
  const bdLng = z * Math.cos(theta) + 0.0065;
  const bdLat = z * Math.sin(theta) + 0.006;
  return { lng: bdLng, lat: bdLat };
}

/**
 * BD-09 转 GCJ-02
 * @param {number} lng BD-09 经度
 * @param {number} lat BD-09 纬度
 * @returns {{lng: number, lat: number}} GCJ-02 坐标
 */
export function bd09ToGcj02(lng, lat) {
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * PI);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * PI);
  const gcjLng = z * Math.cos(theta);
  const gcjLat = z * Math.sin(theta);
  return { lng: gcjLng, lat: gcjLat };
}

/**
 * WGS-84 转 BD-09（组合转换）
 * @param {number} lng WGS-84 经度
 * @param {number} lat WGS-84 纬度
 * @returns {{lng: number, lat: number}} BD-09 坐标
 */
export function wgs84ToBd09(lng, lat) {
  const gcj = wgs84ToGcj02(lng, lat);
  return gcj02ToBd09(gcj.lng, gcj.lat);
}
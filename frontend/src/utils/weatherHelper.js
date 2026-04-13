/**
 * 根据城市名和天气数据生成穿衣/出行建议
 * @param {string} city 城市名（例如"北京"）
 * @param {string} weatherDesc 天气描述（例如"晴"）
 * @param {number} temp 温度（摄氏度）
 * @returns {string} 人性化建议文本
 */
export function generateWeatherAdvice(city, weatherDesc, temp) {
  // 地域偏好判断：根据城市名判断南北（简单示例，可扩展）
  const northCities = ['北京', '天津', '哈尔滨', '沈阳', '长春', '石家庄', '太原', '呼和浩特']
  const southCities = ['广州', '深圳', '海口', '南宁', '福州', '厦门', '昆明', '成都', '重庆', '上海', '杭州', '南京']
  
  let region = '未知'
  if (northCities.includes(city)) region = '北方'
  else if (southCities.includes(city)) region = '南方'

  // 基础建议
  let advice = ''
  if (temp < 5) {
    advice = '天气寒冷，记得穿羽绒服，戴上帽子和手套。'
  } else if (temp < 15) {
    advice = '天气较凉，建议穿毛衣加外套。'
  } else if (temp < 25) {
    advice = '温度舒适，穿长袖或薄外套即可。'
  } else {
    advice = '天气较热，注意防晒，穿短袖。'
  }

  // 结合地域和天气描述
  if (weatherDesc.includes('雨')) {
    advice += ' 今天有雨，出门记得带伞。'
  } else if (weatherDesc.includes('雪')) {
    advice += ' 下雪路滑，走路小心。'
  }

  // 地域偏好调整
  if (region === '南方' && temp < 10) {
    advice += ' 南方湿冷，注意保暖。'
  } else if (region === '北方' && temp > 30) {
    advice += ' 北方干热，多喝水。'
  }

  return `${city}今天${weatherDesc}，温度${temp}度。${advice}`
}
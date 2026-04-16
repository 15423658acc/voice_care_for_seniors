// frontend/src/utils/weatherHelper.js

/**
 * 判断城市所属地域（南方/北方）
 * 可扩展更多城市或改用行政区划数据
 * @param {string} city 城市名
 * @returns {'南方'|'北方'|'未知'}
 */
function getRegionByCity(city) {
  const northCities = [
    '北京', '天津', '哈尔滨', '沈阳', '长春', '石家庄', '太原', '呼和浩特',
    '济南', '青岛', '郑州', '西安', '兰州', '西宁', '银川', '乌鲁木齐',
    '拉萨', '大连', '吉林'
  ];
  const southCities = [
    '广州', '深圳', '海口', '南宁', '福州', '厦门', '昆明', '成都', '重庆',
    '上海', '杭州', '南京', '武汉', '长沙', '南昌', '贵阳', '合肥', '宁波',
    '苏州', '无锡', '佛山', '东莞'
  ];
  if (northCities.includes(city)) return '北方';
  if (southCities.includes(city)) return '南方';
  return '未知';
}

/**
 * 根据温度、湿度、地域生成穿衣建议（核心逻辑）
 * @param {number} temp 温度（℃）
 * @param {number} humidity 相对湿度（%）
 * @param {string} region 地域（南方/北方/未知）
 * @returns {string} 穿衣建议文本
 */
function getClothingAdvice(temp, humidity, region) {
  let advice = '';
  // 体感修正：高湿度会放大冷/热感
  const isHumid = humidity > 75;
  const isDry = humidity < 30;

  if (temp < 0) {
    advice = '极寒天气，务必穿厚羽绒服、棉裤、雪地靴，戴好帽子围巾手套。';
  } else if (temp < 5) {
    advice = '天气寒冷，穿羽绒服或厚棉衣，戴上帽子和手套。';
    if (isHumid && region === '南方') advice += ' 南方湿冷刺骨，尤其注意膝盖和脚部保暖。';
  } else if (temp < 10) {
    advice = '天气较冷，建议穿毛衣加厚外套。';
    if (isHumid && region === '南方') advice += ' 湿度大，体感更冷，可以多穿一件背心。';
  } else if (temp < 15) {
    advice = '天气偏凉，适合穿薄毛衣或卫衣，早晚加一件外套。';
    if (isHumid) advice += ' 空气潮湿，别穿容易受潮的棉质内衣。';
  } else if (temp < 20) {
    advice = '温度舒适，长袖T恤加薄外套即可。';
  } else if (temp < 25) {
    advice = '温暖宜人，穿短袖或连衣裙，早晚稍凉可带一件薄衫。';
  } else if (temp < 30) {
    advice = '天气较热，穿短袖、短裤，注意遮阳。';
    if (isHumid) advice += ' 湿度高，体感闷热，选吸汗透气的纯棉衣服。';
    if (isDry && region === '北方') advice += ' 北方干热，多补充水分。';
  } else {
    advice = '酷热！穿轻薄透气的夏装，避免中午外出，小心中暑。';
    if (isHumid) advice += ' 闷热如蒸笼，建议待在空调房。';
  }
  return advice;
}

/**
 * 根据天气描述生成出行特别提醒（带伞、防滑、防晒等）
 * @param {string} description 天气现象（如“小雨”“晴”）
 * @returns {string} 出行建议
 */
function getTravelAdvice(description) {
  if (description.includes('雨')) {
    if (description.includes('大') || description.includes('暴')) return '有大雨或暴雨，非必要不出门，出门一定带好雨具，避开低洼路段。';
    if (description.includes('中')) return '中雨，出门记得带伞，路面湿滑慢点走。';
    return '有雨，出门别忘带伞，小心地滑。';
  }
  if (description.includes('雪')) {
    if (description.includes('大') || description.includes('暴')) return '大雪天气，尽量不出门，注意防滑防摔。';
    return '下雪路滑，走路要慢，穿防滑鞋。';
  }
  if (description.includes('雾') || description.includes('霾')) {
    return '能见度低，出门戴口罩，开车慢行，老人最好减少外出。';
  }
  if (description.includes('晴') && (description.includes('高温') || description.includes('热'))) {
    return '阳光强烈，出门戴帽子、墨镜，涂防晒霜。';
  }
  if (description.includes('风')) {
    return '风力较大，注意关好门窗，出门防风保暖。';
  }
  return '';
}

/**
 * 比较昨日与今日的天气变化（温度、天气现象）
 * @param {object} yesterday 昨日数据 { textDay, tempMax, tempMin } 或 null
 * @param {number} todayTemp 今日温度
 * @param {string} todayDesc 今日天气描述
 * @returns {string} 变化描述文本
 */
function compareWithYesterday(yesterday, todayTemp, todayDesc) {
  if (!yesterday) return '';
  // 昨日平均温度近似 (tempMax+tempMin)/2
  const yesterdayTempAvg = (parseFloat(yesterday.tempMax) + parseFloat(yesterday.tempMin)) / 2;
  const diff = todayTemp - yesterdayTempAvg;
  let changeText = '';
  if (Math.abs(diff) < 1.5) {
    changeText = '和昨天差不多';
  } else if (diff > 0) {
    changeText = `比昨天暖和了约${Math.round(diff)}度`;
  } else {
    changeText = `比昨天冷了约${Math.round(-diff)}度`;
  }
  // 天气现象变化（简单判断文字是否相同）
  const weatherSame = (yesterday.textDay && yesterday.textDay === todayDesc);
  if (!weatherSame && yesterday.textDay) {
    changeText += `，天气也从“${yesterday.textDay}”变成“${todayDesc}”`;
  }
  return `今天${changeText}。`;
}

/**
 * 分析未来三天天气趋势，生成提醒
 * @param {Array} forecast 未来三天数组 [{ date, textDay, tempMax, tempMin }]
 * @returns {string} 未来趋势建议文本
 */
function getFutureTrendAdvice(forecast) {
  if (!forecast || forecast.length === 0) return '';
  let advice = '未来三天：';
  // 检查是否有雨雪
  const hasRain = forecast.some(day => day.textDay && day.textDay.includes('雨'));
  const hasSnow = forecast.some(day => day.textDay && day.textDay.includes('雪'));
  if (hasRain) advice += ' 近期有雨，出门随身带伞；';
  if (hasSnow) advice += ' 即将下雪，注意保暖和防滑；';

  // 温度趋势
  const temps = forecast.map(day => (parseFloat(day.tempMax) + parseFloat(day.tempMin)) / 2);
  const first = temps[0];
  const last = temps[temps.length - 1];
  let trend = '';
  if (last > first + 2) trend = '未来三天逐渐升温，';
  else if (last < first - 2) trend = '未来三天明显降温，注意加衣服，';
  else trend = '未来三天温度平稳，';

  // 极端高温/低温提醒
  const extremeHot = forecast.some(day => day.tempMax > 32);
  const extremeCold = forecast.some(day => day.tempMin < 0);
  if (extremeHot) trend += '其中有一天会很热，尽量避开中午出门；';
  if (extremeCold) trend += '其中一天会非常冷，穿厚实些；';

  advice += trend + '请根据天气变化调整衣着。';
  return advice;
}

/**
 * 生成完整天气建议（主函数，供外部调用）
 * @param {object} weatherData 天气数据，结构如下：
 *   {
 *     current: { city, description, temperature, humidity },
 *     forecast: [{ date, textDay, tempMax, tempMin }],
 *     yesterday: { textDay, tempMax, tempMin } 或 null
 *   }
 * @returns {string} 面向老人的人性化建议文本
 */
export function generateWeatherAdvice(weatherData) {
  // 解构数据，兼容旧字段名
  const { current, forecast, yesterday } = weatherData;
  const city = current.city;
  const weatherDesc = current.description;
  const temp = parseFloat(current.temperature);
  const humidity = parseFloat(current.humidity);

  // 1. 地域判断
  const region = getRegionByCity(city);

  // 2. 今日基础信息
  let result = `${city}今天${weatherDesc}，温度${temp}度，湿度${humidity}%。`;

  // 3. 与昨日对比（如果有昨日数据）
  const yesterdayText = compareWithYesterday(yesterday, temp, weatherDesc);
  if (yesterdayText) result += ' ' + yesterdayText;

  // 4. 穿衣建议（结合温度、湿度、地域）
  const clothing = getClothingAdvice(temp, humidity, region);
  result += ' ' + clothing;

  // 5. 出行特别提醒（带伞、防滑等）
  const travel = getTravelAdvice(weatherDesc);
  if (travel) result += ' ' + travel;

  // 6. 未来三天趋势
  const future = getFutureTrendAdvice(forecast);
  if (future) result += ' ' + future;

  return result;
}
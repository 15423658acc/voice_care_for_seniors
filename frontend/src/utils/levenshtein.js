/**
 * 计算两个字符串的编辑距离（Levenshtein Distance）
 * 编辑距离越小，表示两个字符串越相似
 * @param {string} a 字符串A
 * @param {string} b 字符串B
 * @returns {number} 编辑距离值
 */
export function levenshtein(a, b) {
  const matrix = []

  // 初始化矩阵第一列
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  // 初始化矩阵第一行
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // 填充矩阵
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替换
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j] + 1      // 删除
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/**
 * 计算置信度（0-1之间，值越大越相似）
 * @param {string} input 用户输入
 * @param {string} target 目标字符串
 * @returns {number} 置信度
 */
export function calculateConfidence(input, target) {
  const maxLen = Math.max(input.length, target.length)
  if (maxLen === 0) return 1.0
  const distance = levenshtein(input, target)
  return 1 - distance / maxLen
}
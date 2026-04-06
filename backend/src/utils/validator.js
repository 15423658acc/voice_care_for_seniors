// 手机号验证（简单 11 位数字，以 1 开头）
const isValidPhone = (phone) => {
    return /^1[3-9]\d{9}$/.test(phone)
}

// 密码强度验证（至少8位，包含大写、小写、数字）
const isValidPassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    return regex.test(password)
}
module.exports = {
    isValidPhone,
    isValidPassword
}

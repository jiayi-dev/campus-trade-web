import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
    baseURL: '/api',
    timeout: 10000
})

// 请求拦截器：自动携带 Token
request.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token')

        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// 从错误响应中取后端文本：
// - JSON 接口取 data.message
// - AuthInterceptor 直接写 text/plain，axios 解析后 data 就是字符串
const pickServerMessage = (data) => {
    if (!data) return ''
    if (typeof data === 'string') return data
    return data.message || ''
}

// 响应拦截器：按错误类型给出产品化提示（不再一律显示"请求失败"）
request.interceptors.response.use(
    response => {
        return response.data
    },
    error => {
        const { response, code: axiosCode, config = {} } = error
        let message

        if (!response) {
            // 没有响应：断网 / 跨域 / 超时
            message = axiosCode === 'ECONNABORTED'
                ? '请求超时，请稍后再试'
                : '网络连接失败，请检查网络后重试'
        } else {
            const status = response.status
            const serverMessage = pickServerMessage(response.data)
            const url = config.url || ''
            const isLoginRequest = url.includes('/auth/') && url.includes('/login')

            if (status === 401) {
                // 登录接口的 401 = 凭证错误；其它接口的 401 = Token 缺失/过期
                message = isLoginRequest
                    ? '账号或密码错误，请检查后重试'
                    : (serverMessage || '登录状态已过期，请重新登录')
            } else if (status === 403) {
                message = serverMessage || '没有权限执行此操作'
            } else if (status >= 500) {
                message = '服务器开小差了，请稍后再试'
            } else {
                // 400/404 等：优先展示后端明确业务信息
                message = serverMessage || '请求失败，请稍后再试'
            }
        }

        ElMessage.error(message)

        return Promise.reject(error)
    }
)

export default request

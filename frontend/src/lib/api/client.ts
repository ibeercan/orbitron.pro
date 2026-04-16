import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.orbitron.pro/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/me')
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      
      if (!isAuthEndpoint && !isAuthPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },

  register: async (email: string, password: string, inviteCode?: string) => {
    return api.post('/auth/register', { email, password, invite_code: inviteCode })
  },

  logout: async () => {
    return api.post('/auth/logout')
  },

  me: async () => {
    return api.get('/auth/me')
  },
}

export const subscriptionApi = {
  earlyAccess: async (email: string, inviteCode?: string) => {
    return api.post('/subscriptions/early-access', { email, invite_code: inviteCode })
  },

  checkInvite: async (email: string, inviteCode?: string) => {
    return api.post('/subscriptions/check-invite', { email, invite_code: inviteCode })
  },

  getSubscription: async () => {
    return api.get('/subscriptions/me')
  },

  upgrade: async (plan: string) => {
    return api.post('/subscriptions/upgrade', { plan })
  },
}

export const chartsApi = {
  list: async () => {
    return api.get('/charts/')
  },

  get: async (id: string) => {
    return api.get(`/charts/${id}`)
  },

  getSvg: async (id: string) => {
    return api.get(`/charts/${id}/svg`)
  },

  create: async (data: {
    datetime: string
    location: string
    theme?: string
    house_system?: string
    preset?: string
    zodiac_palette?: string
  }) => {
    return api.post('/charts/natal', data)
  },
}

export const aiApi = {
  interpret: async (chartId: string, question: string, requestType: string = 'general') => {
    return api.post(`/ai/${chartId}/interpret`, { question, request_type: requestType })
  },
}
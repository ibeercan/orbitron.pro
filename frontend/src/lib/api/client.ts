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
      const isLandingPage = window.location.pathname === '/'
      
      if (!isAuthEndpoint && !isLandingPage) {
        window.location.href = '/'
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

  completeOnboarding: async () => {
    return api.post('/auth/onboarding-complete')
  },
}

export const subscriptionApi = {
  earlyAccess: async (email: string, inviteCode?: string) => {
    return api.post('/subscriptions/early-access', { email, invite_code: inviteCode })
  },

  checkEmail: async (email: string) => {
    return api.post('/subscriptions/check-email', { email })
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
  list: async (chartType?: string) => {
    const params = chartType ? { chart_type: chartType } : {}
    return api.get('/charts/', { params })
  },

  get: async (id: number) => {
    return api.get(`/charts/${id}`)
  },

  getSvg: async (id: number) => {
    return api.get(`/charts/${id}/svg`)
  },

  create: async (data: {
    datetime: string
    location: string
    name?: string
    theme?: string
    house_system?: string
    preset?: string
    zodiac_palette?: string
  }) => {
    return api.post('/charts/natal', data)
  },

  createSynastry: async (data: {
    natal_chart_id: number
    person_id?: number
    person2_datetime?: string
    person2_location?: string
    person2_name?: string
    theme?: string
  }) => {
    return api.post('/charts/synastry', data)
  },

  createTransit: async (data: {
    natal_chart_id: number
    transit_datetime?: string
    theme?: string
  }) => {
    return api.post('/charts/transit', data)
  },

  getTransitTimeline: async (natalChartId: number, startDate: string, endDate: string) => {
    return api.post('/charts/transit-timeline', null, {
      params: { natal_chart_id: natalChartId, start_date: startDate, end_date: endDate },
    })
  },

  createSolarReturn: async (data: {
    natal_chart_id: number
    year?: number
    location_override?: string
    theme?: string
  }) => {
    return api.post('/charts/solar-return', data)
  },

  createLunarReturn: async (data: {
    natal_chart_id: number
    near_date?: string
    theme?: string
  }) => {
    return api.post('/charts/lunar-return', data)
  },

  createProfection: async (data: {
    natal_chart_id: number
    target_date?: string
    age?: number
    rulership?: string
  }) => {
    return api.post('/charts/profection', data)
  },

  generateReport: async (chartId: number, preset?: string, title?: string) => {
    return api.post(`/charts/${chartId}/report`, null, {
      params: { preset: preset || 'standard', ...(title ? { title } : {}) },
      responseType: 'blob',
    })
  },

  delete: async (id: number) => {
    return api.delete(`/charts/${id}`)
  },
}

export const personsApi = {
  list: async () => {
    return api.get('/persons/')
  },

  get: async (id: number) => {
    return api.get(`/persons/${id}`)
  },

  create: async (data: {
    name: string
    datetime: string
    location: string
  }) => {
    return api.post('/persons/', data)
  },

  update: async (id: number, data: {
    name?: string
    datetime?: string
    location?: string
  }) => {
    return api.put(`/persons/${id}`, data)
  },

  delete: async (id: number) => {
    return api.delete(`/persons/${id}`)
  },
}

export const geocodingApi = {
  search: async (query: string) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
      {
        headers: {
          'User-Agent': 'Orbitron/1.0',
        },
      }
    );
    return response.json();
  },
}

export const aiApi = {
  interpret: async (chartId: string, question: string, requestType: string = 'general') => {
    return api.post(`/ai/${chartId}/interpret`, { question, request_type: requestType })
  },
}

export const inviteApi = {
  generate: async () => {
    return api.post('/invites/generate')
  },
  list: async () => {
    return api.get('/invites')
  },
}

export const chatApi = {
  listSessions: async () => {
    return api.get('/chat')
  },
  getSession: async (sessionId: number) => {
    return api.get(`/chat/${sessionId}`)
  },
  startChat: async (chartId: string) => {
    return api.post(`/chat/chart/${chartId}/start`)
  },
  sendMessage: async (sessionId: number, content: string) => {
    return api.post(`/chat/${sessionId}/messages`, { content })
  },
}

export const notablesApi = {
  astroTwins: async (natalChartId: number) => {
    return api.post('/charts/astro-twins', null, { params: { natal_chart_id: natalChartId } })
  },
  historicalParallels: async (natalChartId: number) => {
    return api.post('/charts/historical-parallels', null, { params: { natal_chart_id: natalChartId } })
  },
  listNotableEvents: async () => {
    return api.get('/charts/notable-events')
  },
}
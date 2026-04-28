import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.orbitron.pro/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
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

  createPlanetaryReturn: async (data: {
    natal_chart_id: number
    planet?: string
    near_date?: string
    location_override?: string
    theme?: string
  }) => {
    return api.post('/charts/planetary-return', data)
  },

  createProfection: async (data: {
    natal_chart_id: number
    target_date?: string
    age?: number
    rulership?: string
  }) => {
    return api.post('/charts/profection', data)
  },

  createSolarArc: async (data: {
    natal_chart_id: number
    target_date?: string
    age?: number
    theme?: string
  }) => {
    return api.post('/charts/solar-arc', data)
  },

  createProgression: async (data: {
    natal_chart_id: number
    target_date?: string
    age?: number
    theme?: string
  }) => {
    return api.post('/charts/progression', data)
  },

  createComposite: async (data: {
    natal_chart_id: number
    person_id?: number
    person2_datetime?: string
    person2_location?: string
    person2_name?: string
    synthesis_type: string
    theme?: string
  }) => {
    return api.post('/charts/composite', data)
  },

  createHorary: async (data: {
    datetime: string
    location: string
    question: string
    name?: string
    theme?: string
    house_system?: string
    preset?: string
    zodiac_palette?: string
  }) => {
    return api.post('/charts/horary', data)
  },

  createElectional: async (data: {
    datetime: string
    location: string
    question: string
    name?: string
    theme?: string
    house_system?: string
    preset?: string
    conditions?: string[]
    step?: string
  }) => {
    return api.post('/charts/horary', data)
  },

  electionalSearch: async (data: {
    location: string
    start_date: string
    end_date: string
    preset: string
    conditions: string[]
    step?: string
  }) => {
    return api.post('/electional/search', data)
  },

  electionalPoll: async (searchId: number) => {
    return api.get(`/electional/${searchId}/poll`)
  },

  electionalSelect: async (data: {
    search_id: number
    moment_index: number
    name?: string
    theme?: string
    house_system?: string
  }) => {
    return api.post('/electional/select', data)
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

  rectify: async (data: {
    birth_date: string
    location: string
    events: { date: string; event_type: string; description?: string }[]
    house_system?: string
    step_minutes?: number
  }): Promise<{ data: { status: string; progress: number; result?: Record<string, unknown>; error?: string } }> => {
    return api.post('/charts/rectify', data)
  },

  plannerGenerate: async (data: {
    chart_id: number
    year: number
    preset: string
    date_range_start?: string
    date_range_end?: string
    page_size: string
    week_starts_on: string
    binding_margin?: number
    front_natal: boolean
    front_progressed: boolean
    front_solar_return: boolean
    front_profections: boolean
    front_zr_timeline: boolean
    front_zr_lot: string
    front_ephemeris: boolean
    front_ephemeris_harmonic: number
    include_natal_transits: boolean
    include_natal_transits_outer_only: boolean
    include_mundane_transits: boolean
    include_moon_phases: boolean
    include_voc: boolean
    include_voc_mode: string
    include_ingresses: boolean
    include_stations: boolean
  }) => {
    return api.post('/planner/generate', data)
  },

  plannerPoll: async (plannerId: number) => {
    return api.get(`/planner/${plannerId}/poll`)
  },

  plannerDownload: async (plannerId: number) => {
    return api.get(`/planner/${plannerId}/download`, { responseType: 'blob' })
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

export const adminApi = {
  getStats: async () => {
    return api.get('/admin/stats')
  },
  listUsers: async (params?: { subscription?: string; is_admin?: boolean; is_active?: boolean; skip?: number; limit?: number }) => {
    return api.get('/admin/users', { params })
  },
  updateUser: async (id: number, data: { subscription_type?: string; is_admin?: boolean; is_active?: boolean }) => {
    return api.patch(`/admin/users/${id}`, data)
  },
  deleteUser: async (id: number) => {
    return api.delete(`/admin/users/${id}`)
  },
  listInvites: async () => {
    return api.get('/admin/invites')
  },
  generateInvites: async (count: number = 1) => {
    return api.post('/admin/invites/generate', null, { params: { count } })
  },
  listEarlySubscribers: async (params?: { skip?: number; limit?: number }) => {
    return api.get('/admin/early-subscribers', { params })
  },
  inviteSubscriber: async (id: number) => {
    return api.post(`/admin/early-subscribers/${id}/invite`)
  },
  listAuditLogs: async (params?: { entity_type?: string; action?: string; user_id?: number; skip?: number; limit?: number }) => {
    return api.get('/admin/audit-logs', { params })
  },
  listTokenUsage: async (params?: { skip?: number; limit?: number }) => {
    return api.get('/admin/token-usage', { params })
  },
  getSettings: async () => {
    return api.get('/admin/settings')
  },
  updateSettings: async (data: { registration_open: boolean }) => {
    return api.patch('/admin/settings', data)
  },
}
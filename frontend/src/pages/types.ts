export type PageRenderResult = {
  content: string
  mount?: () => void
}

export type PageContext = {
  isAuthenticated: boolean
  me: Record<string, unknown>
  home: Record<string, unknown>
  status: Record<string, unknown>
  escapeHtml: (value: string) => string
  navigate: (route: string) => void
  apiGet: (path: string) => Promise<Record<string, unknown>>
  apiPost: (path: string, payload: Record<string, unknown>) => Promise<Record<string, unknown>>
}
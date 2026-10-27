const hostname = typeof window !== 'undefined' ? window.location.hostname : ''

function detectEnvironment() {
  if (hostname.endsWith('.local')) return 'local'
  if (hostname.includes('-staging.') || hostname.startsWith('staging.')) return 'staging'
  const explicit = import.meta.env.VITE_ENVIRONMENT
  if (explicit && explicit !== 'production') return explicit
  return explicit || 'production'
}

const environment = detectEnvironment()

const defaults = {
  local: {
    siteBaseUrl: 'http://wardseal.local',
    consoleBaseUrl: 'http://manage.wardseal.local',
    idBaseUrl: 'http://id.wardseal.local',
  },
  staging: {
    siteBaseUrl: 'https://staging.wardseal.com',
    consoleBaseUrl: 'https://manage-staging.wardseal.com',
    idBaseUrl: 'https://id-staging.wardseal.com',
  },
  production: {
    siteBaseUrl: 'https://wardseal.com',
    consoleBaseUrl: 'https://manage.wardseal.com',
    idBaseUrl: 'https://id.wardseal.com',
  },
}

const envDefaults = defaults[environment] || defaults.production

export const siteConfig = {
  environment,
  siteBaseUrl: (hostname.endsWith('.local') ? envDefaults.siteBaseUrl : import.meta.env.VITE_SITE_BASE_URL) || envDefaults.siteBaseUrl,
  consoleBaseUrl: (hostname.endsWith('.local') ? envDefaults.consoleBaseUrl : import.meta.env.VITE_CONSOLE_BASE_URL) || envDefaults.consoleBaseUrl,
  idBaseUrl: (hostname.endsWith('.local') ? envDefaults.idBaseUrl : import.meta.env.VITE_ID_URL) || envDefaults.idBaseUrl,
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@wardseal.com',
}

export default siteConfig


export const getEnvVar = (key: string): { value: string; source: string } => {
  // 1. Runtime Window (Docker/Runtime injection)
  if (typeof window !== 'undefined' && (window as any).__ENV && (window as any).__ENV[key]) {
    return { value: (window as any).__ENV[key], source: 'window.__ENV' };
  }
  // 2. Import Meta (Vite)
  if ((import.meta as any).env && (import.meta as any).env[key]) {
    return { value: (import.meta as any).env[key], source: 'import.meta.env' };
  }
  // 3. Process Env (Legacy/Build)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return { value: process.env[key] || '', source: 'process.env' };
    }
  } catch (e) {
    // Ignore process not defined
  }
  return { value: '', source: 'none' };
};

const url = getEnvVar('VITE_SUPABASE_URL');
const key = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!url.value || !key.value) {
  throw new Error('Configuração ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
}

export const supabaseUrl = url.value;
export const supabaseAnonKey = key.value;

export const ENV = {
  USE_SUPABASE: getEnvVar('VITE_USE_SUPABASE').value === 'true'
};

export const debugInfo = {
  debugSource: url.source,
  debugDetails: {
    urlSource: url.source,
    keySource: key.source
  },
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 18)}…` : '',
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}…` : ''
};

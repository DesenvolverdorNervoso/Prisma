
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

// Hardcoded fallback logic (preserving existing app values)
const FALLBACK_URL = "https://baxhbjkvunmjqwablmzb.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheGhiamt2dW5tanF3YWJsbXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTk3MTcsImV4cCI6MjA4NjY3NTcxN30._UfcqiRgX7DhXfFElpZ4AM0AOquUGbW6KQ8CLivu9T4";

export const supabaseUrl = url.value || FALLBACK_URL;
export const supabaseAnonKey = key.value || FALLBACK_KEY;

export const debugInfo = {
  debugSource: url.source !== 'none' ? url.source : (key.source !== 'none' ? key.source : 'none'),
  debugDetails: {
    urlSource: url.source !== 'none' ? url.source : 'hardcoded',
    keySource: key.source !== 'none' ? key.source : 'hardcoded'
  },
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 18)}…` : '',
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}…` : ''
};
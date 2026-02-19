export type Theme = 'light' | 'dark' | 'system';

export const themeService = {
  getTheme: (): Theme => {
    return (localStorage.getItem('prisma_theme') as Theme) || 'system';
  },

  setTheme: (theme: Theme) => {
    localStorage.setItem('prisma_theme', theme);
    themeService.apply(theme);
  },

  apply: (theme: Theme = themeService.getTheme()) => {
    const root = document.documentElement;
    const isDark = 
      theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  },

  init: () => {
    themeService.apply();
    // Listen for system changes if mode is system
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (themeService.getTheme() === 'system') {
        themeService.apply('system');
      }
    });
  }
};
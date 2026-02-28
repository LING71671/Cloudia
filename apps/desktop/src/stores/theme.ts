import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(
    (localStorage.getItem('cloudia_theme') as ThemeMode) ?? 'system',
  );
  const isDark = ref(false);

  function applyTheme() {
    if (mode.value === 'system') {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark.value = mode.value === 'dark';
    }
    document.documentElement.classList.toggle('dark', isDark.value);
  }

  function setMode(m: ThemeMode) {
    mode.value = m;
    localStorage.setItem('cloudia_theme', m);
    applyTheme();
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (mode.value === 'system') applyTheme();
    });

  // Apply on store creation
  applyTheme();

  return { mode, isDark, setMode };
});

/** Cross-platform notification composable */
export function useNotification() {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  async function requestPermission(): Promise<boolean> {
    if (isTauri) {
      // Tauri notifications are always permitted via tauri.conf.json
      return true;
    }
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }

  async function notify(title: string, body: string) {
    if (isTauri) {
      try {
        // Dynamic import hidden from Vite's static analysis — only resolves in Tauri runtime
        const modPath = '@tauri-apps/plugin-notification';
        const mod = await (new Function('p', 'return import(p)') as (p: string) => Promise<any>)(modPath);
        await mod.sendNotification({ title, body });
      } catch {
        fallbackWebNotification(title, body);
      }
    } else {
      fallbackWebNotification(title, body);
    }
  }

  function fallbackWebNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  return { notify, requestPermission, isTauri };
}

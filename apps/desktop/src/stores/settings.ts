import { defineStore } from 'pinia';
import { ref } from 'vue';
import { DEFAULT_ENDPOINT, DEFAULT_REST_ENDPOINT } from '@cloudia/shared';

export const useSettingsStore = defineStore('settings', () => {
  const ENDPOINT_KEY = 'cloudia_ws_endpoint';
  const REST_KEY = 'cloudia_rest_endpoint';

  const wsEndpoint = ref(localStorage.getItem(ENDPOINT_KEY) ?? DEFAULT_ENDPOINT);
  const restEndpoint = ref(localStorage.getItem(REST_KEY) ?? DEFAULT_REST_ENDPOINT);

  function setEndpoints(ws: string, rest: string) {
    wsEndpoint.value = ws;
    restEndpoint.value = rest;
    localStorage.setItem(ENDPOINT_KEY, ws);
    localStorage.setItem(REST_KEY, rest);
  }

  function resetToDefault() {
    setEndpoints(DEFAULT_ENDPOINT, DEFAULT_REST_ENDPOINT);
  }

  /** Parse URL query params for BYOS dynamic switching */
  function applyUrlOverrides() {
    const params = new URLSearchParams(window.location.search);
    const ep = params.get('endpoint');
    if (ep) {
      // Derive REST endpoint from WS endpoint
      const rest = ep.replace(/^wss?:\/\//, 'https://');
      setEndpoints(ep, rest);
    }
  }

  return {
    wsEndpoint,
    restEndpoint,
    setEndpoints,
    resetToDefault,
    applyUrlOverrides,
  };
});

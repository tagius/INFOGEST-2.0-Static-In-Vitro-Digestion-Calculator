/**
 * INFOGEST 2.0 — State Management
 * localStorage persistence + JSON import/export for backup.
 */

const STORAGE_KEY = 'infogest_v2_state';

/**
 * Save current form state to localStorage.
 */
export function saveState(extraState = {}) {
  try {
    const state = {};
    document.querySelectorAll('input[id]').forEach(el => {
      if (el.type === 'checkbox') {
        state[el.id] = el.checked;
      } else {
        state[el.id] = el.value;
      }
    });
    // Merge extra state (toggle states, mode vars, etc.)
    Object.assign(state, extraState);
    state.__savedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

/**
 * Load state from localStorage. Returns the extra state keys, or null if nothing saved.
 */
export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const state = JSON.parse(saved);
    const extraState = {};
    Object.keys(state).forEach(id => {
      if (id.startsWith('__')) {
        extraState[id] = state[id];
        return;
      }
      const el = document.getElementById(id);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = state[id] === true || state[id] === 'true';
        } else {
          el.value = state[id];
        }
      } else {
        // Keep non-DOM keys in extraState (like __gastricEnzyme)
        extraState[id] = state[id];
      }
    });
    return extraState;
  } catch (e) {
    console.warn('Failed to load state:', e);
    return null;
  }
}

/**
 * Clear saved state from localStorage.
 */
export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export current state as a downloadable JSON file.
 */
export function exportStateJSON() {
  const state = {};
  document.querySelectorAll('input[id]').forEach(el => {
    if (el.type === 'checkbox') {
      state[el.id] = el.checked;
    } else {
      state[el.id] = el.value;
    }
  });
  state.__exportedAt = new Date().toISOString();
  state.__version = '2.0';

  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  const operator = document.getElementById('operator')?.value || 'unknown';
  a.download = `INFOGEST_state_${date}_${operator.replace(/\s/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import state from a JSON file. Returns a promise that resolves with the parsed state.
 */
export function importStateJSON() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) { reject('No file selected'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const state = JSON.parse(ev.target.result);
          // Apply to form
          Object.keys(state).forEach(id => {
            if (id.startsWith('__')) return;
            const el = document.getElementById(id);
            if (el) {
              if (el.type === 'checkbox') {
                el.checked = state[id] === true || state[id] === 'true';
              } else {
                el.value = state[id];
              }
            }
          });
          resolve(state);
        } catch (err) {
          reject('Invalid JSON file: ' + err.message);
        }
      };
      reader.onerror = () => reject('Failed to read file');
      reader.readAsText(file);
    };
    input.click();
  });
}

/**
 * Theme management.
 * Supports: 'light', 'dark', 'auto' (follows system).
 */
const THEME_KEY = 'infogest_v2_theme';

export function getThemePreference() {
  return localStorage.getItem(THEME_KEY) || 'auto';
}

export function setThemePreference(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'auto') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', theme);
  }
  updateThemeIcon(theme);
}

export function toggleTheme() {
  const current = getThemePreference();
  // Cycle: auto → light → dark → auto
  let next;
  if (current === 'auto') {
    // If system is dark, switch to light; if light, switch to dark
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    next = isDark ? 'light' : 'dark';
  } else if (current === 'light') {
    next = 'dark';
  } else {
    next = 'auto';
  }
  setThemePreference(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  // Update visibility based on current effective theme
  const isDark = theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  btn.querySelector('.icon-sun').style.display = isDark ? 'inline' : 'none';
  btn.querySelector('.icon-moon').style.display = isDark ? 'none' : 'inline';
  btn.title = `Theme: ${theme} (click to toggle)`;
}

export function initTheme() {
  const theme = getThemePreference();
  applyTheme(theme);
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemePreference() === 'auto') {
      updateThemeIcon('auto');
    }
  });
}

// ============================================================
// TuongTanDigital-AI v3.0 — app.js
// Part 3/5: Core State, Config, IndexedDB, Auth, License, API, Notebook, Chat
// Coding standard: camelCase vars/funcs, UPPER_SNAKE_CASE consts,
//                  kebab-case CSS, single STATE object, wrapper API calls,
//                  full async try-catch, no inline styles/events
// ============================================================

'use strict';

// ===================================================================
// SECTION 1: CONSTANTS & CONFIGURATION
// ===================================================================

const APP_VERSION = '3.0.0';
const APP_NAME    = 'TuongTanDigital-AI';

/** Google OAuth 2.0 — Replace with your real Client ID */
const GOOGLE_CONFIG = {
  CLIENT_ID   : 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  REDIRECT_URI: window.location.origin,
  SCOPES      : 'openid email profile'
};

/** Gemini API base */
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/** IndexedDB settings */
const IDB_NAME    = 'TuongTanDigitalDB';
const IDB_VERSION = 3;
const IDB_STORES  = {
  notebooks   : 'notebooks',
  sources     : 'sources',
  chatHistory : 'chatHistory',
  notes       : 'notes',
  flashcards  : 'flashcards',
  settings    : 'settings'
};

/** Freemium limits */
const FREE_LIMITS = {
  CHATS_PER_DAY  : 10,
  MAX_SOURCES    : 3,
  MAX_NOTEBOOKS  : 3,
  MAX_FLASHCARDS : 10
};

const PRO_LIMITS = {
  CHATS_PER_DAY  : Infinity,
  MAX_SOURCES    : 50,
  MAX_NOTEBOOKS  : 20,
  MAX_FLASHCARDS : 50
};

/** Supported Gemini models */
const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash',          label: 'Gemini 2.0 Flash (Mặc định)' },
  { id: 'gemini-2.0-flash-lite',     label: 'Gemini 2.0 Flash Lite' },
  { id: 'gemini-1.5-pro',            label: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash',          label: 'Gemini 1.5 Flash' },
  { id: 'gemini-2.5-pro-exp-03-25',  label: 'Gemini 2.5 Pro Exp' }
];

/** Available Gemini TTS voices */
const GEMINI_VOICES = [
  'Aoede','Charon','Fenrir','Kore','Leda','Orus','Puck','Zephyr',
  'Achird','Algenib','Algieba','Alnair','Alrescha','Alsephina',
  'Altair','Ancha','Ankaa','Antlia','Aoede','Ariel','Auva',
  'Avva','Bellatrix','Callirrhoe','Capella','Castor','Despina',
  'Erinome','Fenrir','Gacrux','Iocaste','Laomedeia','Pulcherrima',
  'Rasalas','Sadachbia','Schedar','Sulafat','Umbriel','Vindemiatrix',
  'Yildun','Zaniah','Zubenelgenubi'
];

/** Default TTS voice */
const DEFAULT_TTS_VOICE = 'Aoede';

/** Default flashcard count */
const DEFAULT_FLASHCARD_COUNT = 10;

/** Google Apps Script License Validation endpoint — Replace with your deployed URL */
const LICENSE_API_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL';

/** Themes */
const THEMES = ['light','dark','blue','purple'];

/** Fonts */
const FONT_OPTIONS = [
  { id: 'system', label: 'System Default', css: 'system-ui, sans-serif' },
  { id: 'inter',  label: 'Inter',           css: "'Inter', sans-serif" },
  { id: 'merriweather', label: 'Merriweather', css: "'Merriweather', serif" },
  { id: 'firacode', label: 'Fira Code',    css: "'Fira Code', monospace" },
  { id: 'bevietnampro', label: 'Be Vietnam Pro', css: "'Be Vietnam Pro', sans-serif" }
];

/** Personas */
const PERSONAS = [
  { id: 'professor',  label: '🎓 Giáo sư',        prompt: 'Trả lời với phong cách học thuật, trích dẫn chính xác, ngôn ngữ trang trọng.' },
  { id: 'friend',     label: '😊 Bạn bè',          prompt: 'Trả lời thân thiện, dễ hiểu, dùng ngôn ngữ gần gũi như nói chuyện với bạn.' },
  { id: 'consultant', label: '💼 Chuyên gia tư vấn', prompt: 'Phân tích sâu, đề xuất cụ thể, trả lời định hướng hành động.' },
  { id: 'journalist', label: '📰 Phóng viên',      prompt: 'Tường thuật sự kiện theo cấu trúc 5W1H, khách quan, súc tích.' },
  { id: 'tutor',      label: '📚 Gia sư',           prompt: 'Giải thích từng bước, dùng ví dụ đơn giản, khuyến khích và kiên nhẫn.' }
];

/** Quick action definitions */
const QUICK_ACTIONS = [
  { id: 'summary',    icon: '📝', label: 'Tóm tắt' },
  { id: 'keypoints',  icon: '🔑', label: 'Điểm chính' },
  { id: 'flashcard',  icon: '🃏', label: 'Flashcard' },
  { id: 'compare',    icon: '⚖️', label: 'So sánh' },
  { id: 'quiz',       icon: '❓', label: 'Quiz' },
  { id: 'podcast',    icon: '🎙️', label: 'Podcast' },
  { id: 'mindmap',    icon: '🗺️', label: 'Mind map' },
  { id: 'glossary',   icon: '📖', label: 'Từ điển' },
  { id: 'citation',   icon: '📚', label: 'Trích dẫn' },
  { id: 'sentiment',  icon: '🎭', label: 'Cảm xúc' }
];

// ===================================================================
// SECTION 2: GLOBAL STATE OBJECT
// ===================================================================

const STATE = {
  // Auth
  googleUser     : null,   // { id, name, email, avatar, token }
  isLoggedIn     : false,

  // License
  licenseKey     : '',
  licenseValid   : false,
  licenseTier    : 'free', // 'free' | 'pro'
  licenseExpiry  : null,

  // API
  apiKey         : '',
  selectedModel  : GEMINI_MODELS[0].id,

  // Notebooks
  notebooks      : [],     // Array of notebook objects
  activeNotebookId: null,

  // Sources (for active notebook)
  sources        : [],     // Array of source objects

  // Chat
  chatHistory    : [],     // Array of { role, parts }
  chatSummary    : '',     // Compressed old history

  // UI
  activeTab      : 'notebook',
  theme          : 'light',
  fontSize       : 16,
  selectedFont   : 'system',
  selectedPersona: 'professor',
  splitView      : false,
  focusMode      : false,
  darkMode       : false,
  sidebarOpen    : true,

  // Flashcards
  flashcards     : [],
  flashcardIndex : 0,
  flashcardCount : DEFAULT_FLASHCARD_COUNT,

  // TTS
  ttsEngine      : 'browser', // 'browser' | 'gemini'
  ttsVoice       : DEFAULT_TTS_VOICE,
  ttsSpeaking    : false,
  ttsUtterance   : null,

  // STT / Recording
  mediaRecorder  : null,
  recordingChunks: [],
  screenBlob     : null,
  isRecording    : false,

  // Convert
  isBatchMode    : false,
  batchResults   : [],

  // Notes / Pins
  pinnedNotes    : [],

  // Usage tracking
  chatsToday     : 0,
  lastUsageDate  : '',

  // Misc
  commandPaletteOpen : false,
  onboardingStep     : 0,
  onboardingDone     : false,
  idbReady           : false,
  dbRef              : null,    // IDBDatabase reference
  suggestedQuestions : []
};

// ===================================================================
// SECTION 3: INDEXEDDB LAYER
// ===================================================================

/**
 * Open (or upgrade) the IndexedDB database.
 * Returns a Promise<IDBDatabase>.
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      Object.values(IDB_STORES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      });
    };

    request.onsuccess  = (e) => resolve(e.target.result);
    request.onerror    = (e) => reject(e.target.error);
  });
}

/**
 * Generic IDB write (put/add).
 * @param {string} storeName
 * @param {Object} data — must have an `id` field or will be auto-generated
 */
async function idbPut(storeName, data) {
  try {
    const db = STATE.dbRef;
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx      = db.transaction(storeName, 'readwrite');
      const store   = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror   = () => reject(request.error);
    });
  } catch (err) {
    console.error('[idbPut]', err);
  }
}

/**
 * Generic IDB read all records from a store.
 * @param {string} storeName
 * @returns {Promise<Array>}
 */
async function idbGetAll(storeName) {
  try {
    const db = STATE.dbRef;
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const tx      = db.transaction(storeName, 'readonly');
      const store   = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror   = () => reject(request.error);
    });
  } catch (err) {
    console.error('[idbGetAll]', err);
    return [];
  }
}

/**
 * Generic IDB get single record by key.
 * @param {string} storeName
 * @param {*} key
 */
async function idbGet(storeName, key) {
  try {
    const db = STATE.dbRef;
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx      = db.transaction(storeName, 'readonly');
      const store   = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror   = () => reject(request.error);
    });
  } catch (err) {
    console.error('[idbGet]', err);
    return null;
  }
}

/**
 * Generic IDB delete a record by key.
 * @param {string} storeName
 * @param {*} key
 */
async function idbDelete(storeName, key) {
  try {
    const db = STATE.dbRef;
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx      = db.transaction(storeName, 'readwrite');
      const store   = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror   = () => reject(request.error);
    });
  } catch (err) {
    console.error('[idbDelete]', err);
  }
}

/**
 * Save the full STATE.notebooks array to IndexedDB.
 */
async function persistNotebooks() {
  try {
    for (const nb of STATE.notebooks) {
      await idbPut(IDB_STORES.notebooks, nb);
    }
  } catch (err) {
    console.error('[persistNotebooks]', err);
  }
}

/**
 * Save the sources of the active notebook to IndexedDB.
 */
async function persistSources() {
  try {
    const notebookId = STATE.activeNotebookId;
    if (!notebookId) return;
    await idbPut(IDB_STORES.sources, {
      id     : `sources_${notebookId}`,
      notebookId,
      data   : STATE.sources
    });
  } catch (err) {
    console.error('[persistSources]', err);
  }
}

/**
 * Save the chat history of the active notebook to IndexedDB.
 */
async function persistChatHistory() {
  try {
    const notebookId = STATE.activeNotebookId;
    if (!notebookId) return;
    await idbPut(IDB_STORES.chatHistory, {
      id     : `chat_${notebookId}`,
      notebookId,
      data   : STATE.chatHistory,
      summary: STATE.chatSummary
    });
  } catch (err) {
    console.error('[persistChatHistory]', err);
  }
}

/**
 * Persist pinned notes.
 */
async function persistNotes() {
  try {
    await idbPut(IDB_STORES.notes, {
      id  : 'pinned_notes',
      data: STATE.pinnedNotes
    });
  } catch (err) {
    console.error('[persistNotes]', err);
  }
}

/**
 * Persist settings to IDB (non-binary, fast path also writes to localStorage).
 */
async function persistSettings() {
  try {
    const settings = {
      id            : 'app_settings',
      apiKey        : STATE.apiKey,
      selectedModel : STATE.selectedModel,
      theme         : STATE.theme,
      fontSize      : STATE.fontSize,
      selectedFont  : STATE.selectedFont,
      selectedPersona: STATE.selectedPersona,
      licenseKey    : STATE.licenseKey,
      onboardingDone: STATE.onboardingDone,
      chatsToday    : STATE.chatsToday,
      lastUsageDate : STATE.lastUsageDate,
      flashcardCount: STATE.flashcardCount,
      ttsEngine     : STATE.ttsEngine,
      ttsVoice      : STATE.ttsVoice,
      sidebarOpen   : STATE.sidebarOpen
    };
    await idbPut(IDB_STORES.settings, settings);
    // Fast fallback for theme/font — also keep in localStorage
    localStorage.setItem('ttd_theme',    STATE.theme);
    localStorage.setItem('ttd_fontSize', STATE.fontSize);
  } catch (err) {
    console.error('[persistSettings]', err);
  }
}

/**
 * Restore all state from IndexedDB on page load.
 */
async function restoreStateFromIDB() {
  try {
    const settings = await idbGet(IDB_STORES.settings, 'app_settings');
    if (settings) {
      STATE.apiKey         = settings.apiKey        || '';
      STATE.selectedModel  = settings.selectedModel || GEMINI_MODELS[0].id;
      STATE.theme          = settings.theme         || 'light';
      STATE.fontSize       = settings.fontSize      || 16;
      STATE.selectedFont   = settings.selectedFont  || 'system';
      STATE.selectedPersona= settings.selectedPersona || 'professor';
      STATE.licenseKey     = settings.licenseKey    || '';
      STATE.onboardingDone = settings.onboardingDone || false;
      STATE.chatsToday     = settings.chatsToday    || 0;
      STATE.lastUsageDate  = settings.lastUsageDate || '';
      STATE.flashcardCount = settings.flashcardCount || DEFAULT_FLASHCARD_COUNT;
      STATE.ttsEngine      = settings.ttsEngine     || 'browser';
      STATE.ttsVoice       = settings.ttsVoice      || DEFAULT_TTS_VOICE;
      STATE.sidebarOpen    = settings.sidebarOpen !== undefined ? settings.sidebarOpen : true;
    }

    // Reset daily chat counter if new day
    const today = new Date().toDateString();
    if (STATE.lastUsageDate !== today) {
      STATE.chatsToday    = 0;
      STATE.lastUsageDate = today;
    }

    // Restore notebooks
    const allNotebooks = await idbGetAll(IDB_STORES.notebooks);
    STATE.notebooks = allNotebooks.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    // If no notebooks exist, create a default one
    if (STATE.notebooks.length === 0) {
      await createNotebook('📓 Notebook đầu tiên');
    } else {
      STATE.activeNotebookId = STATE.notebooks[0].id;
      await switchNotebook(STATE.activeNotebookId, false);
    }

    // Restore pinned notes
    const notesRecord = await idbGet(IDB_STORES.notes, 'pinned_notes');
    STATE.pinnedNotes = notesRecord ? notesRecord.data : [];

    console.log(`[IDB] State restored. Notebooks: ${STATE.notebooks.length}`);
  } catch (err) {
    console.error('[restoreStateFromIDB]', err);
    showToast('⚠️ Không thể khôi phục dữ liệu. Bắt đầu phiên mới.', 'warning');
  }
}

// ===================================================================
// SECTION 4: GOOGLE OAUTH 2.0 AUTHENTICATION
// ===================================================================

/**
 * Initialize Google Identity Services.
 * Called once the GSI script is loaded (callback from HTML).
 */
function initGoogleAuth() {
  try {
    if (typeof google === 'undefined' || !google.accounts) {
      console.warn('[Auth] Google Identity Services SDK not loaded yet.');
      return;
    }
    google.accounts.id.initialize({
      client_id       : GOOGLE_CONFIG.CLIENT_ID,
      callback        : handleGoogleSignInResponse,
      auto_select     : true,
      cancel_on_tap_outside: false
    });

    // Try silent sign-in first
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        showLoginScreen();
      }
    });
  } catch (err) {
    console.error('[initGoogleAuth]', err);
    showLoginScreen();
  }
}

/**
 * Handle the JWT credential response from Google.
 * @param {Object} response — { credential: string (JWT) }
 */
function handleGoogleSignInResponse(response) {
  try {
    if (!response || !response.credential) {
      showToast('❌ Đăng nhập Google thất bại.', 'error');
      showLoginScreen();
      return;
    }
    const payload = parseJwt(response.credential);
    STATE.googleUser = {
      id    : payload.sub,
      name  : payload.name,
      email : payload.email,
      avatar: payload.picture,
      token : response.credential
    };
    STATE.isLoggedIn = true;

    localStorage.setItem('ttd_google_user', JSON.stringify(STATE.googleUser));

    hideLoginScreen();
    updateUserUI();
    showToast(`✅ Xin chào, ${STATE.googleUser.name}!`, 'success');
  } catch (err) {
    console.error('[handleGoogleSignInResponse]', err);
    showToast('❌ Lỗi xử lý đăng nhập.', 'error');
    showLoginScreen();
  }
}

/**
 * Parse a base64-encoded JWT and return the payload object.
 * @param {string} token
 * @returns {Object}
 */
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  );
  return JSON.parse(jsonPayload);
}

/**
 * Restore session from localStorage on page load.
 * Returns true if a valid session was found.
 */
function restoreGoogleSession() {
  try {
    const saved = localStorage.getItem('ttd_google_user');
    if (!saved) return false;
    const user = JSON.parse(saved);
    if (!user || !user.id) return false;

    // Validate token expiry from JWT
    const payload = parseJwt(user.token);
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem('ttd_google_user');
      return false;
    }

    STATE.googleUser = user;
    STATE.isLoggedIn = true;
    return true;
  } catch (err) {
    localStorage.removeItem('ttd_google_user');
    return false;
  }
}

/**
 * Sign out the current Google user.
 */
function signOut() {
  try {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
    STATE.googleUser = null;
    STATE.isLoggedIn = false;
    localStorage.removeItem('ttd_google_user');
    updateUserUI();
    showLoginScreen();
    showToast('👋 Đã đăng xuất.', 'info');
  } catch (err) {
    console.error('[signOut]', err);
  }
}

/**
 * Show the login splash screen.
 */
function showLoginScreen() {
  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.classList.add('visible');
}

/**
 * Hide the login splash screen.
 */
function hideLoginScreen() {
  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.classList.remove('visible');
}

/**
 * Update the header with the logged-in user's info.
 */
function updateUserUI() {
  const avatarEl    = document.getElementById('userAvatar');
  const userNameEl  = document.getElementById('userName');
  const proBadge    = document.getElementById('proBadge');
  const signOutBtn  = document.getElementById('signOutBtn');

  if (STATE.isLoggedIn && STATE.googleUser) {
    if (avatarEl)   { avatarEl.src = STATE.googleUser.avatar; avatarEl.style.display = 'block'; }
    if (userNameEl) userNameEl.textContent = STATE.googleUser.name;
    if (signOutBtn) signOutBtn.style.display = 'inline-flex';
  } else {
    if (avatarEl)   avatarEl.style.display = 'none';
    if (userNameEl) userNameEl.textContent = '';
    if (signOutBtn) signOutBtn.style.display = 'none';
  }

  if (proBadge) {
    proBadge.style.display = STATE.licenseValid && STATE.licenseTier === 'pro' ? 'inline-flex' : 'none';
  }
}

// ===================================================================
// SECTION 5: LICENSE KEY SYSTEM (Google Sheets Backend)
// ===================================================================

/**
 * Simple MD5 hash implementation (for license key transmission).
 * @param {string} str
 * @returns {string} hex digest
 */
function md5(str) {
  function safeAdd(x, y) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q, a, b, x, s, t) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a,b,c,d,x,s,t){ return md5cmn((b&c)|((~b)&d),a,b,x,s,t); }
  function md5gg(a,b,c,d,x,s,t){ return md5cmn((b&d)|(c&(~d)),a,b,x,s,t); }
  function md5hh(a,b,c,d,x,s,t){ return md5cmn(b^c^d,a,b,x,s,t); }
  function md5ii(a,b,c,d,x,s,t){ return md5cmn(c^(b|(~d)),a,b,x,s,t); }

  const utf8Str = unescape(encodeURIComponent(str));
  const binaryStr = utf8Str.split('').map(c => c.charCodeAt(0));
  const length8    = binaryStr.length;
  binaryStr.push(0x80);
  while (binaryStr.length % 64 !== 56) binaryStr.push(0);
  binaryStr.push(length8 * 8 & 0xff, (length8 * 8 >> 8) & 0xff,
                 (length8 * 8 >> 16) & 0xff, (length8 * 8 >> 24) & 0xff,
                 0, 0, 0, 0);

  const M = [];
  for (let i = 0; i < binaryStr.length; i += 4) {
    M.push(binaryStr[i] | (binaryStr[i+1]<<8) | (binaryStr[i+2]<<16) | (binaryStr[i+3]<<24));
  }

  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let i = 0; i < M.length; i += 16) {
    const [A,B,C,D] = [a,b,c,d];
    a=md5ff(a,b,c,d,M[i],7,-680876936);    d=md5ff(d,a,b,c,M[i+1],12,-389564586);
    c=md5ff(c,d,a,b,M[i+2],17,606105819);  b=md5ff(b,c,d,a,M[i+3],22,-1044525330);
    a=md5ff(a,b,c,d,M[i+4],7,-176418897);  d=md5ff(d,a,b,c,M[i+5],12,1200080426);
    c=md5ff(c,d,a,b,M[i+6],17,-1473231341);b=md5ff(b,c,d,a,M[i+7],22,-45705983);
    a=md5ff(a,b,c,d,M[i+8],7,1770035416);  d=md5ff(d,a,b,c,M[i+9],12,-1958414417);
    c=md5ff(c,d,a,b,M[i+10],17,-42063);    b=md5ff(b,c,d,a,M[i+11],22,-1990404162);
    a=md5ff(a,b,c,d,M[i+12],7,1804603682); d=md5ff(d,a,b,c,M[i+13],12,-40341101);
    c=md5ff(c,d,a,b,M[i+14],17,-1502002290);b=md5ff(b,c,d,a,M[i+15],22,1236535329);
    a=md5gg(a,b,c,d,M[i+1],5,-165796510);  d=md5gg(d,a,b,c,M[i+6],9,-1069501632);
    c=md5gg(c,d,a,b,M[i+11],14,643717713); b=md5gg(b,c,d,a,M[i],20,-373897302);
    a=md5gg(a,b,c,d,M[i+5],5,-701558691);  d=md5gg(d,a,b,c,M[i+10],9,38016083);
    c=md5gg(c,d,a,b,M[i+15],14,-660478335);b=md5gg(b,c,d,a,M[i+4],20,-405537848);
    a=md5gg(a,b,c,d,M[i+9],5,568446438);   d=md5gg(d,a,b,c,M[i+14],9,-1019803690);
    c=md5gg(c,d,a,b,M[i+3],14,-187363961); b=md5gg(b,c,d,a,M[i+8],20,1163531501);
    a=md5gg(a,b,c,d,M[i+13],5,-1444681467);d=md5gg(d,a,b,c,M[i+2],9,-51403784);
    c=md5gg(c,d,a,b,M[i+7],14,1735328473); b=md5gg(b,c,d,a,M[i+12],20,-1926607734);
    a=md5hh(a,b,c,d,M[i+5],4,-378558);     d=md5hh(d,a,b,c,M[i+8],11,-2022574463);
    c=md5hh(c,d,a,b,M[i+11],16,1839030562);b=md5hh(b,c,d,a,M[i+14],23,-35309556);
    a=md5hh(a,b,c,d,M[i+1],4,-1530992060); d=md5hh(d,a,b,c,M[i+4],11,1272893353);
    c=md5hh(c,d,a,b,M[i+7],16,-155497632); b=md5hh(b,c,d,a,M[i+10],23,-1094730640);
    a=md5hh(a,b,c,d,M[i+13],4,681279174);  d=md5hh(d,a,b,c,M[i],11,-358537222);
    c=md5hh(c,d,a,b,M[i+3],16,-722521979); b=md5hh(b,c,d,a,M[i+6],23,76029189);
    a=md5hh(a,b,c,d,M[i+9],4,-640364487);  d=md5hh(d,a,b,c,M[i+12],11,-421815835);
    c=md5hh(c,d,a,b,M[i+15],16,530742520); b=md5hh(b,c,d,a,M[i+2],23,-995338651);
    a=md5ii(a,b,c,d,M[i],6,-198630844);    d=md5ii(d,a,b,c,M[i+7],10,1126891415);
    c=md5ii(c,d,a,b,M[i+14],15,-1416354905);b=md5ii(b,c,d,a,M[i+5],21,-57434055);
    a=md5ii(a,b,c,d,M[i+12],6,1700485571); d=md5ii(d,a,b,c,M[i+3],10,-1894986606);
    c=md5ii(c,d,a,b,M[i+10],15,-1051523);  b=md5ii(b,c,d,a,M[i+1],21,-2054922799);
    a=md5ii(a,b,c,d,M[i+8],6,1873313359);  d=md5ii(d,a,b,c,M[i+15],10,-30611744);
    c=md5ii(c,d,a,b,M[i+6],15,-1560198380);b=md5ii(b,c,d,a,M[i+13],21,1309151649);
    a=md5ii(a,b,c,d,M[i+4],6,-145523070);  d=md5ii(d,a,b,c,M[i+11],10,-1120210379);
    c=md5ii(c,d,a,b,M[i+2],15,718787259);  b=md5ii(b,c,d,a,M[i+9],21,-343485551);
    a=safeAdd(a,A); b=safeAdd(b,B); c=safeAdd(c,C); d=safeAdd(d,D);
  }
  return [a,b,c,d].map(n =>
    ('0000000' + ((n < 0) ? (0xFFFFFFFF + n + 1) : n).toString(16)).slice(-8)
  ).join('');
}

/**
 * Validate a license key via the Google Apps Script Web App API.
 * The API expects: { hash: md5(licenseKey), userId: googleUserId }
 * The API returns: { valid: bool, tier: 'free'|'pro', expiry: ISO-string|null, message: string }
 * @param {string} key — raw license key entered by user
 * @returns {Promise<{valid: boolean, tier: string, expiry: Date|null, message: string}>}
 */
async function validateLicenseKey(key) {
  try {
    if (!key || key.trim().length < 8) {
      return { valid: false, tier: 'free', expiry: null, message: 'License key không hợp lệ.' };
    }

    const hash   = md5(key.trim().toUpperCase());
    const userId = STATE.googleUser ? STATE.googleUser.id : 'anonymous';

    const response = await fetch(LICENSE_API_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ hash, userId, action: 'validate' })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    return {
      valid  : result.valid  === true,
      tier   : result.tier   || 'free',
      expiry : result.expiry ? new Date(result.expiry) : null,
      message: result.message || ''
    };
  } catch (err) {
    console.error('[validateLicenseKey]', err);
    // Fallback: offline demo — never allow bypass without server confirmation
    return { valid: false, tier: 'free', expiry: null, message: 'Không thể kết nối máy chủ kiểm tra license.' };
  }
}

/**
 * Apply the validated license result to STATE and update UI.
 * @param {{ valid: boolean, tier: string, expiry: Date|null }} result
 */
function applyLicense(result) {
  STATE.licenseValid  = result.valid;
  STATE.licenseTier   = result.tier;
  STATE.licenseExpiry = result.expiry;
  updateLicenseUI();
  updateUserUI();
  persistSettings();
}

/**
 * Update license-related UI elements.
 */
function updateLicenseUI() {
  const tierBadge   = document.getElementById('licenseTierBadge');
  const expiryEl    = document.getElementById('licenseExpiry');
  const tierLabel   = document.getElementById('licenseTierLabel');
  const limitInfo   = document.getElementById('limitInfo');

  if (STATE.licenseValid && STATE.licenseTier === 'pro') {
    if (tierBadge)  { tierBadge.textContent = 'PRO'; tierBadge.className = 'badge badge-pro'; }
    if (tierLabel)  tierLabel.textContent = '✅ Gói Pro (không giới hạn)';
    if (expiryEl)   expiryEl.textContent = STATE.licenseExpiry
      ? `Hết hạn: ${STATE.licenseExpiry.toLocaleDateString('vi-VN')}`
      : 'Hết hạn: Vĩnh viễn';
    if (limitInfo)  limitInfo.textContent = '';
  } else {
    if (tierBadge)  { tierBadge.textContent = 'FREE'; tierBadge.className = 'badge badge-free'; }
    if (tierLabel)  tierLabel.textContent = '🆓 Gói miễn phí';
    if (expiryEl)   expiryEl.textContent = '';
    if (limitInfo)  limitInfo.textContent =
      `Giới hạn: ${STATE.chatsToday}/${FREE_LIMITS.CHATS_PER_DAY} chat hôm nay • 3 nguồn tối đa`;
  }
}

/**
 * Get the effective limits based on current license tier.
 * @returns {Object}
 */
function getEffectiveLimits() {
  return STATE.licenseValid && STATE.licenseTier === 'pro' ? PRO_LIMITS : FREE_LIMITS;
}

/**
 * Check if user can send more chats today.
 * @returns {boolean}
 */
function canSendChat() {
  const limits = getEffectiveLimits();
  if (limits.CHATS_PER_DAY === Infinity) return true;
  return STATE.chatsToday < limits.CHATS_PER_DAY;
}

/**
 * Check if user can add more sources to the active notebook.
 * @returns {boolean}
 */
function canAddSource() {
  const limits = getEffectiveLimits();
  return STATE.sources.length < limits.MAX_SOURCES;
}

// ===================================================================
// SECTION 6: GEMINI API WRAPPER
// ===================================================================

/**
 * Non-streaming Gemini API call.
 * @param {Array} parts   — array of Gemini content parts
 * @param {Array} history — chat history array (optional)
 * @param {string} systemInstruction — system prompt (optional)
 * @returns {Promise<string>} — model text response
 */
async function callGemini(parts, history = [], systemInstruction = '') {
  const apiKey = STATE.apiKey;
  if (!apiKey) throw new Error('Vui lòng nhập Gemini API Key trong Cài đặt.');

  const model   = STATE.selectedModel || GEMINI_MODELS[0].id;
  const url     = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      ...history,
      { role: 'user', parts }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  };

  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(url, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API lỗi ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('API không trả về nội dung.');
  return text;
}

/**
 * Streaming Gemini API call.
 * @param {Array}    parts            — Gemini content parts
 * @param {Array}    history          — chat history
 * @param {string}   systemInstruction
 * @param {Function} onChunk          — callback(chunkText: string)
 * @param {Function} onDone           — callback(fullText: string)
 * @param {Function} onError          — callback(error: Error)
 */
async function callGeminiStream(parts, history = [], systemInstruction = '', onChunk, onDone, onError) {
  const apiKey = STATE.apiKey;
  if (!apiKey) {
    onError(new Error('Vui lòng nhập Gemini API Key trong Cài đặt.'));
    return;
  }

  const model = STATE.selectedModel || GEMINI_MODELS[0].id;
  const url   = `${GEMINI_BASE_URL}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const body = {
    contents: [
      ...history,
      { role: 'user', parts }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  };

  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  try {
    const response = await fetch(url, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API lỗi ${response.status}`);
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = '';
    let buffer    = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk  = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (chunk) {
            fullText += chunk;
            if (typeof onChunk === 'function') onChunk(chunk);
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    if (typeof onDone === 'function') onDone(fullText);
  } catch (err) {
    if (typeof onError === 'function') onError(err);
  }
}

/**
 * Build Gemini content parts from the active notebook's sources + user message.
 * @param {string} userText
 * @returns {Array} parts
 */
function buildNotebookParts(userText) {
  const parts = [];

  // Add source contents
  for (const src of STATE.sources) {
    if (src.type === 'text' || src.type === 'url' || src.type === 'youtube') {
      parts.push({ text: `[Nguồn ${src.index}: ${src.name}]\n${src.content}` });
    } else if (src.base64 && src.mimeType) {
      parts.push({
        inlineData: { mimeType: src.mimeType, data: src.base64 }
      });
    } else if (src.fileUri) {
      parts.push({ fileData: { mimeType: src.mimeType, fileUri: src.fileUri } });
    }
  }

  // Add user message
  parts.push({ text: userText });
  return parts;
}

/**
 * Get the system instruction for the current persona + context.
 * @returns {string}
 */
function buildSystemInstruction() {
  const persona = PERSONAS.find(p => p.id === STATE.selectedPersona) || PERSONAS[0];
  const baseInstruction = `Bạn là trợ lý AI thông minh của TuongTanDigital-AI. ${persona.prompt}
Khi trả lời về tài liệu, hãy trích dẫn nguồn theo dạng [Nguồn X].
Trả lời bằng tiếng Việt trừ khi người dùng yêu cầu khác.
Dùng Markdown để định dạng câu trả lời (tiêu đề, danh sách, bảng khi phù hợp).`;
  return baseInstruction;
}

// ===================================================================
// SECTION 7: MULTI-NOTEBOOK MANAGER
// ===================================================================

/**
 * Generate a unique ID for a new notebook or source.
 * @returns {string}
 */
function generateId() {
  return `ttd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new notebook and make it active.
 * @param {string} name — display name
 * @returns {Promise<Object>} the created notebook
 */
async function createNotebook(name = '📓 Notebook mới') {
  try {
    const limits = getEffectiveLimits();
    if (STATE.notebooks.length >= limits.MAX_NOTEBOOKS) {
      showToast(`⚠️ Đạt giới hạn ${limits.MAX_NOTEBOOKS} notebook. Nâng cấp lên Pro để tạo thêm.`, 'warning');
      return null;
    }

    const notebook = {
      id         : generateId(),
      name,
      emoji      : '📓',
      createdAt  : new Date().toISOString(),
      updatedAt  : new Date().toISOString(),
      pinned     : false,
      sourceCount: 0,
      messageCount: 0
    };

    STATE.notebooks.unshift(notebook);
    await idbPut(IDB_STORES.notebooks, notebook);
    await switchNotebook(notebook.id);
    renderNotebookList();
    showToast(`✅ Đã tạo "${name}"`, 'success');
    return notebook;
  } catch (err) {
    console.error('[createNotebook]', err);
    showToast('❌ Lỗi tạo notebook.', 'error');
    return null;
  }
}

/**
 * Switch to a different notebook — saves current, loads new.
 * @param {string} notebookId
 * @param {boolean} save — whether to persist current state first
 */
async function switchNotebook(notebookId, save = true) {
  try {
    if (save && STATE.activeNotebookId) {
      await persistSources();
      await persistChatHistory();
    }

    STATE.activeNotebookId = notebookId;

    // Load sources for the new notebook
    const srcRecord = await idbGet(IDB_STORES.sources, `sources_${notebookId}`);
    STATE.sources   = srcRecord ? srcRecord.data : [];

    // Load chat history for the new notebook
    const chatRecord    = await idbGet(IDB_STORES.chatHistory, `chat_${notebookId}`);
    STATE.chatHistory   = chatRecord ? chatRecord.data    : [];
    STATE.chatSummary   = chatRecord ? chatRecord.summary : '';

    renderNotebookList();
    renderSources();
    renderChatHistory();
    updateSourceCount();
  } catch (err) {
    console.error('[switchNotebook]', err);
    showToast('❌ Lỗi chuyển notebook.', 'error');
  }
}

/**
 * Rename a notebook.
 * @param {string} notebookId
 * @param {string} newName
 */
async function renameNotebook(notebookId, newName) {
  try {
    const nb = STATE.notebooks.find(n => n.id === notebookId);
    if (!nb) return;
    nb.name      = newName;
    nb.updatedAt = new Date().toISOString();
    await idbPut(IDB_STORES.notebooks, nb);
    renderNotebookList();
    showToast('✅ Đã đổi tên notebook.', 'success');
  } catch (err) {
    console.error('[renameNotebook]', err);
  }
}

/**
 * Delete a notebook and all its data.
 * @param {string} notebookId
 */
async function deleteNotebook(notebookId) {
  try {
    if (STATE.notebooks.length <= 1) {
      showToast('⚠️ Phải có ít nhất 1 notebook.', 'warning');
      return;
    }

    const confirmed = await showConfirmDialog(
      'Xóa notebook?',
      'Tất cả nguồn và lịch sử chat trong notebook này sẽ bị xóa vĩnh viễn.'
    );
    if (!confirmed) return;

    STATE.notebooks = STATE.notebooks.filter(n => n.id !== notebookId);
    await idbDelete(IDB_STORES.notebooks,   notebookId);
    await idbDelete(IDB_STORES.sources,     `sources_${notebookId}`);
    await idbDelete(IDB_STORES.chatHistory, `chat_${notebookId}`);

    if (STATE.activeNotebookId === notebookId) {
      await switchNotebook(STATE.notebooks[0].id, false);
    }

    renderNotebookList();
    showToast('🗑️ Đã xóa notebook.', 'info');
  } catch (err) {
    console.error('[deleteNotebook]', err);
  }
}

/**
 * Toggle pin/unpin a notebook.
 * @param {string} notebookId
 */
async function togglePinNotebook(notebookId) {
  try {
    const nb = STATE.notebooks.find(n => n.id === notebookId);
    if (!nb) return;
    nb.pinned    = !nb.pinned;
    nb.updatedAt = new Date().toISOString();
    await idbPut(IDB_STORES.notebooks, nb);
    STATE.notebooks.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    renderNotebookList();
    showToast(nb.pinned ? '📌 Đã ghim notebook.' : '📌 Đã bỏ ghim.', 'info');
  } catch (err) {
    console.error('[togglePinNotebook]', err);
  }
}

/**
 * Render the notebook list in the sidebar.
 */
function renderNotebookList() {
  const listEl = document.getElementById('notebookList');
  if (!listEl) return;

  listEl.innerHTML = STATE.notebooks.map(nb => {
    const isActive = nb.id === STATE.activeNotebookId;
    return `
      <div class="notebook-item ${isActive ? 'active' : ''} ${nb.pinned ? 'pinned' : ''}"
           data-id="${nb.id}"
           role="button" tabindex="0"
           aria-label="${nb.name}">
        <span class="notebook-emoji">${nb.emoji || '📓'}</span>
        <div class="notebook-meta">
          <span class="notebook-name" title="${escapeHtml(nb.name)}">${escapeHtml(nb.name)}</span>
          <span class="notebook-stats">${nb.sourceCount || 0} nguồn · ${nb.messageCount || 0} tin</span>
        </div>
        <div class="notebook-actions">
          <button class="btn-icon btn-pin ${nb.pinned ? 'active' : ''}"
                  data-action="pin" data-id="${nb.id}"
                  title="${nb.pinned ? 'Bỏ ghim' : 'Ghim'}">📌</button>
          <button class="btn-icon btn-rename"
                  data-action="rename" data-id="${nb.id}"
                  title="Đổi tên">✏️</button>
          <button class="btn-icon btn-delete"
                  data-action="delete" data-id="${nb.id}"
                  title="Xóa">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // Update count display
  const countEl = document.getElementById('notebookCount');
  if (countEl) countEl.textContent = `${STATE.notebooks.length} notebooks`;
}

/**
 * Update the source count badge for the active notebook.
 */
function updateSourceCount() {
  const nb = STATE.notebooks.find(n => n.id === STATE.activeNotebookId);
  if (nb) {
    nb.sourceCount  = STATE.sources.length;
    nb.messageCount = STATE.chatHistory.filter(h => h.role === 'user').length;
    idbPut(IDB_STORES.notebooks, nb);
    renderNotebookList();
  }

  const srcCountEl = document.getElementById('srcCount');
  if (srcCountEl) srcCountEl.textContent = STATE.sources.length;
}

// ===================================================================
// SECTION 8: SOURCE MANAGEMENT
// ===================================================================

/**
 * Add a text-based source to the active notebook.
 * @param {string} name
 * @param {string} content
 * @param {string} type — 'text' | 'url' | 'youtube'
 * @param {string} [url] — original URL if applicable
 */
async function addTextSource(name, content, type = 'text', url = '') {
  try {
    if (!canAddSource()) {
      showToast(`⚠️ Đạt giới hạn ${getEffectiveLimits().MAX_SOURCES} nguồn. Nâng cấp Pro.`, 'warning');
      return;
    }
    if (!content || content.trim().length === 0) {
      showToast('⚠️ Nội dung không được để trống.', 'warning');
      return;
    }

    const source = {
      id       : generateId(),
      notebookId: STATE.activeNotebookId,
      index    : STATE.sources.length + 1,
      name     : name.slice(0, 100),
      type,
      content  : content.slice(0, 50000),
      url,
      addedAt  : new Date().toISOString(),
      tags     : [],
      autoTags : []
    };

    STATE.sources.push(source);
    await persistSources();
    renderSources();
    updateSourceCount();
    showToast(`✅ Đã thêm nguồn: ${name}`, 'success');

    // Background auto-tagging (non-blocking)
    autoTagSource(source);
    // Regenerate suggested questions
    generateSuggestedQuestions();
  } catch (err) {
    console.error('[addTextSource]', err);
    showToast('❌ Lỗi thêm nguồn.', 'error');
  }
}

/**
 * Add a binary file source (PDF, image, audio) to the active notebook.
 * Stores as base64 in IndexedDB.
 * @param {File} file
 */
async function addFileSource(file) {
  try {
    if (!canAddSource()) {
      showToast(`⚠️ Đạt giới hạn ${getEffectiveLimits().MAX_SOURCES} nguồn.`, 'warning');
      return;
    }

    const MAX_SIZE_MB = 20;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast(`⚠️ File quá lớn. Tối đa ${MAX_SIZE_MB}MB.`, 'warning');
      return;
    }

    showToast('⏳ Đang xử lý file...', 'info');

    const base64 = await fileToBase64(file);
    const source = {
      id         : generateId(),
      notebookId : STATE.activeNotebookId,
      index      : STATE.sources.length + 1,
      name       : file.name,
      type       : 'file',
      mimeType   : file.mimeType || file.type,
      base64,
      size       : file.size,
      addedAt    : new Date().toISOString(),
      tags       : [],
      autoTags   : []
    };

    STATE.sources.push(source);
    await persistSources();
    renderSources();
    updateSourceCount();
    showToast(`✅ Đã thêm: ${file.name}`, 'success');

    // Auto-tag in background
    autoTagSource(source);
    generateSuggestedQuestions();
  } catch (err) {
    console.error('[addFileSource]', err);
    showToast('❌ Lỗi thêm file.', 'error');
  }
}

/**
 * Remove a source from the active notebook.
 * @param {string} sourceId
 */
async function removeSource(sourceId) {
  try {
    STATE.sources = STATE.sources.filter(s => s.id !== sourceId);
    // Re-index
    STATE.sources.forEach((s, i) => { s.index = i + 1; });
    await persistSources();
    renderSources();
    updateSourceCount();
    showToast('🗑️ Đã xóa nguồn.', 'info');
  } catch (err) {
    console.error('[removeSource]', err);
  }
}

/**
 * Auto-tag a source using Gemini AI (runs in background).
 * @param {Object} source
 */
async function autoTagSource(source) {
  try {
    if (!STATE.apiKey || STATE.sources.length === 0) return;

    const snippet = source.content
      ? source.content.slice(0, 500)
      : `File: ${source.name} (${source.mimeType})`;

    const prompt = `Phân tích đoạn văn bản sau và trả về JSON với format:
{"topic": "Education|Business|Legal|Medical|Tech|Other", "language": "vi|en|other", "docType": "Report|Article|Contract|Lecture|Other", "complexity": "Basic|Intermediate|Advanced"}
Chỉ trả về JSON, không giải thích.
Văn bản: ${snippet}`;

    const result = await callGemini([{ text: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const tags = JSON.parse(jsonMatch[0]);
      const src  = STATE.sources.find(s => s.id === source.id);
      if (src) {
        src.autoTags = [tags.topic, tags.docType, tags.complexity].filter(Boolean);
        await persistSources();
        renderSources();
      }
    }
  } catch (err) {
    // Auto-tagging failure is non-critical
    console.warn('[autoTagSource]', err.message);
  }
}

/**
 * Convert a File to base64 string.
 * @param {File} file
 * @returns {Promise<string>} base64 without data URI prefix
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => {
      const result = reader.result;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Render all sources in the source panel.
 */
function renderSources() {
  const listEl = document.getElementById('sourceList');
  if (!listEl) return;

  if (STATE.sources.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <p>Chưa có nguồn nào. Thêm tài liệu để bắt đầu!</p>
      </div>`;
    return;
  }

  listEl.innerHTML = STATE.sources.map(src => `
    <div class="source-item ${src.tags.includes('important') ? 'tag-important' : ''}"
         data-id="${src.id}">
      <div class="source-header">
        <span class="source-icon">${getSourceIcon(src.type, src.mimeType)}</span>
        <span class="source-name" title="${escapeHtml(src.name)}">${escapeHtml(src.name)}</span>
        <div class="source-item-actions">
          <button class="btn-icon" data-action="preview" data-id="${src.id}" title="Xem trước">👁️</button>
          <button class="btn-icon" data-action="remove"  data-id="${src.id}" title="Xóa">×</button>
        </div>
      </div>
      ${src.autoTags && src.autoTags.length > 0 ? `
        <div class="source-tags">
          ${src.autoTags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>` : ''}
    </div>
  `).join('');
}

/**
 * Get an icon character for a source type.
 * @param {string} type
 * @param {string} [mimeType]
 * @returns {string}
 */
function getSourceIcon(type, mimeType = '') {
  if (type === 'youtube')             return '▶️';
  if (type === 'url')                 return '🔗';
  if (type === 'text')                return '📝';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType === 'application/pdf') return '📄';
  return '📁';
}

// ===================================================================
// SECTION 9: STREAMING CHAT ENGINE
// ===================================================================

/**
 * Send a chat message to Gemini and stream the response.
 * @param {string} userText
 */
async function sendChat(userText) {
  try {
    if (!STATE.apiKey) {
      showToast('⚠️ Vui lòng nhập API Key Gemini trong Cài đặt.', 'warning');
      openOverlay('overlaySettings');
      return;
    }

    if (!canSendChat()) {
      showToast(`⚠️ Đã đạt giới hạn ${FREE_LIMITS.CHATS_PER_DAY} tin nhắn hôm nay. Nâng cấp Pro để gửi thêm.`, 'warning');
      openOverlay('overlayAccount');
      return;
    }

    const text = userText.trim();
    if (!text) return;

    // Add user message to UI
    addChatMessage('user', text);

    // Update chat history
    STATE.chatHistory.push({ role: 'user', parts: [{ text }] });

    // Compress history if too long (T-AI1: Context Memory)
    await maybeCompressHistory();

    // Build parts
    const parts            = buildNotebookParts(text);
    const systemInstruction = buildSystemInstruction();

    // Show typing indicator
    const typingId = showTypingIndicator();

    // Update usage counter
    STATE.chatsToday++;
    await persistSettings();
    updateLicenseUI();

    // Stream response
    let fullResponse = '';
    const msgId      = `ai_msg_${Date.now()}`;
    let msgEl        = null;

    callGeminiStream(
      parts,
      STATE.chatHistory.slice(0, -1), // exclude current user message (already in parts)
      systemInstruction,
      (chunk) => {
        // onChunk: progressive rendering
        removeTypingIndicator(typingId);
        fullResponse += chunk;

        if (!msgEl) {
          msgEl = addChatMessage('model', fullResponse, msgId);
        } else {
          updateChatMessage(msgId, fullResponse);
        }
      },
      async (finalText) => {
        // onDone
        fullResponse = finalText;
        if (msgEl) updateChatMessage(msgId, finalText, true);

        // Save to history
        STATE.chatHistory.push({ role: 'model', parts: [{ text: finalText }] });
        await persistChatHistory();
        updateSourceCount();

        // Auto-scroll
        scrollChatToBottom();

        // Suggest follow-up questions (non-blocking)
        suggestFollowUpQuestions(text, finalText);
      },
      (err) => {
        // onError
        removeTypingIndicator(typingId);
        addChatMessage('error', `❌ Lỗi: ${err.message}`);
        STATE.chatsToday = Math.max(0, STATE.chatsToday - 1);
        persistSettings();
      }
    );
  } catch (err) {
    console.error('[sendChat]', err);
    showToast(`❌ ${err.message}`, 'error');
  }
}

/**
 * Compress chat history if it exceeds 8 messages (T-AI1).
 * Summarizes the oldest 6 messages and replaces them with a summary.
 */
async function maybeCompressHistory() {
  try {
    if (STATE.chatHistory.length <= 8) return;

    const toCompress = STATE.chatHistory.splice(0, 6);
    const transcript = toCompress
      .map(m => `${m.role === 'user' ? 'Người dùng' : 'AI'}: ${m.parts[0]?.text || ''}`)
      .join('\n');

    const summaryPrompt = `Tóm tắt cuộc trò chuyện sau thành 1 đoạn ngắn (tối đa 150 từ), giữ lại các thông tin quan trọng:\n\n${transcript}`;

    const summary = await callGemini([{ text: summaryPrompt }]);
    STATE.chatSummary += `\n[Lịch sử trước đó: ${summary}]`;

    // Insert summary as a context message
    STATE.chatHistory.unshift({
      role : 'model',
      parts: [{ text: `📋 [Đã nén lịch sử trước đó]\n${summary}` }]
    });

    await persistChatHistory();
  } catch (err) {
    console.warn('[maybeCompressHistory]', err.message);
  }
}

/**
 * Generate follow-up question suggestions after an AI response (non-blocking).
 * @param {string} userQuestion
 * @param {string} aiAnswer
 */
async function suggestFollowUpQuestions(userQuestion, aiAnswer) {
  try {
    if (!STATE.apiKey || STATE.sources.length === 0) return;

    const prompt = `Dựa trên câu hỏi và trả lời sau, hãy tạo 3 câu hỏi tiếp theo thú vị mà người dùng có thể hỏi.
Trả về JSON: {"questions": ["câu 1", "câu 2", "câu 3"]}
Chỉ trả về JSON.
Câu hỏi: ${userQuestion}
Trả lời: ${aiAnswer.slice(0, 300)}`;

    const result = await callGemini([{ text: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const { questions } = JSON.parse(jsonMatch[0]);
      STATE.suggestedQuestions = questions || [];
      renderSuggestedQuestions();
    }
  } catch {
    // Non-critical — fail silently
  }
}

/**
 * Render suggested question chips below the chat input.
 */
function renderSuggestedQuestions() {
  const chipsEl = document.getElementById('suggestedChips');
  if (!chipsEl || STATE.suggestedQuestions.length === 0) return;

  chipsEl.innerHTML = STATE.suggestedQuestions.map(q => `
    <button class="suggestion-chip" data-question="${escapeHtml(q)}">${escapeHtml(q)}</button>
  `).join('');
  chipsEl.style.display = 'flex';
}

/**
 * Generate initial suggested questions after sources are loaded (T-C5).
 */
async function generateSuggestedQuestions() {
  try {
    if (!STATE.apiKey || STATE.sources.length === 0) return;

    const sourcesSummary = STATE.sources
      .map(s => `${s.name}: ${(s.content || '').slice(0, 200)}`)
      .join('\n\n');

    const prompt = `Dựa trên tài liệu sau, tạo 5-7 câu hỏi khám phá thông minh để người dùng bắt đầu.
Trả về JSON: {"questions": ["câu 1", "câu 2", ...]}
Chỉ trả về JSON.
Tài liệu:\n${sourcesSummary}`;

    const result = await callGemini([{ text: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const { questions } = JSON.parse(jsonMatch[0]);
      STATE.suggestedQuestions = questions || [];
      renderSuggestedQuestions();
    }
  } catch {
    // Non-critical
  }
}

// ===================================================================
// SECTION 10: CHAT UI RENDERING
// ===================================================================

/**
 * Add a chat message bubble to the chat UI.
 * @param {string} role  — 'user' | 'model' | 'error'
 * @param {string} text  — message content (Markdown supported for model)
 * @param {string} [id]  — optional element ID for streaming updates
 * @returns {HTMLElement} the created message element
 */
function addChatMessage(role, text, id = '') {
  const chatEl = document.getElementById('chatMessages');
  if (!chatEl) return null;

  const msgEl   = document.createElement('div');
  msgEl.className = `chat-message chat-message-${role}`;
  if (id) msgEl.id = id;

  const contentEl = document.createElement('div');
  contentEl.className = 'chat-message-content';

  if (role === 'model') {
    contentEl.innerHTML = md2html(text);
    msgEl.appendChild(contentEl);
    // Reaction bar
    msgEl.appendChild(createReactionBar(id || `msg_${Date.now()}`));
    // Writing assistant popup trigger
    attachWritingAssistant(contentEl);
  } else if (role === 'error') {
    contentEl.innerHTML = `<span class="chat-error">${escapeHtml(text)}</span>`;
    msgEl.appendChild(contentEl);
  } else {
    contentEl.textContent = text;
    msgEl.appendChild(contentEl);
  }

  chatEl.appendChild(msgEl);
  scrollChatToBottom();
  return msgEl;
}

/**
 * Update an existing streaming chat message with new text.
 * @param {string} id
 * @param {string} text
 * @param {boolean} [final=false] — if true, run final rendering pass
 */
function updateChatMessage(id, text, final = false) {
  const msgEl     = document.getElementById(id);
  if (!msgEl) return;
  const contentEl = msgEl.querySelector('.chat-message-content');
  if (!contentEl) return;
  contentEl.innerHTML = md2html(text);
  if (final) {
    msgEl.classList.add('streaming-done');
    attachWritingAssistant(contentEl);
  }
  scrollChatToBottom();
}

/**
 * Render all chat history messages (on notebook switch / page load).
 */
function renderChatHistory() {
  const chatEl = document.getElementById('chatMessages');
  if (!chatEl) return;
  chatEl.innerHTML = '';

  if (STATE.chatHistory.length === 0) {
    chatEl.innerHTML = `
      <div class="chat-empty">
        <div class="chat-empty-icon">💬</div>
        <p>Thêm tài liệu và bắt đầu trò chuyện với AI!</p>
      </div>`;
    return;
  }

  STATE.chatHistory.forEach((msg, index) => {
    addChatMessage(msg.role, msg.parts[0]?.text || '', `hist_msg_${index}`);
  });
}

/**
 * Show a typing indicator while waiting for AI.
 * @returns {string} the ID of the indicator element
 */
function showTypingIndicator() {
  const chatEl = document.getElementById('chatMessages');
  if (!chatEl) return '';

  const id      = `typing_${Date.now()}`;
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-message chat-message-model chat-typing';
  typingEl.id        = id;
  typingEl.innerHTML = `
    <div class="chat-message-content">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  chatEl.appendChild(typingEl);
  scrollChatToBottom();
  return id;
}

/**
 * Remove the typing indicator.
 * @param {string} id
 */
function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/**
 * Scroll the chat area to the bottom.
 */
function scrollChatToBottom() {
  const chatEl = document.getElementById('chatMessages');
  if (chatEl) {
    requestAnimationFrame(() => {
      chatEl.scrollTop = chatEl.scrollHeight;
    });
  }
}

/**
 * Create a reaction bar for a chat message.
 * @param {string} msgId
 * @returns {HTMLElement}
 */
function createReactionBar(msgId) {
  const bar = document.createElement('div');
  bar.className = 'chat-reaction-bar';
  bar.dataset.msgId = msgId;
  bar.innerHTML = `
    <button class="reaction-btn" data-reaction="👍" title="Hữu ích">👍</button>
    <button class="reaction-btn" data-reaction="👎" title="Không hữu ích">👎</button>
    <button class="reaction-btn" data-reaction="📋" title="Sao chép">📋</button>
    <button class="reaction-btn" data-reaction="📌" title="Ghim">📌</button>
    <button class="reaction-btn" data-reaction="🔊" title="Đọc to">🔊</button>
  `;
  return bar;
}

/**
 * Handle reaction button clicks.
 * @param {HTMLElement} btn
 * @param {HTMLElement} msgEl
 */
function handleReaction(btn, msgEl) {
  const reaction = btn.dataset.reaction;
  const content  = msgEl.querySelector('.chat-message-content')?.innerText || '';

  switch (reaction) {
    case '👍':
      btn.classList.toggle('active');
      showToast('👍 Cảm ơn phản hồi!', 'success');
      break;
    case '👎':
      showFeedbackPanel(msgEl);
      break;
    case '📋':
      copyToClipboard(content);
      showToast('📋 Đã sao chép!', 'success');
      break;
    case '📌':
      pinNote(content);
      break;
    case '🔊':
      speakText(content);
      break;
  }
}

// ===================================================================
// SECTION 11: MARKDOWN RENDERER (T-F6 Upgraded)
// ===================================================================

/**
 * Convert Markdown text to safe HTML.
 * Supports: headings, bold, italic, strikethrough, code blocks (with syntax highlight),
 *           inline code, tables, blockquotes, horizontal rules, ordered/unordered lists,
 *           nested lists, links, citations [Nguồn X].
 * @param {string} md
 * @returns {string} sanitized HTML string
 */
function md2html(md) {
  if (!md) return '';

  let html = escapeHtml(md);

  // Code blocks (``` ... ```) — preserve before other transforms
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const highlighted = lang ? highlightCode(code.trim(), lang) : escapeHtml(code.trim());
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="code-block"><code class="lang-${lang || 'text'}">${highlighted}</code></pre>`);
    return `%%CODE_BLOCK_${idx}%%`;
  });

  // Tables (| col | col |)
  html = html.replace(/((?:\|[^\n]+\|\n?)+)/g, (tableMatch) => {
    const rows = tableMatch.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return tableMatch;

    const headerCells = rows[0].split('|').slice(1, -1).map(c => `<th>${c.trim()}</th>`).join('');
    const bodyRows = rows.slice(2).map(row => {
      const cells = row.split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `<table class="md-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  // Blockquotes
  html = html.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');

  // Headings
  html = html.replace(/^######\s(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s(.+)$/gm,  '<h5>$1</h5>');
  html = html.replace(/^####\s(.+)$/gm,   '<h4>$1</h4>');
  html = html.replace(/^###\s(.+)$/gm,    '<h3>$1</h3>');
  html = html.replace(/^##\s(.+)$/gm,     '<h2>$1</h2>');
  html = html.replace(/^#\s(.+)$/gm,      '<h1>$1</h1>');

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr>');

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g,         '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g,         '<del>$1</del>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Citations [Nguồn X] — make clickable
  html = html.replace(/\[Nguồn\s(\d+)\]/gi, (_, num) =>
    `<button class="citation-btn" data-source="${num}" title="Xem nguồn ${num}">[Nguồn ${num}]</button>`
  );

  // Unordered lists
  html = html.replace(/(^[\s]*[-*+]\s.+\n?)+/gm, (block) => {
    const items = block.trim().split('\n').map(line =>
      `<li>${line.replace(/^[\s]*[-*+]\s/, '').trim()}</li>`
    ).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/(^[\s]*\d+\.\s.+\n?)+/gm, (block) => {
    const items = block.trim().split('\n').map(line =>
      `<li>${line.replace(/^[\s]*\d+\.\s/, '').trim()}</li>`
    ).join('');
    return `<ol>${items}</ol>`;
  });

  // Paragraphs (double newline)
  html = html.replace(/\n\n+/g, '</p><p>');
  html = `<p>${html}</p>`;

  // Single newlines within paragraphs
  html = html.replace(/\n/g, '<br>');

  // Restore code blocks
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`%%CODE_BLOCK_${idx}%%`, block);
  });

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

/**
 * Basic syntax highlight for code blocks.
 * Highlights keywords, strings, comments for common languages.
 * @param {string} code
 * @param {string} lang
 * @returns {string} HTML with highlight spans
 */
function highlightCode(code, lang) {
  const escaped = escapeHtml(code);

  const keywords = {
    javascript: /\b(const|let|var|function|return|if|else|for|while|class|import|export|async|await|try|catch|new|this|typeof|null|undefined|true|false)\b/g,
    python     : /\b(def|return|if|else|elif|for|while|class|import|from|as|try|except|with|pass|None|True|False|lambda|in|not|and|or)\b/g,
    css        : /\b(color|background|margin|padding|display|flex|grid|font|border|width|height|position|top|left|right|bottom)\b/g
  };

  let highlighted = escaped;
  const kwRegex = keywords[lang.toLowerCase()];
  if (kwRegex) {
    highlighted = highlighted.replace(kwRegex, '<span class="code-keyword">$1</span>');
  }

  // Strings
  highlighted = highlighted.replace(/(&#x27;[^&#x27;]*&#x27;|&quot;[^&quot;]*&quot;|`[^`]*`)/g,
    '<span class="code-string">$1</span>');

  // Comments
  highlighted = highlighted
    .replace(/(\/\/[^\n]*)/g,    '<span class="code-comment">$1</span>')
    .replace(/(#[^\n]*)/g,       '<span class="code-comment">$1</span>');

  return highlighted;
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}

// ===================================================================
// SECTION 12: NOTES / PINBOARD (T-C6)
// ===================================================================

/**
 * Pin a chat message or text snippet to the Notes board.
 * @param {string} content
 * @param {string} [label]
 */
async function pinNote(content, label = '') {
  try {
    const note = {
      id       : generateId(),
      content  : content.slice(0, 2000),
      label    : label || `Ghi chú ${new Date().toLocaleString('vi-VN')}`,
      color    : 'yellow',
      pinnedAt : new Date().toISOString(),
      notebookId: STATE.activeNotebookId
    };

    STATE.pinnedNotes.unshift(note);
    await persistNotes();
    renderPinnedNotes();

    const badge = document.getElementById('notesBadge');
    if (badge) badge.textContent = STATE.pinnedNotes.length;

    showToast('📌 Đã ghim ghi chú!', 'success');
  } catch (err) {
    console.error('[pinNote]', err);
  }
}

/**
 * Delete a pinned note.
 * @param {string} noteId
 */
async function deleteNote(noteId) {
  try {
    STATE.pinnedNotes = STATE.pinnedNotes.filter(n => n.id !== noteId);
    await persistNotes();
    renderPinnedNotes();
    showToast('🗑️ Đã xóa ghi chú.', 'info');
  } catch (err) {
    console.error('[deleteNote]', err);
  }
}

/**
 * Render the pinned notes board.
 */
function renderPinnedNotes() {
  const boardEl = document.getElementById('notesBoard');
  if (!boardEl) return;

  if (STATE.pinnedNotes.length === 0) {
    boardEl.innerHTML = `<div class="empty-state"><p>Chưa có ghi chú nào. Ghim câu trả lời AI để lưu lại!</p></div>`;
    return;
  }

  boardEl.innerHTML = STATE.pinnedNotes.map(note => `
    <div class="note-card note-${note.color}" data-id="${note.id}">
      <div class="note-header">
        <span class="note-label">${escapeHtml(note.label)}</span>
        <div class="note-actions">
          <button class="btn-icon" data-action="edit-note"   data-id="${note.id}" title="Sửa">✏️</button>
          <button class="btn-icon" data-action="delete-note" data-id="${note.id}" title="Xóa">×</button>
        </div>
      </div>
      <div class="note-content">${md2html(note.content)}</div>
      <div class="note-footer">
        <span class="note-date">${new Date(note.pinnedAt).toLocaleDateString('vi-VN')}</span>
        <div class="note-color-dots">
          ${['yellow','blue','green','pink'].map(c =>
            `<button class="color-dot color-${c} ${note.color === c ? 'active' : ''}"
                     data-action="color-note" data-id="${note.id}" data-color="${c}"></button>`
          ).join('')}
        </div>
      </div>
    </div>
  `).join('');

  const badge = document.getElementById('notesBadge');
  if (badge) badge.textContent = STATE.pinnedNotes.length;
}

/**
 * Export all pinned notes to Markdown.
 */
function exportNotes() {
  const content = STATE.pinnedNotes.map(n =>
    `## ${n.label}\n\n${n.content}\n\n---\n`
  ).join('\n');
  downloadText(content, 'notes-ttd.md', 'text/markdown');
  showToast('✅ Đã xuất ghi chú!', 'success');
}

// ===================================================================
// SECTION 13: OVERLAY & UI HELPERS
// ===================================================================

/**
 * Open an overlay/popup by ID.
 * @param {string} overlayId
 */
function openOverlay(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) {
    el.classList.add('open');
    document.body.classList.add('overlay-open');
    el.querySelector('[autofocus]')?.focus();
  }
}

/**
 * Close an overlay/popup by ID.
 * @param {string} overlayId
 */
function closeOverlay(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) {
    el.classList.remove('open');
    document.body.classList.remove('overlay-open');
  }
}

/**
 * Close all open overlays.
 */
function closeAllOverlays() {
  document.querySelectorAll('.overlay.open').forEach(el => {
    el.classList.remove('open');
  });
  document.body.classList.remove('overlay-open');
}

/**
 * Switch to a tab by ID.
 * @param {string} tabId — value of data-tab attribute
 */
function switchTab(tabId) {
  // Update nav links
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });
  // Show/hide tab panels
  document.querySelectorAll('[data-tab-panel]').forEach(el => {
    el.classList.toggle('active', el.dataset.tabPanel === tabId);
  });
  STATE.activeTab = tabId;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration — ms
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('visible'));

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/**
 * Show a confirmation dialog (returns Promise<boolean>).
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function showConfirmDialog(title, message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('overlayConfirm');
    if (!overlay) { resolve(window.confirm(`${title}\n${message}`)); return; }

    const titleEl = overlay.querySelector('.confirm-title');
    const msgEl   = overlay.querySelector('.confirm-message');
    const okBtn   = overlay.querySelector('.confirm-ok');
    const cancelBtn = overlay.querySelector('.confirm-cancel');

    if (titleEl) titleEl.textContent = title;
    if (msgEl)   msgEl.textContent   = message;

    const cleanup = () => {
      overlay.classList.remove('open');
      okBtn?.removeEventListener('click', onOk);
      cancelBtn?.removeEventListener('click', onCancel);
    };

    const onOk     = () => { cleanup(); resolve(true);  };
    const onCancel = () => { cleanup(); resolve(false); };

    okBtn?.addEventListener('click',     onOk,     { once: true });
    cancelBtn?.addEventListener('click', onCancel, { once: true });

    overlay.classList.add('open');
  });
}

/**
 * Copy text to clipboard.
 * @param {string} text
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

/**
 * Trigger a file download.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
function downloadText(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Toggle sidebar open/close.
 */
function toggleSidebar() {
  STATE.sidebarOpen = !STATE.sidebarOpen;
  const sidebar = document.getElementById('notebookSidebar');
  const toggle  = document.getElementById('sidebarToggle');
  if (sidebar) sidebar.classList.toggle('collapsed', !STATE.sidebarOpen);
  if (toggle)  toggle.setAttribute('aria-expanded', STATE.sidebarOpen);
  persistSettings();
}

/**
 * Toggle dark/light theme.
 */
function toggleTheme() {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  applyTheme(STATE.theme);
  persistSettings();
}

/**
 * Apply a named theme to the document root.
 * @param {string} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  STATE.theme = theme;
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/**
 * Apply the selected font family.
 * @param {string} fontId
 */
function applyFont(fontId) {
  const font = FONT_OPTIONS.find(f => f.id === fontId) || FONT_OPTIONS[0];
  document.documentElement.style.setProperty('--font-family', font.css);
  STATE.selectedFont = fontId;

  // Lazy-load Google Fonts
  if (['inter','merriweather','firacode','bevietnampro'].includes(fontId)) {
    const fontNames = {
      inter          : 'Inter:wght@400;600;700',
      merriweather   : 'Merriweather:wght@400;700',
      firacode       : 'Fira+Code:wght@400;500',
      bevietnampro   : 'Be+Vietnam+Pro:wght@400;600;700'
    };
    const linkId = `gfont_${fontId}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id   = linkId;
      link.rel  = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontNames[fontId]}&display=swap`;
      document.head.appendChild(link);
    }
  }
}

/**
 * Apply font size.
 * @param {number} size — pixels
 */
function applyFontSize(size) {
  document.documentElement.style.setProperty('--base-font-size', `${size}px`);
  STATE.fontSize = size;
}

// ===================================================================
// SECTION 14: WRITING ASSISTANT (T-N6)
// ===================================================================

/**
 * Attach writing assistant popup to an AI message content element.
 * @param {HTMLElement} el
 */
function attachWritingAssistant(el) {
  el.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    const text      = selection?.toString().trim();
    if (!text || text.length < 10) return;

    showWritingAssistantPopup(text, selection.getRangeAt(0).getBoundingClientRect());
  });
}

/**
 * Show the writing assistant action popup near selected text.
 * @param {string} selectedText
 * @param {DOMRect} rect
 */
function showWritingAssistantPopup(selectedText, rect) {
  let popup = document.getElementById('writingAssistantPopup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id        = 'writingAssistantPopup';
    popup.className = 'writing-assistant-popup';
    popup.innerHTML = `
      <button data-wa="expand">🔍 Mở rộng</button>
      <button data-wa="shorten">✂️ Rút gọn</button>
      <button data-wa="paraphrase">🔄 Diễn đạt lại</button>
      <button data-wa="translate">🌐 Dịch tiếng Anh</button>
      <button data-wa="formal">👔 Chuyên nghiệp hơn</button>
      <button data-wa="friendly">😊 Thân thiện hơn</button>
    `;
    document.body.appendChild(popup);
  }

  // Position near selection
  popup.style.top  = `${rect.top + window.scrollY - popup.offsetHeight - 8}px`;
  popup.style.left = `${rect.left + window.scrollX}px`;
  popup.style.display = 'flex';
  popup.dataset.text   = selectedText;

  // Auto-dismiss on outside click
  setTimeout(() => {
    const dismiss = (e) => {
      if (!popup.contains(e.target)) {
        popup.style.display = 'none';
        document.removeEventListener('mousedown', dismiss);
      }
    };
    document.addEventListener('mousedown', dismiss);
  }, 100);
}

/**
 * Execute a writing assistant action on selected text.
 * @param {string} action
 * @param {string} text
 */
async function runWritingAssistant(action, text) {
  try {
    const prompts = {
      expand    : `Mở rộng và phát triển đoạn văn sau chi tiết hơn:\n"${text}"`,
      shorten   : `Rút gọn đoạn văn sau thành 1-2 câu ngắn gọn:\n"${text}"`,
      paraphrase: `Diễn đạt lại đoạn văn sau bằng từ ngữ khác nhưng giữ ý nghĩa:\n"${text}"`,
      translate : `Dịch đoạn văn sau sang tiếng Anh tự nhiên:\n"${text}"`,
      formal    : `Viết lại đoạn văn sau theo phong cách chuyên nghiệp hơn:\n"${text}"`,
      friendly  : `Viết lại đoạn văn sau theo phong cách thân thiện, gần gũi hơn:\n"${text}"`
    };

    const prompt = prompts[action];
    if (!prompt) return;

    showToast('⏳ Đang xử lý...', 'info', 2000);
    const result = await callGemini([{ text: prompt }]);
    addChatMessage('model', `**✏️ Kết quả (${action}):**\n\n${result}`);
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

// ===================================================================
// SECTION 15: QUICK ACTIONS (Notebook AI Actions)
// ===================================================================

/**
 * Execute a quick action in the Notebook tab.
 * @param {string} actionId
 */
async function runQuickAction(actionId) {
  try {
    if (!STATE.apiKey) {
      showToast('⚠️ Vui lòng nhập API Key.', 'warning');
      openOverlay('overlaySettings');
      return;
    }
    if (STATE.sources.length === 0) {
      showToast('⚠️ Vui lòng thêm ít nhất 1 nguồn tài liệu.', 'warning');
      return;
    }

    const sourceText = STATE.sources
      .map(s => `[Nguồn ${s.index}: ${s.name}]\n${s.content || ''}`)
      .join('\n\n');

    const prompts = {
      summary   : `Tóm tắt toàn bộ nội dung tài liệu sau thành các điểm chính, rõ ràng, súc tích:\n\n${sourceText}`,
      keypoints : `Trích xuất và liệt kê các điểm quan trọng nhất từ tài liệu sau (dạng bullet points):\n\n${sourceText}`,
      mindmap   : `Tạo mind map dạng Markdown outline (dùng cấu trúc heading và bullet) từ tài liệu sau:\n\n${sourceText}`,
      glossary  : `Trích xuất tất cả thuật ngữ chuyên ngành và định nghĩa từ tài liệu sau, format bảng Markdown:\n\n${sourceText}`,
      sentiment : `Phân tích cảm xúc và tone của tài liệu sau. Trả về: overall sentiment, tone, các từ cảm xúc mạnh:\n\n${sourceText}`,
      citation  : `Tạo trích dẫn học thuật theo các format APA 7th, MLA 9th, Chicago từ metadata các tài liệu sau:\n\n${STATE.sources.map(s => `- ${s.name} (thêm ngày: ${s.addedAt})`).join('\n')}`
    };

    if (actionId === 'flashcard') { await runFlashcardAction(); return; }
    if (actionId === 'compare')   { openOverlay('overlayCompare'); return; }
    if (actionId === 'quiz')      { await runQuizAction(); return; }
    if (actionId === 'podcast')   { openOverlay('overlayPodcast'); return; }

    const prompt = prompts[actionId];
    if (!prompt) { showToast('⚠️ Chức năng chưa sẵn sàng.', 'warning'); return; }

    addChatMessage('user', `[Quick Action: ${actionId}]`);

    const typingId = showTypingIndicator();
    let   fullText = '';
    const msgId    = `qa_${actionId}_${Date.now()}`;

    callGeminiStream(
      [{ text: prompt }],
      [],
      buildSystemInstruction(),
      (chunk) => {
        removeTypingIndicator(typingId);
        fullText += chunk;
        const existing = document.getElementById(msgId);
        if (!existing) addChatMessage('model', fullText, msgId);
        else           updateChatMessage(msgId, fullText);
      },
      (final) => {
        updateChatMessage(msgId, final, true);
        STATE.chatHistory.push({ role: 'user',  parts: [{ text: `[Quick Action: ${actionId}]` }] });
        STATE.chatHistory.push({ role: 'model', parts: [{ text: final }] });
        persistChatHistory();

        // Special rendering for mind map
        if (actionId === 'mindmap') renderMindMap(final);
      },
      (err) => {
        removeTypingIndicator(typingId);
        showToast(`❌ ${err.message}`, 'error');
      }
    );
  } catch (err) {
    console.error('[runQuickAction]', err);
    showToast(`❌ ${err.message}`, 'error');
  }
}

// ===================================================================
// SECTION 16: COMMAND PALETTE (T-N3)
// ===================================================================

const COMMAND_PALETTE_ITEMS = [
  { id: 'new-notebook',  label: '📓 Tạo Notebook mới',  action: () => createNotebook() },
  { id: 'summary',       label: '📝 Tóm tắt tài liệu',  action: () => runQuickAction('summary') },
  { id: 'keypoints',     label: '🔑 Điểm chính',         action: () => runQuickAction('keypoints') },
  { id: 'flashcard',     label: '🃏 Tạo Flashcard',      action: () => runQuickAction('flashcard') },
  { id: 'quiz',          label: '❓ Tạo Quiz',           action: () => runQuickAction('quiz') },
  { id: 'podcast',       label: '🎙️ Tạo Podcast AI',    action: () => openOverlay('overlayPodcast') },
  { id: 'mindmap',       label: '🗺️ Mind Map',          action: () => runQuickAction('mindmap') },
  { id: 'glossary',      label: '📖 Từ điển thuật ngữ', action: () => runQuickAction('glossary') },
  { id: 'citation',      label: '📚 Tạo trích dẫn',     action: () => runQuickAction('citation') },
  { id: 'sentiment',     label: '🎭 Phân tích cảm xúc', action: () => runQuickAction('sentiment') },
  { id: 'dark-mode',     label: '🌙 Chuyển Dark Mode',  action: () => toggleTheme() },
  { id: 'settings',      label: '⚙️ Cài đặt',           action: () => openOverlay('overlaySettings') },
  { id: 'export-chat',   label: '📤 Xuất lịch sử chat', action: () => exportChat('md') },
  { id: 'clear-chat',    label: '🗑️ Xóa lịch sử chat',  action: () => clearChat() },
  { id: 'split-view',    label: '⬜ Split View',         action: () => toggleSplitView() },
  { id: 'focus-mode',    label: '🔭 Focus Mode',         action: () => toggleFocusMode() },
  { id: 'shortcuts',     label: '⌨️ Phím tắt',          action: () => openOverlay('overlayShortcuts') },
  { id: 'help',          label: '❓ Hướng dẫn sử dụng', action: () => openOverlay('overlayHelp') },
  { id: 'notes',         label: '📌 Ghi chú đã ghim',   action: () => openOverlay('overlayNotes') }
];

/**
 * Open the command palette.
 */
function openCommandPalette() {
  const overlay = document.getElementById('overlayCommandPalette');
  if (!overlay) return;

  STATE.commandPaletteOpen = true;
  overlay.classList.add('open');

  const input   = overlay.querySelector('#commandInput');
  const listEl  = overlay.querySelector('#commandList');

  if (input) {
    input.value = '';
    input.focus();
  }

  renderCommandList(listEl, COMMAND_PALETTE_ITEMS);
}

/**
 * Close the command palette.
 */
function closeCommandPalette() {
  const overlay = document.getElementById('overlayCommandPalette');
  if (overlay) overlay.classList.remove('open');
  STATE.commandPaletteOpen = false;
}

/**
 * Render command palette items.
 * @param {HTMLElement} listEl
 * @param {Array} items
 */
function renderCommandList(listEl, items) {
  if (!listEl) return;
  listEl.innerHTML = items.map((item, idx) => `
    <div class="command-item" data-index="${idx}" data-id="${item.id}" tabindex="0" role="option">
      ${escapeHtml(item.label)}
    </div>
  `).join('');
}

/**
 * Filter command palette items on keystroke.
 * @param {string} query
 */
function filterCommandPalette(query) {
  const listEl = document.querySelector('#commandList');
  if (!listEl) return;

  const filtered = query
    ? COMMAND_PALETTE_ITEMS.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : COMMAND_PALETTE_ITEMS;

  renderCommandList(listEl, filtered);
}

// ===================================================================
// SECTION 17: SPLIT VIEW & FOCUS MODE (T-N9, T-U8)
// ===================================================================

/**
 * Toggle split view (document viewer alongside chat).
 */
function toggleSplitView() {
  STATE.splitView = !STATE.splitView;
  const mainLayout = document.getElementById('mainLayout');
  if (mainLayout) mainLayout.classList.toggle('split-view', STATE.splitView);
  showToast(STATE.splitView ? '⬜ Split View bật' : '⬜ Split View tắt', 'info');
}

/**
 * Toggle focus/reading mode.
 */
function toggleFocusMode() {
  STATE.focusMode = !STATE.focusMode;
  document.body.classList.toggle('focus-mode', STATE.focusMode);
  showToast(STATE.focusMode ? '🔭 Focus Mode bật — Nhấn Esc để thoát' : '🔭 Focus Mode tắt', 'info');
}

// ===================================================================
// SECTION 18: EXPORT / IMPORT FUNCTIONS
// ===================================================================

/**
 * Export chat history in various formats.
 * @param {string} format — 'md' | 'txt' | 'json' | 'html'
 */
function exportChat(format) {
  try {
    const nb     = STATE.notebooks.find(n => n.id === STATE.activeNotebookId);
    const nbName = nb ? nb.name : 'notebook';
    const date   = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      downloadText(
        JSON.stringify({ notebook: nb, sources: STATE.sources, chat: STATE.chatHistory }, null, 2),
        `ttd-${nbName}-${date}.json`,
        'application/json'
      );
      return;
    }

    const lines = STATE.chatHistory.map(msg => {
      const role = msg.role === 'user' ? '👤 Bạn' : '🤖 AI';
      const text = msg.parts[0]?.text || '';
      return format === 'md'
        ? `**${role}:**\n\n${text}\n\n---\n`
        : `${role}:\n${text}\n\n---\n`;
    });

    const header = format === 'html'
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${nbName}</title></head><body><h1>${nbName}</h1>`
      : `# ${nbName}\nXuất ngày: ${date}\n\n---\n\n`;

    const footer = format === 'html' ? '</body></html>' : '';
    const body   = format === 'html'
      ? lines.map(l => `<div>${md2html(l)}</div>`).join('')
      : lines.join('\n');

    const mimeTypes = { md: 'text/markdown', txt: 'text/plain', html: 'text/html' };
    downloadText(
      header + body + footer,
      `ttd-${nbName}-${date}.${format}`,
      mimeTypes[format] || 'text/plain'
    );

    showToast(`✅ Đã xuất file .${format}!`, 'success');
  } catch (err) {
    console.error('[exportChat]', err);
    showToast('❌ Lỗi xuất file.', 'error');
  }
}

/**
 * Clear the chat history for the active notebook.
 */
async function clearChat() {
  const confirmed = await showConfirmDialog(
    'Xóa lịch sử chat?',
    'Toàn bộ lịch sử trò chuyện trong notebook này sẽ bị xóa.'
  );
  if (!confirmed) return;

  STATE.chatHistory = [];
  STATE.chatSummary = '';
  await persistChatHistory();
  renderChatHistory();
  showToast('🗑️ Đã xóa lịch sử chat.', 'info');
}

// ===================================================================
// SECTION 19: MIND MAP RENDERER (T-N1, SVG-based)
// ===================================================================

/**
 * Parse a Markdown outline and render as an interactive SVG mind map.
 * @param {string} mdOutline — Markdown text with headings/bullets as hierarchy
 */
function renderMindMap(mdOutline) {
  const container = document.getElementById('mindMapContainer');
  if (!container) return;

  openOverlay('overlayMindMap');

  // Parse hierarchy from markdown
  const lines = mdOutline.split('\n').filter(l => l.trim());
  const nodes = [];
  let   rootText = 'Mind Map';

  lines.forEach(line => {
    const h1 = line.match(/^#\s(.+)/);
    const h2 = line.match(/^##\s(.+)/);
    const h3 = line.match(/^###\s(.+)/);
    const li = line.match(/^[\s]*[-*]\s(.+)/);

    if (h1) { rootText = h1[1]; }
    else if (h2) { nodes.push({ text: h2[1], level: 1 }); }
    else if (h3) { nodes.push({ text: h3[1], level: 2 }); }
    else if (li) { nodes.push({ text: li[1], level: 3 }); }
  });

  const W = container.clientWidth  || 800;
  const H = container.clientHeight || 500;
  const CX = W / 2;
  const CY = H / 2;
  const levelColors = ['#7c3aed', '#2563eb', '#059669', '#d97706'];
  const levelRadii  = [0, 160, 280, 380];

  // Distribute nodes in a circular layout per level
  const byLevel = [[], [], [], []];
  nodes.forEach(n => byLevel[n.level]?.push(n));

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" class="mind-map-svg">
    <defs>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#00000033"/>
      </filter>
    </defs>
    <!-- Root node -->
    <circle cx="${CX}" cy="${CY}" r="50" fill="#7c3aed" filter="url(#shadow)"/>
    <text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="middle"
          fill="white" font-size="13" font-weight="bold">${escapeHtml(rootText.slice(0, 20))}</text>`;

  byLevel.forEach((levelNodes, level) => {
    if (level === 0 || levelNodes.length === 0) return;
    const r     = levelRadii[level];
    const color = levelColors[level];

    levelNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / levelNodes.length - Math.PI / 2;
      const nx    = CX + r * Math.cos(angle);
      const ny    = CY + r * Math.sin(angle);
      const label = node.text.slice(0, 25);
      const nodeR = level === 1 ? 35 : level === 2 ? 28 : 22;

      svgContent += `
        <line x1="${CX}" y1="${CY}" x2="${nx}" y2="${ny}"
              stroke="${color}" stroke-width="1.5" stroke-opacity="0.5"/>
        <circle cx="${nx}" cy="${ny}" r="${nodeR}" fill="${color}" filter="url(#shadow)"
                class="mind-node" data-text="${escapeHtml(node.text)}"/>
        <text x="${nx}" y="${ny}" text-anchor="middle" dominant-baseline="middle"
              fill="white" font-size="${level === 1 ? 11 : 10}"
              >${escapeHtml(label)}</text>`;
    });
  });

  svgContent += '</svg>';
  container.innerHTML = svgContent;
}

// ===================================================================
// SECTION 20: FLASHCARD ENGINE (T-F3 — up to 50 cards)
// ===================================================================

/**
 * Run the flashcard quick action.
 */
async function runFlashcardAction() {
  openOverlay('overlayFlashcardConfig');
}

/**
 * Generate flashcards from source documents.
 * @param {number} count — number of cards to generate (default 10)
 */
async function generateFlashcards(count = STATE.flashcardCount) {
  try {
    closeOverlay('overlayFlashcardConfig');

    if (!STATE.apiKey)             { showToast('⚠️ Vui lòng nhập API Key.', 'warning'); return; }
    if (STATE.sources.length === 0) { showToast('⚠️ Vui lòng thêm nguồn tài liệu.', 'warning'); return; }

    const limits = getEffectiveLimits();
    const finalCount = Math.min(count, limits.MAX_FLASHCARDS);

    showToast(`⏳ Đang tạo ${finalCount} flashcard...`, 'info', 5000);

    const sourceText = STATE.sources
      .map(s => `${s.name}:\n${(s.content || '').slice(0, 3000)}`)
      .join('\n\n');

    const prompt = `Từ tài liệu sau, hãy tạo đúng ${finalCount} flashcard theo định dạng JSON:
{"flashcards": [{"front": "câu hỏi", "back": "câu trả lời", "difficulty": "easy|medium|hard"}]}
Chỉ trả về JSON, không giải thích.
Tài liệu:\n${sourceText}`;

    const result = await callGemini([{ text: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Không thể phân tích flashcard từ AI.');

    const { flashcards } = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(flashcards) || flashcards.length === 0) throw new Error('Không có flashcard nào được tạo.');

    STATE.flashcards     = flashcards.map((fc, i) => ({
      ...fc,
      id      : `fc_${i}`,
      learned : false,
      attempts: 0
    }));
    STATE.flashcardIndex = 0;

    openOverlay('overlayFlashcard');
    renderCurrentFlashcard();
    showToast(`✅ Đã tạo ${flashcards.length} flashcard!`, 'success');
  } catch (err) {
    console.error('[generateFlashcards]', err);
    showToast(`❌ ${err.message}`, 'error');
  }
}

// ===================================================================
// SECTION 20 (tiếp theo): FLASHCARD ENGINE — renderCurrentFlashcard
// ===================================================================

/**
 * Render the current flashcard.
 */
function renderCurrentFlashcard() {
  const card    = STATE.flashcards[STATE.flashcardIndex];
  const totalEl = document.getElementById('fcTotal');
  const indexEl = document.getElementById('fcIndex');
  const frontEl = document.getElementById('fcFront');
  const backEl  = document.getElementById('fcBack');
  const cardEl  = document.getElementById('fcCard');
  const progressEl = document.getElementById('fcProgressBar');

  if (!card) return;

  if (totalEl) totalEl.textContent = STATE.flashcards.length;
  if (indexEl) indexEl.textContent = STATE.flashcardIndex + 1;

  if (frontEl) frontEl.innerHTML = md2html(card.front);
  if (backEl)  backEl.innerHTML  = md2html(card.back);

  // Reset flip state
  if (cardEl) cardEl.classList.remove('flipped');

  // Update difficulty badge
  const diffBadge = document.getElementById('fcDifficulty');
  if (diffBadge) {
    const colors = { easy: 'badge-success', medium: 'badge-warning', hard: 'badge-error' };
    diffBadge.textContent = card.difficulty || 'medium';
    diffBadge.className   = `badge ${colors[card.difficulty] || 'badge-warning'}`;
  }

  // Update learned indicator
  const learnedBtn = document.getElementById('fcLearnedBtn');
  if (learnedBtn) {
    learnedBtn.classList.toggle('active', card.learned === true);
    learnedBtn.title = card.learned ? 'Đã thuộc ✓' : 'Đánh dấu đã thuộc';
  }

  // Progress bar
  const learnedCount = STATE.flashcards.filter(f => f.learned).length;
  if (progressEl) {
    const pct = STATE.flashcards.length > 0
      ? Math.round((learnedCount / STATE.flashcards.length) * 100)
      : 0;
    progressEl.style.width = `${pct}%`;
    progressEl.setAttribute('aria-valuenow', pct);
  }

  // Update counter label
  const learnedLabel = document.getElementById('fcLearnedCount');
  if (learnedLabel) {
    learnedLabel.textContent = `${learnedCount}/${STATE.flashcards.length} đã thuộc`;
  }
}

/**
 * Flip the current flashcard (show back).
 */
function flipFlashcard() {
  const cardEl = document.getElementById('fcCard');
  if (cardEl) cardEl.classList.toggle('flipped');
}

/**
 * Navigate to the next flashcard.
 */
function nextFlashcard() {
  if (STATE.flashcardIndex < STATE.flashcards.length - 1) {
    STATE.flashcardIndex++;
  } else {
    // Loop back to start
    STATE.flashcardIndex = 0;
    showToast('🔁 Đã hoàn thành vòng! Bắt đầu lại từ đầu.', 'info');
  }
  renderCurrentFlashcard();
}

/**
 * Navigate to the previous flashcard.
 */
function prevFlashcard() {
  if (STATE.flashcardIndex > 0) {
    STATE.flashcardIndex--;
  } else {
    STATE.flashcardIndex = STATE.flashcards.length - 1;
  }
  renderCurrentFlashcard();
}

/**
 * Toggle the learned state of the current flashcard.
 */
async function toggleFlashcardLearned() {
  const card = STATE.flashcards[STATE.flashcardIndex];
  if (!card) return;

  card.learned  = !card.learned;
  card.attempts = (card.attempts || 0) + 1;

  renderCurrentFlashcard();

  const learnedCount = STATE.flashcards.filter(f => f.learned).length;
  if (learnedCount === STATE.flashcards.length) {
    showToast('🎉 Xuất sắc! Bạn đã thuộc tất cả flashcard!', 'success', 5000);
  }

  // Persist flashcards to IDB
  await idbPut(IDB_STORES.flashcards, {
    id         : `fc_${STATE.activeNotebookId}`,
    notebookId : STATE.activeNotebookId,
    data       : STATE.flashcards
  });
}

/**
 * Filter flashcards: show only unlearned or all.
 * @param {string} filter — 'all' | 'unlearned' | 'learned'
 */
function filterFlashcards(filter) {
  const allCards = STATE.flashcards;
  let   filtered;

  switch (filter) {
    case 'unlearned':
      filtered = allCards.filter(c => !c.learned);
      break;
    case 'learned':
      filtered = allCards.filter(c => c.learned);
      break;
    default:
      filtered = allCards;
  }

  if (filtered.length === 0) {
    showToast('⚠️ Không có flashcard nào phù hợp với bộ lọc này.', 'warning');
    return;
  }

  // Temporarily replace STATE.flashcards for display
  STATE.flashcards     = filtered;
  STATE.flashcardIndex = 0;
  renderCurrentFlashcard();
}

/**
 * Shuffle the flashcard deck.
 */
function shuffleFlashcards() {
  for (let i = STATE.flashcards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [STATE.flashcards[i], STATE.flashcards[j]] = [STATE.flashcards[j], STATE.flashcards[i]];
  }
  STATE.flashcardIndex = 0;
  renderCurrentFlashcard();
  showToast('🔀 Đã xáo trộn flashcard!', 'info');
}

/**
 * Export flashcards to CSV format.
 */
function exportFlashcardsCSV() {
  const header = 'Mặt trước,Mặt sau,Độ khó,Đã thuộc\n';
  const rows   = STATE.flashcards.map(fc =>
    `"${fc.front.replace(/"/g, '""')}","${fc.back.replace(/"/g, '""')}","${fc.difficulty}","${fc.learned ? 'Có' : 'Chưa'}"`
  ).join('\n');
  downloadText(header + rows, 'flashcards-ttd.csv', 'text/csv;charset=utf-8');
  showToast('✅ Đã xuất CSV!', 'success');
}

/**
 * Export flashcards to JSON format.
 */
function exportFlashcardsJSON() {
  downloadText(
    JSON.stringify({ flashcards: STATE.flashcards }, null, 2),
    'flashcards-ttd.json',
    'application/json'
  );
  showToast('✅ Đã xuất JSON!', 'success');
}

// ===================================================================
// SECTION 21: QUIZ GENERATOR (T-AI3)
// ===================================================================

/**
 * Run the quiz quick action: generate quiz from source documents.
 */
async function runQuizAction() {
  try {
    if (!STATE.apiKey)             { showToast('⚠️ Vui lòng nhập API Key.', 'warning'); return; }
    if (STATE.sources.length === 0) { showToast('⚠️ Vui lòng thêm nguồn tài liệu.', 'warning'); return; }

    openOverlay('overlayQuiz');
    renderQuizLoading();

    const sourceText = STATE.sources
      .map(s => `${s.name}:\n${(s.content || '').slice(0, 4000)}`)
      .join('\n\n');

    const prompt = `Từ tài liệu sau, tạo 10 câu hỏi trắc nghiệm với 4 lựa chọn. Trả về JSON:
{
  "quiz": [
    {
      "question": "Câu hỏi",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": 0,
      "explanation": "Giải thích đáp án đúng"
    }
  ]
}
Chỉ trả về JSON.
Tài liệu:\n${sourceText}`;

    const result    = await callGemini([{ text: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Không thể phân tích quiz từ AI.');

    const { quiz } = JSON.parse(jsonMatch[0]);
    renderQuiz(quiz);
  } catch (err) {
    console.error('[runQuizAction]', err);
    showToast(`❌ ${err.message}`, 'error');
    closeOverlay('overlayQuiz');
  }
}

/**
 * Render quiz loading skeleton.
 */
function renderQuizLoading() {
  const quizEl = document.getElementById('quizContainer');
  if (!quizEl) return;
  quizEl.innerHTML = `
    <div class="quiz-loading">
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-option"></div>
      <div class="skeleton skeleton-option"></div>
      <div class="skeleton skeleton-option"></div>
      <div class="skeleton skeleton-option"></div>
    </div>`;
}

/**
 * Render the quiz questions UI.
 * @param {Array} quiz — array of quiz question objects
 */
function renderQuiz(quiz) {
  const quizEl = document.getElementById('quizContainer');
  if (!quizEl || !quiz || quiz.length === 0) return;

  // Store quiz state
  quizEl.dataset.quiz    = JSON.stringify(quiz);
  quizEl.dataset.current = '0';
  quizEl.dataset.score   = '0';
  quizEl.dataset.answers = JSON.stringify([]);

  renderQuizQuestion(quiz, 0);
}

/**
 * Render a single quiz question.
 * @param {Array}  quiz
 * @param {number} index
 */
function renderQuizQuestion(quiz, index) {
  const quizEl = document.getElementById('quizContainer');
  if (!quizEl) return;

  const q = quiz[index];
  if (!q)  return;

  quizEl.innerHTML = `
    <div class="quiz-progress">
      <span>Câu ${index + 1} / ${quiz.length}</span>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:${((index) / quiz.length) * 100}%"></div>
      </div>
    </div>
    <div class="quiz-question">
      <h3>${escapeHtml(q.question)}</h3>
    </div>
    <div class="quiz-options" data-question="${index}">
      ${q.options.map((opt, i) => `
        <button class="quiz-option" data-index="${i}" data-question="${index}">
          <span class="quiz-option-letter">${String.fromCharCode(65 + i)}</span>
          <span class="quiz-option-text">${escapeHtml(opt.replace(/^[A-D]\.\s*/, ''))}</span>
        </button>
      `).join('')}
    </div>
    <div class="quiz-explanation" id="quizExplanation" style="display:none"></div>
    <div class="quiz-nav">
      <button class="btn btn-secondary" id="quizPrevBtn" ${index === 0 ? 'disabled' : ''}>
        ← Câu trước
      </button>
      <button class="btn btn-primary" id="quizNextBtn" style="display:none">
        ${index === quiz.length - 1 ? 'Xem kết quả 🏆' : 'Câu tiếp →'}
      </button>
    </div>`;
}

/**
 * Handle a quiz option selection.
 * @param {HTMLElement} optionBtn
 */
function selectQuizOption(optionBtn) {
  const quizEl   = document.getElementById('quizContainer');
  if (!quizEl) return;

  const quiz      = JSON.parse(quizEl.dataset.quiz  || '[]');
  const current   = parseInt(quizEl.dataset.current || '0', 10);
  const chosen    = parseInt(optionBtn.dataset.index, 10);
  const answers   = JSON.parse(quizEl.dataset.answers || '[]');
  const q         = quiz[current];
  if (!q) return;

  // Prevent re-answering
  const allOptions = quizEl.querySelectorAll('.quiz-option');
  allOptions.forEach(btn => btn.disabled = true);

  const isCorrect = chosen === q.correct;
  optionBtn.classList.add(isCorrect ? 'correct' : 'incorrect');
  allOptions[q.correct].classList.add('correct');

  // Show explanation
  const explEl = document.getElementById('quizExplanation');
  if (explEl) {
    explEl.innerHTML  = `
      <div class="explanation-icon">${isCorrect ? '✅' : '❌'}</div>
      <div class="explanation-text">
        <strong>${isCorrect ? 'Chính xác!' : 'Chưa đúng.'}</strong>
        ${escapeHtml(q.explanation)}
      </div>`;
    explEl.style.display = 'flex';
    explEl.className = `quiz-explanation ${isCorrect ? 'correct' : 'incorrect'}`;
  }

  // Update score
  if (isCorrect) {
    quizEl.dataset.score = String(parseInt(quizEl.dataset.score || '0', 10) + 1);
  }

  // Save answer
  answers[current] = { chosen, isCorrect };
  quizEl.dataset.answers = JSON.stringify(answers);

  // Show next button
  const nextBtn = document.getElementById('quizNextBtn');
  if (nextBtn) nextBtn.style.display = 'inline-flex';
}

/**
 * Move to the next quiz question or show results.
 */
function nextQuizQuestion() {
  const quizEl = document.getElementById('quizContainer');
  if (!quizEl) return;

  const quiz    = JSON.parse(quizEl.dataset.quiz    || '[]');
  const current = parseInt(quizEl.dataset.current  || '0', 10);
  const score   = parseInt(quizEl.dataset.score    || '0', 10);

  if (current >= quiz.length - 1) {
    renderQuizResults(quiz, score);
    return;
  }

  quizEl.dataset.current = String(current + 1);
  renderQuizQuestion(quiz, current + 1);
}

/**
 * Render quiz results screen.
 * @param {Array}  quiz
 * @param {number} score
 */
async function renderQuizResults(quiz, score) {
  const quizEl = document.getElementById('quizContainer');
  if (!quizEl) return;

  const pct = Math.round((score / quiz.length) * 100);
  const grade = pct >= 90 ? 'Xuất sắc 🏆'
              : pct >= 70 ? 'Tốt 👍'
              : pct >= 50 ? 'Trung bình 📘'
              : 'Cần ôn lại 📖';

  quizEl.innerHTML = `
    <div class="quiz-results">
      <div class="quiz-score-circle" style="--score-pct:${pct}">
        <span class="quiz-score-number">${pct}%</span>
        <span class="quiz-score-label">${score}/${quiz.length} câu đúng</span>
      </div>
      <h2 class="quiz-grade">${grade}</h2>
      <div id="quizAIComment" class="quiz-ai-comment">
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
      <div class="quiz-result-actions">
        <button class="btn btn-primary"  id="quizRetryBtn">🔁 Làm lại</button>
        <button class="btn btn-secondary" id="quizExportBtn">📤 Xuất kết quả</button>
        <button class="btn btn-outline"   id="quizCloseBtn">✖ Đóng</button>
      </div>
    </div>`;

  // AI comment on performance (non-blocking)
  generateQuizComment(score, quiz.length, pct);
}

/**
 * Generate an AI comment on quiz performance.
 * @param {number} score
 * @param {number} total
 * @param {number} pct
 */
async function generateQuizComment(score, total, pct) {
  try {
    const prompt = `Học sinh vừa hoàn thành bài kiểm tra và đạt ${score}/${total} câu đúng (${pct}%).
Viết 2-3 câu nhận xét ngắn gọn, khích lệ và gợi ý học tập phù hợp với kết quả này.`;
    const comment = await callGemini([{ text: prompt }]);
    const commentEl = document.getElementById('quizAIComment');
    if (commentEl) {
      commentEl.innerHTML = `<p class="ai-comment-text">🤖 ${escapeHtml(comment)}</p>`;
    }
  } catch {
    const commentEl = document.getElementById('quizAIComment');
    if (commentEl) commentEl.innerHTML = '';
  }
}

// ===================================================================
// SECTION 22: AI PODCAST GENERATOR (T-C4)
// ===================================================================

/**
 * Generate an AI podcast script from source documents.
 * @param {string} hostName  — host character name
 * @param {string} guestName — guest character name
 */
async function generatePodcastScript(hostName = 'Minh', guestName = 'Lan') {
  try {
    if (!STATE.apiKey)             { showToast('⚠️ Vui lòng nhập API Key.', 'warning'); return; }
    if (STATE.sources.length === 0) { showToast('⚠️ Vui lòng thêm nguồn tài liệu.', 'warning'); return; }

    updatePodcastProgress(10, '📝 Đang tạo kịch bản podcast...');

    const sourceText = STATE.sources
      .map(s => `${s.name}:\n${(s.content || '').slice(0, 3000)}`)
      .join('\n\n');

    const prompt = `Tạo kịch bản podcast đàm thoại tự nhiên giữa 2 nhân vật: ${hostName} (host) và ${guestName} (khách mời).
Độ dài: 800-1200 từ. Thảo luận về nội dung tài liệu một cách tự nhiên, hấp dẫn, dễ hiểu.
Format mỗi dòng: "[${hostName}]: nội dung" hoặc "[${guestName}]: nội dung"
Tài liệu:\n${sourceText}`;

    const script = await callGemini([{ text: prompt }]);

    updatePodcastProgress(40, '✅ Kịch bản hoàn tất! Đang phân tích...');

    // Parse script into lines
    const lines = parsePodcastScript(script, hostName, guestName);
    renderPodcastScript(lines, hostName, guestName);

    updatePodcastProgress(60, '🎙️ Sẵn sàng tổng hợp giọng nói...');

    return lines;
  } catch (err) {
    console.error('[generatePodcastScript]', err);
    showToast(`❌ ${err.message}`, 'error');
    updatePodcastProgress(0, '');
    return null;
  }
}

/**
 * Parse a podcast script string into structured line objects.
 * @param {string} script
 * @param {string} hostName
 * @param {string} guestName
 * @returns {Array<{speaker: string, text: string}>}
 */
function parsePodcastScript(script, hostName, guestName) {
  const lines = [];
  const regex = new RegExp(`\\[(${escapeRegex(hostName)}|${escapeRegex(guestName)})\\]:\\s*(.+)`, 'g');
  let match;

  while ((match = regex.exec(script)) !== null) {
    lines.push({ speaker: match[1], text: match[2].trim() });
  }

  // Fallback: split by lines if regex matches nothing
  if (lines.length === 0) {
    script.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${hostName}:`)) {
        lines.push({ speaker: hostName, text: trimmed.slice(hostName.length + 1).trim() });
      } else if (trimmed.startsWith(`${guestName}:`)) {
        lines.push({ speaker: guestName, text: trimmed.slice(guestName.length + 1).trim() });
      }
    });
  }

  return lines;
}

/**
 * Render the podcast script in the UI.
 * @param {Array}  lines
 * @param {string} hostName
 * @param {string} guestName
 */
function renderPodcastScript(lines, hostName, guestName) {
  const scriptEl = document.getElementById('podcastScript');
  if (!scriptEl) return;

  scriptEl.innerHTML = lines.map((line, i) => {
    const isHost = line.speaker === hostName;
    return `
      <div class="podcast-line ${isHost ? 'host' : 'guest'}" data-line="${i}">
        <div class="podcast-avatar">${isHost ? '🎙️' : '👤'}</div>
        <div class="podcast-bubble">
          <span class="podcast-speaker">${escapeHtml(line.speaker)}</span>
          <p class="podcast-text">${escapeHtml(line.text)}</p>
        </div>
      </div>`;
  }).join('');
}

/**
 * Synthesize podcast audio using Browser TTS (multi-voice fallback).
 * @param {Array}  lines
 * @param {string} hostName
 * @param {string} guestName
 */
async function synthesizePodcastAudio(lines, hostName, guestName) {
  try {
    if (!window.speechSynthesis) {
      showToast('⚠️ Trình duyệt không hỗ trợ TTS.', 'warning');
      return;
    }

    updatePodcastProgress(70, '🔊 Đang tổng hợp âm thanh...');

    const voices  = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('vi'));
    const voice1  = voices[0] || null;
    const voice2  = voices[1] || voices[0] || null;

    window.speechSynthesis.cancel();

    for (let i = 0; i < lines.length; i++) {
      const line  = lines[i];
      const pct   = 70 + Math.round((i / lines.length) * 25);
      updatePodcastProgress(pct, `🎙️ Đang đọc: ${line.speaker} (${i + 1}/${lines.length})`);

      // Highlight current line
      highlightPodcastLine(i);

      await speakLineAsync(line.text, line.speaker === hostName ? voice1 : voice2);
    }

    updatePodcastProgress(100, '✅ Podcast hoàn thành!');
    showToast('🎙️ Podcast đã phát xong!', 'success');
  } catch (err) {
    console.error('[synthesizePodcastAudio]', err);
    showToast(`❌ ${err.message}`, 'error');
  }
}

/**
 * Speak a single text line and return a Promise that resolves when done.
 * @param {string}           text
 * @param {SpeechSynthesisVoice|null} voice
 * @returns {Promise<void>}
 */
function speakLineAsync(text, voice) {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = 'vi-VN';
    utterance.rate  = 1.0;
    if (voice) utterance.voice = voice;
    utterance.onend   = resolve;
    utterance.onerror = resolve; // continue even on error
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Highlight a podcast script line during playback.
 * @param {number} lineIndex
 */
function highlightPodcastLine(lineIndex) {
  document.querySelectorAll('.podcast-line').forEach((el, i) => {
    el.classList.toggle('playing', i === lineIndex);
  });

  const lineEl = document.querySelector(`.podcast-line[data-line="${lineIndex}"]`);
  if (lineEl) lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Update the podcast generation progress bar.
 * @param {number} pct     — 0-100
 * @param {string} message
 */
function updatePodcastProgress(pct, message) {
  const barEl  = document.getElementById('podcastProgressBar');
  const msgEl  = document.getElementById('podcastProgressMsg');
  const wrapEl = document.getElementById('podcastProgress');

  if (barEl)  barEl.style.width = `${pct}%`;
  if (msgEl)  msgEl.textContent  = message;
  if (wrapEl) wrapEl.style.display = pct > 0 && pct < 100 ? 'block' : (pct === 100 ? 'none' : 'none');
}

// ===================================================================
// SECTION 23: TTS ENGINE (T-TTS1, T-TTS2)
// ===================================================================

/**
 * Speak text using the selected TTS engine.
 * @param {string} text
 */
async function speakText(text) {
  if (!text || !text.trim()) { showToast('⚠️ Không có nội dung để đọc.', 'warning'); return; }

  if (STATE.ttsEngine === 'gemini') {
    await speakWithGeminiTTS(text);
  } else {
    speakWithBrowserTTS(text);
  }
}

/**
 * Speak text using the Browser's SpeechSynthesis API.
 * @param {string} text
 */
function speakWithBrowserTTS(text) {
  try {
    window.speechSynthesis.cancel();

    const utterance    = new SpeechSynthesisUtterance(text);
    utterance.lang     = 'vi-VN';
    utterance.rate     = parseFloat(document.getElementById('ttsRate')?.value  || '1');
    utterance.pitch    = parseFloat(document.getElementById('ttsPitch')?.value || '1');
    utterance.volume   = parseFloat(document.getElementById('ttsVolume')?.value || '1');

    // Try to find the selected browser voice
    const selectedVoiceName = document.getElementById('browserVoiceSelect')?.value;
    if (selectedVoiceName) {
      const voice = window.speechSynthesis.getVoices().find(v => v.name === selectedVoiceName);
      if (voice) utterance.voice = voice;
    }

    STATE.ttsUtterance = utterance;
    STATE.ttsSpeaking  = true;

    // Real-time word highlighting (T-TTS1)
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        highlightTTSWord(text, event.charIndex, event.charLength);
      }
    };

    utterance.onend = () => {
      STATE.ttsSpeaking = false;
      clearTTSHighlight();
      updateTTSControls(false);
    };

    utterance.onerror = (e) => {
      STATE.ttsSpeaking = false;
      console.warn('[BrowserTTS error]', e.error);
      updateTTSControls(false);
    };

    updateTTSControls(true);
    showTTSReadingPanel(text);
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('[speakWithBrowserTTS]', err);
    showToast('❌ Lỗi TTS trình duyệt.', 'error');
  }
}

/**
 * Speak text using Gemini TTS API (Pro feature).
 * @param {string} text
 */
async function speakWithGeminiTTS(text) {
  try {
    if (!STATE.licenseValid || STATE.licenseTier !== 'pro') {
      showToast('⚠️ Gemini TTS chỉ dành cho gói Pro. Vui lòng nâng cấp.', 'warning');
      openOverlay('overlayAccount');
      return;
    }
    if (!STATE.apiKey) {
      showToast('⚠️ Vui lòng nhập API Key Gemini.', 'warning');
      return;
    }

    updateTTSControls(true);
    showToast('⏳ Đang tạo audio với Gemini TTS...', 'info', 4000);

    const voice = STATE.ttsVoice || DEFAULT_TTS_VOICE;
    const model = 'gemini-2.5-flash-preview-tts';
    const url   = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${STATE.apiKey}`;

    const body = {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }
          }
        }
      }
    };

    const response = await fetch(url, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API lỗi ${response.status}`);
    }

    const data      = await response.json();
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) throw new Error('Không nhận được audio từ Gemini TTS.');

    // Convert base64 PCM to playable audio
    const audioBlob = base64ToAudioBlob(audioData, 'audio/wav');
    const audioUrl  = URL.createObjectURL(audioBlob);

    playTTSAudio(audioUrl, text);
    showToast('🔊 Gemini TTS đang phát...', 'success');
  } catch (err) {
    console.error('[speakWithGeminiTTS]', err);
    showToast(`❌ Gemini TTS: ${err.message}`, 'error');
    updateTTSControls(false);
  }
}

/**
 * Play a TTS audio URL in the reading panel.
 * @param {string} audioUrl
 * @param {string} text — for display in reading panel
 */
function playTTSAudio(audioUrl, text) {
  showTTSReadingPanel(text);
  const playerEl = document.getElementById('ttsAudioPlayer');
  if (playerEl) {
    playerEl.src            = audioUrl;
    playerEl.style.display  = 'block';
    playerEl.play().catch(e => console.warn('[TTS audio play]', e));
    playerEl.onended = () => {
      STATE.ttsSpeaking = false;
      updateTTSControls(false);
      URL.revokeObjectURL(audioUrl);
    };
  }
  STATE.ttsSpeaking = true;
}

/**
 * Stop all active TTS playback.
 */
function stopTTS() {
  window.speechSynthesis?.cancel();
  STATE.ttsSpeaking  = false;
  STATE.ttsUtterance = null;
  clearTTSHighlight();
  updateTTSControls(false);

  const playerEl = document.getElementById('ttsAudioPlayer');
  if (playerEl) { playerEl.pause(); playerEl.src = ''; }
}

/**
 * Show the TTS reading display panel with the text being spoken.
 * @param {string} text
 */
function showTTSReadingPanel(text) {
  const panel  = document.getElementById('ttsReadingPanel');
  const textEl = document.getElementById('ttsReadingText');
  if (panel)  panel.style.display  = 'block';
  if (textEl) textEl.innerHTML     = wrapWordsForHighlight(text);
}

/**
 * Wrap each word in the text with a span for highlighting.
 * @param {string} text
 * @returns {string} HTML
 */
function wrapWordsForHighlight(text) {
  return escapeHtml(text)
    .split(' ')
    .map((word, i) => `<span class="tts-word" data-index="${i}">${word}</span>`)
    .join(' ');
}

/**
 * Highlight the current word being spoken.
 * @param {string} text
 * @param {number} charIndex
 * @param {number} charLength
 */
function highlightTTSWord(text, charIndex, charLength) {
  const panel  = document.getElementById('ttsReadingPanel');
  if (!panel)  return;

  // Find which word index corresponds to charIndex
  const words    = text.split(' ');
  let   pos      = 0;
  let   wordIdx  = 0;

  for (let i = 0; i < words.length; i++) {
    if (pos >= charIndex) { wordIdx = i; break; }
    pos += words[i].length + 1;
  }

  panel.querySelectorAll('.tts-word').forEach(el => el.classList.remove('tts-highlight'));
  const wordEl = panel.querySelector(`.tts-word[data-index="${wordIdx}"]`);
  if (wordEl) {
    wordEl.classList.add('tts-highlight');
    wordEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Clear all TTS word highlights.
 */
function clearTTSHighlight() {
  document.querySelectorAll('.tts-word').forEach(el => el.classList.remove('tts-highlight'));
}

/**
 * Update TTS play/pause/stop button states.
 * @param {boolean} isPlaying
 */
function updateTTSControls(isPlaying) {
  const playBtn = document.getElementById('ttsPlayBtn');
  const stopBtn = document.getElementById('ttsStopBtn');
  if (playBtn) playBtn.classList.toggle('active', isPlaying);
  if (stopBtn) stopBtn.disabled = !isPlaying;
}

/**
 * Load available browser voices into the voice select dropdown.
 */
function loadBrowserVoices() {
  const select = document.getElementById('browserVoiceSelect');
  if (!select) return;

  const populate = () => {
    const voices = window.speechSynthesis.getVoices();
    const viVoices = voices.filter(v => v.lang.startsWith('vi'));
    const others   = voices.filter(v => !v.lang.startsWith('vi'));

    select.innerHTML = `
      <optgroup label="Tiếng Việt">
        ${viVoices.map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`).join('')}
      </optgroup>
      <optgroup label="Khác">
        ${others.slice(0, 20).map(v => `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)} (${v.lang})</option>`).join('')}
      </optgroup>`;
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    populate();
  } else {
    window.speechSynthesis.onvoiceschanged = populate;
  }
}

/**
 * Load all Gemini voices into the voice select dropdown.
 */
function loadGeminiVoices() {
  const select = document.getElementById('geminiVoiceSelect');
  if (!select) return;
  select.innerHTML = GEMINI_VOICES.map(v =>
    `<option value="${v}" ${v === STATE.ttsVoice ? 'selected' : ''}>${v}</option>`
  ).join('');
}

/**
 * Convert base64 PCM audio data to an audio Blob.
 * @param {string} base64Data
 * @param {string} mimeType
 * @returns {Blob}
 */
function base64ToAudioBlob(base64Data, mimeType = 'audio/wav') {
  const binary = atob(base64Data);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return new Blob([buffer], { type: mimeType });
}

// ===================================================================
// SECTION 24: STT & MEETING MINUTES (T-F1 Fixed)
// ===================================================================

/**
 * Start screen/audio recording for meeting minutes.
 * Returns a Promise that resolves when recording has fully started.
 */
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: { echoCancellation: true, noiseSuppression: true }
    });

    STATE.recordingChunks = [];
    STATE.screenBlob      = null;
    STATE.isRecording     = true;

    STATE.mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm'
    });

    STATE.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        STATE.recordingChunks.push(event.data);
      }
    };

    STATE.mediaRecorder.start(1000); // collect data every 1 second

    updateRecordingUI(true);
    showToast('🔴 Đang ghi âm màn hình...', 'info');

    // Stop recording when user stops screen share
    stream.getVideoTracks()[0].onended = () => {
      if (STATE.isRecording) stopRecordingAndProcess();
    };
  } catch (err) {
    console.error('[startRecording]', err);
    STATE.isRecording = false;
    if (err.name === 'NotAllowedError') {
      showToast('⚠️ Vui lòng cho phép truy cập màn hình.', 'warning');
    } else {
      showToast(`❌ Lỗi bắt đầu ghi: ${err.message}`, 'error');
    }
  }
}

/**
 * Stop the MediaRecorder and return a Promise<Blob> that resolves
 * ONLY after the onstop event fires (T-F1 critical fix).
 * @returns {Promise<Blob>}
 */
function stopRecordingAsync() {
  return new Promise((resolve, reject) => {
    if (!STATE.mediaRecorder || STATE.mediaRecorder.state === 'inactive') {
      reject(new Error('Không có phiên ghi nào đang chạy.'));
      return;
    }

    STATE.mediaRecorder.onstop = () => {
      if (STATE.recordingChunks.length === 0) {
        reject(new Error('Không có dữ liệu audio được ghi lại.'));
        return;
      }
      const blob = new Blob(STATE.recordingChunks, { type: 'video/webm' });
      STATE.screenBlob = blob;
      resolve(blob);
    };

    STATE.mediaRecorder.stop();

    // Stop all tracks
    STATE.mediaRecorder.stream?.getTracks().forEach(track => track.stop());
  });
}

/**
 * Stop recording and generate meeting minutes (T-F1 complete fix).
 */
async function stopRecordingAndProcess() {
  try {
    STATE.isRecording = false;
    updateRecordingUI(false);

    updateMinutesProgress('⏳ Đang chuẩn bị audio...');

    // T-F1 fix: await blob to be fully ready before proceeding
    const blob = await stopRecordingAsync();

    if (!blob || blob.size < 1000) {
      showToast('⚠️ File ghi âm quá nhỏ hoặc không hợp lệ.', 'warning');
      updateMinutesProgress('');
      return;
    }

    updateMinutesProgress('🔄 Đang chuyển đổi audio...');

    // Convert to base64
    const base64 = await fileToBase64(new File([blob], 'meeting.webm', { type: 'video/webm' }));

    updateMinutesProgress('🤖 Đang phân tích nội dung cuộc họp...');

    await generateMinutes(base64, blob.type);
  } catch (err) {
    console.error('[stopRecordingAndProcess]', err);
    showToast(`❌ ${err.message}`, 'error');
    updateMinutesProgress('');
  }
}

/**
 * Generate meeting minutes from audio data.
 * @param {string} base64Audio
 * @param {string} mimeType
 */
async function generateMinutes(base64Audio, mimeType) {
  try {
    if (!STATE.apiKey) {
      showToast('⚠️ Vui lòng nhập API Key Gemini.', 'warning');
      return;
    }

    const prompt = `Phân tích nội dung cuộc họp trong file audio/video này và tạo biên bản cuộc họp theo cấu trúc:

## BIÊN BẢN CUỘC HỌP

**Thời gian:** [Phân tích từ nội dung]
**Người tham dự:** [Liệt kê nếu nhận diện được]

### Tóm tắt nội dung chính
[Tóm tắt các điểm thảo luận quan trọng]

### Các quyết định đã thống nhất
[Liệt kê các quyết định]

### Công việc cần thực hiện (Action Items)
[Ai làm gì, deadline nếu có]

### Các vấn đề còn tồn đọng
[Các vấn đề chưa giải quyết]`;

    const parts = [
      { text: prompt },
      { inlineData: { mimeType, data: base64Audio } }
    ];

    const result = await callGemini(parts);

    updateMinutesProgress('');
    displayMinutesResult(result);
    showToast('✅ Biên bản cuộc họp đã được tạo!', 'success');
  } catch (err) {
    console.error('[generateMinutes]', err);
    showToast(`❌ ${err.message}`, 'error');
    updateMinutesProgress('');
  }
}

/**
 * Display the meeting minutes result in the UI.
 * @param {string} minutesText
 */
function displayMinutesResult(minutesText) {
  const resultEl = document.getElementById('minutesResult');
  if (resultEl) {
    resultEl.innerHTML = md2html(minutesText);
    resultEl.style.display = 'block';
  }

  const actionsEl = document.getElementById('minutesActions');
  if (actionsEl) actionsEl.style.display = 'flex';
}

/**
 * Update meeting minutes generation progress message.
 * @param {string} message
 */
function updateMinutesProgress(message) {
  const progressEl = document.getElementById('minutesProgress');
  if (progressEl) {
    progressEl.textContent = message;
    progressEl.style.display = message ? 'flex' : 'none';
  }
}

/**
 * Update the recording UI state.
 * @param {boolean} isRecording
 */
function updateRecordingUI(isRecording) {
  const startBtn  = document.getElementById('startRecordBtn');
  const stopBtn   = document.getElementById('stopRecordBtn');
  const indicator = document.getElementById('recordingIndicator');

  if (startBtn)  startBtn.disabled = isRecording;
  if (stopBtn)   stopBtn.disabled  = !isRecording;
  if (indicator) indicator.classList.toggle('active', isRecording);
}

// ===================================================================
// SECTION 25: DOCUMENT VIEWER & CITATION CLICK-THROUGH (T-C2, T-C3)
// ===================================================================

/**
 * Open a source in the document viewer modal.
 * @param {string} sourceId
 */
async function openDocumentViewer(sourceId) {
  const source = STATE.sources.find(s => s.id === sourceId);
  if (!source) return;

  openOverlay('overlayDocViewer');

  const titleEl   = document.getElementById('docViewerTitle');
  const contentEl = document.getElementById('docViewerContent');

  if (titleEl)   titleEl.textContent = source.name;
  if (contentEl) contentEl.innerHTML = '<div class="skeleton skeleton-block"></div>';

  // Render based on type
  if (source.type === 'text' || source.type === 'url' || source.type === 'youtube') {
    renderTextViewer(source, contentEl);
  } else if (source.mimeType?.startsWith('image/')) {
    renderImageViewer(source, contentEl);
  } else if (source.mimeType === 'application/pdf') {
    renderPDFViewer(source, contentEl);
  } else if (source.mimeType?.startsWith('audio/')) {
    renderAudioViewer(source, contentEl);
  } else {
    contentEl.innerHTML = `<p class="doc-unsupported">📄 Không hỗ trợ xem trước loại file này: <code>${source.mimeType}</code></p>`;
  }
}

/**
 * Render text content in the document viewer.
 * @param {Object}      source
 * @param {HTMLElement} containerEl
 */
function renderTextViewer(source, containerEl) {
  containerEl.innerHTML = `
    <div class="doc-viewer-text">
      ${md2html(source.content || 'Không có nội dung.')}
    </div>`;
}

/**
 * Render image content with lightbox zoom.
 * @param {Object}      source
 * @param {HTMLElement} containerEl
 */
function renderImageViewer(source, containerEl) {
  const src = source.base64
    ? `data:${source.mimeType};base64,${source.base64}`
    : source.url || '';
  containerEl.innerHTML = `
    <div class="doc-viewer-image">
      <img src="${src}" alt="${escapeHtml(source.name)}"
           class="doc-image" id="docViewerImg" />
      <div class="image-controls">
        <button class="btn btn-sm" id="imgZoomIn"  title="Phóng to">🔍+</button>
        <button class="btn btn-sm" id="imgZoomOut" title="Thu nhỏ">🔍−</button>
        <button class="btn btn-sm" id="imgRotate"  title="Xoay">🔄</button>
      </div>
    </div>`;
  initImageViewer();
}

/**
 * Initialize image zoom/rotate controls.
 */
function initImageViewer() {
  const img  = document.getElementById('docViewerImg');
  if (!img)  return;
  let scale  = 1;
  let rotate = 0;

  const apply = () => {
    img.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
  };

  document.getElementById('imgZoomIn')?.addEventListener('click',  () => { scale  = Math.min(scale  + 0.25, 4);   apply(); });
  document.getElementById('imgZoomOut')?.addEventListener('click', () => { scale  = Math.max(scale  - 0.25, 0.5); apply(); });
  document.getElementById('imgRotate')?.addEventListener('click',  () => { rotate = (rotate + 90) % 360;           apply(); });
}

/**
 * Render PDF using PDF.js CDN.
 * @param {Object}      source
 * @param {HTMLElement} containerEl
 */
function renderPDFViewer(source, containerEl) {
  containerEl.innerHTML = `
    <div class="doc-viewer-pdf">
      <div class="pdf-nav">
        <button class="btn btn-sm" id="pdfPrevPage">← Trang trước</button>
        <span id="pdfPageInfo">Đang tải...</span>
        <button class="btn btn-sm" id="pdfNextPage">Trang sau →</button>
      </div>
      <canvas id="pdfCanvas" class="pdf-canvas"></canvas>
    </div>`;

  if (typeof pdfjsLib === 'undefined') {
    containerEl.innerHTML = `<p>⚠️ PDF.js chưa được tải. Đảm bảo CDN được thêm vào index.html.</p>`;
    return;
  }

  const pdfData = source.base64 ? atob(source.base64) : null;
  if (!pdfData) {
    containerEl.innerHTML = `<p>⚠️ Không có dữ liệu PDF.</p>`;
    return;
  }

  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  loadingTask.promise.then(pdfDoc => {
    let currentPage = 1;
    const totalPages = pdfDoc.numPages;

    const renderPage = (pageNum) => {
      pdfDoc.getPage(pageNum).then(page => {
        const canvas  = document.getElementById('pdfCanvas');
        if (!canvas) return;
        const ctx     = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height  = viewport.height;
        canvas.width   = viewport.width;
        page.render({ canvasContext: ctx, viewport });
        const info = document.getElementById('pdfPageInfo');
        if (info) info.textContent = `Trang ${pageNum} / ${totalPages}`;
      });
    };

    renderPage(1);

    document.getElementById('pdfPrevPage')?.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderPage(currentPage); }
    });
    document.getElementById('pdfNextPage')?.addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderPage(currentPage); }
    });
  }).catch(err => {
    containerEl.innerHTML = `<p>❌ Lỗi tải PDF: ${escapeHtml(err.message)}</p>`;
  });
}

/**
 * Render inline audio player.
 * @param {Object}      source
 * @param {HTMLElement} containerEl
 */
function renderAudioViewer(source, containerEl) {
  const src = source.base64
    ? `data:${source.mimeType};base64,${source.base64}`
    : source.url || '';
  containerEl.innerHTML = `
    <div class="doc-viewer-audio">
      <div class="audio-info">
        <span class="audio-icon">🎵</span>
        <span class="audio-name">${escapeHtml(source.name)}</span>
      </div>
      <audio controls class="audio-player" src="${src}">
        Trình duyệt của bạn không hỗ trợ audio.
      </audio>
    </div>`;
}

/**
 * Handle citation click — find the source and highlight the relevant excerpt.
 * @param {number} sourceIndex — 1-based source number from [Nguồn X]
 */
function handleCitationClick(sourceIndex) {
  const source = STATE.sources.find(s => s.index === sourceIndex);
  if (!source) { showToast(`⚠️ Không tìm thấy Nguồn ${sourceIndex}.`, 'warning'); return; }
  openDocumentViewer(source.id);
}

// ===================================================================
// SECTION 26: FULL-TEXT SOURCE SEARCH (T-U6)
// ===================================================================

/**
 * Search all source content for the given query.
 * @param {string} query
 */
function searchSources(query) {
  const resultsEl = document.getElementById('sourceSearchResults');
  if (!resultsEl) return;

  if (!query || query.trim().length < 2) {
    resultsEl.innerHTML = '';
    resultsEl.style.display = 'none';
    return;
  }

  const q       = query.toLowerCase();
  const matches = [];

  STATE.sources.forEach(src => {
    const content = (src.content || src.name || '').toLowerCase();
    let   idx     = content.indexOf(q);

    while (idx !== -1 && matches.length < 20) {
      const start   = Math.max(0, idx - 60);
      const end     = Math.min(content.length, idx + q.length + 60);
      const snippet = (src.content || src.name || '').slice(start, end);

      matches.push({ source: src, snippet, position: idx });
      idx = content.indexOf(q, idx + q.length);
    }
  });

  if (matches.length === 0) {
    resultsEl.innerHTML = `<p class="search-no-result">Không tìm thấy kết quả nào.</p>`;
  } else {
    resultsEl.innerHTML = matches.map(m => {
      const highlighted = escapeHtml(m.snippet).replace(
        new RegExp(escapeRegex(escapeHtml(query)), 'gi'),
        s => `<mark class="search-highlight">${s}</mark>`
      );
      return `
        <div class="search-result-item" data-source-id="${m.source.id}">
          <div class="search-result-source">${getSourceIcon(m.source.type, m.source.mimeType)} ${escapeHtml(m.source.name)}</div>
          <div class="search-result-snippet">...${highlighted}...</div>
        </div>`;
    }).join('');
  }

  resultsEl.style.display = 'block';
}

// ===================================================================
// SECTION 27: DRAG-TO-RESIZE SOURCE PANEL (T-U4)
// ===================================================================

/**
 * Initialize drag-to-resize functionality for the source panel.
 */
function initResizablePanel() {
  const panel    = document.getElementById('sourcePanel');
  const divider  = document.getElementById('panelDivider');
  if (!panel || !divider) return;

  // Restore saved width
  const savedWidth = localStorage.getItem('ttd_source_panel_width');
  if (savedWidth) panel.style.width = savedWidth;

  let   isDragging = false;
  let   startX     = 0;
  let   startWidth = 0;

  divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX     = e.clientX;
    startWidth = panel.offsetWidth;
    document.body.classList.add('resizing');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx       = e.clientX - startX;
    const newWidth = Math.min(Math.max(startWidth + dx, 200), 600);
    panel.style.width = `${newWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove('resizing');
    localStorage.setItem('ttd_source_panel_width', panel.style.width);
  });

  // Touch support
  divider.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX     = e.touches[0].clientX;
    startWidth = panel.offsetWidth;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx       = e.touches[0].clientX - startX;
    const newWidth = Math.min(Math.max(startWidth + dx, 200), 600);
    panel.style.width = `${newWidth}px`;
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    localStorage.setItem('ttd_source_panel_width', panel.style.width);
  });
}

// ===================================================================
// SECTION 28: ONBOARDING TOUR (T-U2)
// ===================================================================

const ONBOARDING_STEPS = [
  {
    target  : '#apiKeyInput',
    title   : '🔑 Bước 1: Nhập API Key',
    content : 'Nhập Gemini API Key miễn phí của bạn tại đây. Lấy key tại aistudio.google.com. Key được lưu an toàn trên thiết bị của bạn.',
    position: 'bottom'
  },
  {
    target  : '#addSourceBtn',
    title   : '📄 Bước 2: Thêm tài liệu',
    content : 'Upload PDF, ảnh, audio, hoặc dán văn bản trực tiếp. AI sẽ đọc và hiểu toàn bộ nội dung tài liệu của bạn.',
    position: 'right'
  },
  {
    target  : '#chatInput',
    title   : '💬 Bước 3: Trò chuyện với AI',
    content : 'Đặt câu hỏi về tài liệu bằng ngôn ngữ tự nhiên. AI sẽ trả lời dựa trên nội dung bạn đã upload.',
    position: 'top'
  },
  {
    target  : '#quickActionsBar',
    title   : '⚡ Bước 4: Quick Actions',
    content : 'Tạo tóm tắt, điểm chính, flashcard, quiz, podcast chỉ với 1 click! Không cần gõ câu hỏi.',
    position: 'bottom'
  },
  {
    target  : '#ttsSection',
    title   : '🔊 Bước 5: Text-to-Speech',
    content : 'Nghe AI đọc tài liệu với nhiều giọng đọc. Chọn Browser TTS (miễn phí) hoặc Gemini TTS (Pro) với 30+ giọng đọc tự nhiên.',
    position: 'left'
  },
  {
    target  : '#recordTab',
    title   : '🎙️ Bước 6: Ghi âm & Biên bản',
    content : 'Ghi màn hình cuộc họp Zoom/Teams. AI tự động tạo biên bản cuộc họp chi tiết với action items.',
    position: 'bottom'
  },
  {
    target  : '#convertTab',
    title   : '🔄 Bước 7: Chuyển đổi tài liệu',
    content : 'Chuyển đổi PDF, ảnh, audio thành text, Markdown, JSON... AI xử lý thông minh và hỗ trợ batch mode.',
    position: 'bottom'
  }
];

/**
 * Start the onboarding tour from step 0.
 */
function startOnboardingTour() {
  STATE.onboardingStep = 0;
  showOnboardingStep(0);
}

/**
 * Show a specific onboarding step.
 * @param {number} stepIndex
 */
function showOnboardingStep(stepIndex) {
  if (stepIndex >= ONBOARDING_STEPS.length) {
    finishOnboardingTour();
    return;
  }

  const step    = ONBOARDING_STEPS[stepIndex];
  const overlay = document.getElementById('overlayOnboarding');
  if (!overlay) return;

  overlay.classList.add('open');

  const titleEl   = overlay.querySelector('.onboarding-title');
  const contentEl = overlay.querySelector('.onboarding-content');
  const stepEl    = overlay.querySelector('.onboarding-step');
  const totalEl   = overlay.querySelector('.onboarding-total');
  const progressEl= overlay.querySelector('.onboarding-progress-fill');

  if (titleEl)   titleEl.textContent   = step.title;
  if (contentEl) contentEl.textContent = step.content;
  if (stepEl)    stepEl.textContent    = stepIndex + 1;
  if (totalEl)   totalEl.textContent   = ONBOARDING_STEPS.length;

  if (progressEl) {
    progressEl.style.width = `${((stepIndex + 1) / ONBOARDING_STEPS.length) * 100}%`;
  }

  // Highlight the target element
  const targetEl = document.querySelector(step.target);
  if (targetEl) {
    document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
    targetEl.classList.add('onboarding-highlight');
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Update nav buttons
  const prevBtn = overlay.querySelector('#onboardingPrev');
  const nextBtn = overlay.querySelector('#onboardingNext');
  if (prevBtn) prevBtn.disabled = stepIndex === 0;
  if (nextBtn) nextBtn.textContent = stepIndex === ONBOARDING_STEPS.length - 1
    ? '🎉 Hoàn thành'
    : 'Tiếp theo →';

  STATE.onboardingStep = stepIndex;
}

/**
 * Finish the onboarding tour.
 */
function finishOnboardingTour() {
  const overlay = document.getElementById('overlayOnboarding');
  if (overlay) overlay.classList.remove('open');

  document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));

  STATE.onboardingDone = true;
  persistSettings();
  showToast('🎉 Chào mừng! Bạn đã sẵn sàng sử dụng TuongTanDigital-AI!', 'success', 5000);
}

// ===================================================================
// SECTION 29: YOUTUBE TRANSCRIPT IMPORT (T-N2)
// ===================================================================

/**
 * Import a YouTube video transcript using Gemini's URL context.
 * @param {string} youtubeUrl
 */
async function importYouTubeTranscript(youtubeUrl) {
  try {
    if (!STATE.apiKey) { showToast('⚠️ Vui lòng nhập API Key.', 'warning'); return; }

    if (!youtubeUrl.match(/youtu\.be|youtube\.com/i)) {
      showToast('⚠️ URL YouTube không hợp lệ.', 'warning');
      return;
    }

    showToast('⏳ Đang phân tích video YouTube...', 'info', 8000);

    const prompt = `Hãy trích xuất và tóm tắt toàn bộ transcript/nội dung của video YouTube này: ${youtubeUrl}
Trả về:
1. Tiêu đề video
2. Nội dung transcript đầy đủ (hoặc tóm tắt chi tiết nếu transcript không khả dụng)
3. Các điểm chính`;

    const parts = [
      { text: prompt },
      { fileData: { mimeType: 'text/plain', fileUri: youtubeUrl } }
    ];

    let result;
    try {
      result = await callGemini(parts);
    } catch {
      // Fallback: use URL context directly in text
      result = await callGemini([{
        text: `Phân tích video YouTube: ${youtubeUrl}\n${prompt}`
      }]);
    }

    const titleMatch = result.match(/(?:Tiêu đề|Title):\s*(.+)/i);
    const videoTitle = titleMatch ? titleMatch[1].trim() : `YouTube: ${youtubeUrl}`;

    await addTextSource(videoTitle, result, 'youtube', youtubeUrl);
    showToast(`✅ Đã import: ${videoTitle}`, 'success');

    closeOverlay('overlayYoutube');
  } catch (err) {
    console.error('[importYouTubeTranscript]', err);
    showToast(`❌ ${err.message}`, 'error');
  }
}

// ===================================================================
// SECTION 30: OCR PRE-PROCESSING (T-N8)
// ===================================================================

/**
 * Pre-process an image using Canvas API to improve OCR accuracy.
 * @param {File} imageFile
 * @returns {Promise<{originalDataUrl: string, processedDataUrl: string, processedFile: File}>}
 */
async function preprocessImageForOCR(imageFile) {
  return new Promise((resolve, reject) => {
    const img    = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
      const originalDataUrl = e.target.result;

      img.onload = () => {
        const canvas  = document.createElement('canvas');
        const ctx     = canvas.getContext('2d');

        // Scale up for better OCR
        const scale   = Math.min(3, 2048 / Math.max(img.width, img.height));
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data      = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
          // Increase contrast
          const contrast  = 1.5;
          const adjusted  = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
          // Binarize: threshold at 128
          const final     = adjusted > 128 ? 255 : 0;

          data[i]   = final; // R
          data[i+1] = final; // G
          data[i+2] = final; // B
          // Alpha unchanged
        }

        ctx.putImageData(imageData, 0, 0);
        const processedDataUrl = canvas.toDataURL('image/png', 0.95);

        // Convert to File
        canvas.toBlob((blob) => {
          const processedFile = new File([blob], imageFile.name.replace(/\.[^.]+$/, '_ocr.png'), {
            type: 'image/png'
          });
          resolve({ originalDataUrl, processedDataUrl, processedFile });
        }, 'image/png');
      };

      img.onerror = reject;
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Show OCR before/after preview in the UI.
 * @param {string} originalDataUrl
 * @param {string} processedDataUrl
 */
function showOCRPreview(originalDataUrl, processedDataUrl) {
  const panel = document.getElementById('ocrPreviewPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="ocr-preview-grid">
      <div class="ocr-preview-item">
        <span class="ocr-label">📷 Ảnh gốc</span>
        <img src="${originalDataUrl}"  alt="Ảnh gốc"   class="ocr-img" />
      </div>
      <div class="ocr-preview-item">
        <span class="ocr-label">✨ Sau xử lý</span>
        <img src="${processedDataUrl}" alt="Sau xử lý" class="ocr-img" />
      </div>
    </div>`;
  panel.style.display = 'grid';
}

// ===================================================================
// SECTION 31: EXPORT DOCX (T-N4)
// ===================================================================

/**
 * Export chat history or a specific text block to a DOCX file.
 * Uses the docx.js library loaded via CDN.
 * @param {string} content  — plain text or markdown to export
 * @param {string} filename — output filename without extension
 */
async function exportToDocx(content, filename = 'export-ttd') {
  try {
    if (typeof docx === 'undefined') {
      showToast('⚠️ docx.js chưa được tải. Kiểm tra kết nối mạng.', 'warning');
      return;
    }

    showToast('⏳ Đang tạo file Word...', 'info', 3000);

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell } = docx;

    const lines    = content.split('\n');
    const docItems = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { docItems.push(new Paragraph('')); continue; }

      if (trimmed.startsWith('### ')) {
        docItems.push(new Paragraph({ text: trimmed.slice(4), heading: HeadingLevel.HEADING_3 }));
      } else if (trimmed.startsWith('## ')) {
        docItems.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 }));
      } else if (trimmed.startsWith('# ')) {
        docItems.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 }));
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        docItems.push(new Paragraph({
          children: [new TextRun(trimmed.slice(2))],
          bullet  : { level: 0 }
        }));
      } else {
        // Handle inline bold **text**
        const parts = trimmed.split(/\*\*(.+?)\*\*/g);
        const runs  = parts.map((part, i) =>
          new TextRun({ text: part, bold: i % 2 === 1 })
        );
        docItems.push(new Paragraph({ children: runs }));
      }
    }

    // Add watermark paragraph at the end
    docItems.push(new Paragraph(''));
    docItems.push(new Paragraph({
      children: [new TextRun({
        text  : `— Xuất từ TuongTanDigital-AI v${APP_VERSION} | tuongtandigital.com`,
        color : '888888',
        size  : 18,
        italics: true
      })]
    }));

    const doc  = new Document({ sections: [{ children: docItems }] });
    const blob = await Packer.toBlob(doc);

    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `${filename}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('✅ Đã xuất file Word (.docx)!', 'success');
  } catch (err) {
    console.error('[exportToDocx]', err);
    showToast(`❌ Lỗi xuất DOCX: ${err.message}`, 'error');
  }
}

// ===================================================================
// SECTION 32: SETTINGS UI HANDLERS
// ===================================================================

/**
 * Populate the Settings overlay with current STATE values.
 */
function populateSettings() {
  const apiKeyInput    = document.getElementById('apiKeyInput');
  const modelSelect    = document.getElementById('modelSelect');
  const fontSelect     = document.getElementById('fontSelect');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const personaSelect  = document.getElementById('personaSelect');
  const licenseInput   = document.getElementById('licenseKeyInput');
  const flashcardSlider= document.getElementById('flashcardCountSlider');

  if (apiKeyInput)     apiKeyInput.value     = STATE.apiKey;
  if (modelSelect)     modelSelect.value     = STATE.selectedModel;
  if (personaSelect)   personaSelect.value   = STATE.selectedPersona;
  if (licenseInput)    licenseInput.value    = STATE.licenseKey;
  if (fontSizeSlider) {
    fontSizeSlider.value = STATE.fontSize;
    const label = document.getElementById('fontSizeLabelVal');
    if (label) label.textContent = `${STATE.fontSize}px`;
  }
  if (flashcardSlider) {
    flashcardSlider.value = STATE.flashcardCount;
    const label = document.getElementById('flashcardCountLabel');
    if (label) label.textContent = `${STATE.flashcardCount} thẻ`;
  }

  // Populate font options
  if (fontSelect) {
    fontSelect.innerHTML = FONT_OPTIONS.map(f =>
      `<option value="${f.id}" ${f.id === STATE.selectedFont ? 'selected' : ''}>${f.label}</option>`
    ).join('');
  }

  // Populate model options
  if (modelSelect) {
    modelSelect.innerHTML = GEMINI_MODELS.map(m =>
      `<option value="${m.id}" ${m.id === STATE.selectedModel ? 'selected' : ''}>${m.label}</option>`
    ).join('');
  }

  // Populate persona options
  if (personaSelect) {
    personaSelect.innerHTML = PERSONAS.map(p =>
      `<option value="${p.id}" ${p.id === STATE.selectedPersona ? 'selected' : ''}>${p.label}</option>`
    ).join('');
  }

  updateLicenseUI();
  updateUserUI();
  updateUsageStats();
}

/**
 * Update the usage statistics display in Settings.
 */
function updateUsageStats() {
  const statsEl = document.getElementById('usageStats');
  if (!statsEl) return;
  const limits = getEffectiveLimits();
  const chatsLeft = limits.CHATS_PER_DAY === Infinity
    ? 'Không giới hạn'
    : `${STATE.chatsToday}/${limits.CHATS_PER_DAY} hôm nay`;

  statsEl.innerHTML = `
    <div class="stat-item">
      <span class="stat-label">💬 Chat đã dùng:</span>
      <span class="stat-value">${chatsLeft}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">📚 Notebooks:</span>
      <span class="stat-value">${STATE.notebooks.length}/${limits.MAX_NOTEBOOKS}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">📄 Nguồn (notebook hiện tại):</span>
      <span class="stat-value">${STATE.sources.length}/${limits.MAX_SOURCES}</span>
    </div>`;
}

/**
 * Save Settings from the UI inputs to STATE and persist.
 */
async function saveSettings() {
  try {
    const apiKeyInput     = document.getElementById('apiKeyInput');
    const modelSelect     = document.getElementById('modelSelect');
    const fontSelect      = document.getElementById('fontSelect');
    const fontSizeSlider  = document.getElementById('fontSizeSlider');
    const personaSelect   = document.getElementById('personaSelect');
    const flashcardSlider = document.getElementById('flashcardCountSlider');

    if (apiKeyInput)     STATE.apiKey          = apiKeyInput.value.trim();
    if (modelSelect)     STATE.selectedModel   = modelSelect.value;
    if (personaSelect)   STATE.selectedPersona = personaSelect.value;
    if (fontSizeSlider)  { STATE.fontSize      = parseInt(fontSizeSlider.value, 10); applyFontSize(STATE.fontSize); }
    if (flashcardSlider) STATE.flashcardCount  = parseInt(flashcardSlider.value, 10);

    if (fontSelect) {
      STATE.selectedFont = fontSelect.value;
      applyFont(STATE.selectedFont);
    }

    await persistSettings();
    closeOverlay('overlaySettings');
    showToast('✅ Đã lưu cài đặt!', 'success');
  } catch (err) {
    console.error('[saveSettings]', err);
    showToast('❌ Lỗi lưu cài đặt.', 'error');
  }
}

/**
 * Handle license key submission from Settings UI.
 */
async function submitLicenseKey() {
  const input = document.getElementById('licenseKeyInput');
  if (!input) return;

  const key = input.value.trim();
  if (!key) { showToast('⚠️ Vui lòng nhập License Key.', 'warning'); return; }

  const btn = document.getElementById('validateLicenseBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang kiểm tra...'; }

  const result = await validateLicenseKey(key);

  if (btn) { btn.disabled = false; btn.textContent = '✅ Kích hoạt'; }

  if (result.valid) {
    STATE.licenseKey = key;
    applyLicense(result);
    showToast(`🎉 License hợp lệ! Chào mừng đến gói ${result.tier.toUpperCase()}!`, 'success', 5000);
  } else {
    showToast(`❌ ${result.message}`, 'error');
  }
}

// ===================================================================
// SECTION 33: PROMPT LIBRARY (T-N5)
// ===================================================================

const PROMPT_LIBRARY = [
  // Học thuật
  { id: 'academic-summary',  category: 'Học thuật', icon: '📚', title: 'Tóm tắt học thuật',   text: 'Tóm tắt tài liệu này theo chuẩn học thuật, bao gồm: mục tiêu nghiên cứu, phương pháp, kết quả và kết luận.' },
  { id: 'academic-review',   category: 'Học thuật', icon: '🔬', title: 'Phản biện khoa học',  text: 'Phân tích điểm mạnh, điểm yếu và hạn chế của nghiên cứu/tài liệu này theo góc nhìn phản biện.' },
  { id: 'academic-cite',     category: 'Học thuật', icon: '📖', title: 'Tổng hợp tài liệu',   text: 'Tổng hợp các luận điểm chính từ tài liệu và so sánh với xu hướng nghiên cứu hiện tại.' },
  // Kinh doanh
  { id: 'biz-swot',          category: 'Kinh doanh', icon: '💼', title: 'Phân tích SWOT',      text: 'Phân tích SWOT (Điểm mạnh, Điểm yếu, Cơ hội, Thách thức) dựa trên nội dung tài liệu.' },
  { id: 'biz-action',        category: 'Kinh doanh', icon: '🎯', title: 'Action Plan',         text: 'Tạo kế hoạch hành động cụ thể từ tài liệu này với các bước ưu tiên, người phụ trách và deadline gợi ý.' },
  { id: 'biz-exec',          category: 'Kinh doanh', icon: '📊', title: 'Executive Summary',   text: 'Viết Executive Summary (tóm tắt điều hành) không quá 300 từ từ tài liệu này.' },
  // Pháp lý
  { id: 'legal-risk',        category: 'Pháp lý',   icon: '⚖️', title: 'Phân tích rủi ro',    text: 'Xác định và phân tích các rủi ro pháp lý tiềm ẩn trong tài liệu này.' },
  { id: 'legal-terms',       category: 'Pháp lý',   icon: '📋', title: 'Điều khoản chính',    text: 'Liệt kê và giải thích các điều khoản quan trọng nhất trong tài liệu pháp lý này.' },
  // Y tế
  { id: 'med-summary',       category: 'Y tế',      icon: '🏥', title: 'Tóm tắt y khoa',      text: 'Tóm tắt thông tin y khoa trong tài liệu theo ngôn ngữ dễ hiểu cho bệnh nhân.' },
  { id: 'med-drug',          category: 'Y tế',      icon: '💊', title: 'Thông tin thuốc',      text: 'Tổng hợp thông tin về thuốc/điều trị đề cập trong tài liệu: công dụng, liều dùng, tác dụng phụ.' },
  // Giáo dục
  { id: 'edu-lesson',        category: 'Giáo dục',  icon: '🎓', title: 'Kế hoạch bài giảng',  text: 'Tạo kế hoạch bài giảng 45 phút từ nội dung tài liệu này với mục tiêu, hoạt động và đánh giá.' },
  { id: 'edu-explain',       category: 'Giáo dục',  icon: '💡', title: 'Giải thích đơn giản',  text: 'Giải thích nội dung tài liệu này cho học sinh/sinh viên năm nhất theo cách đơn giản nhất có thể.' },
  // Marketing
  { id: 'mkt-copy',          category: 'Marketing', icon: '📢', title: 'Viết copy marketing',  text: 'Tạo nội dung marketing hấp dẫn từ tài liệu này: tiêu đề, mô tả, CTA.' },
  { id: 'mkt-social',        category: 'Marketing', icon: '📱', title: 'Nội dung social',       text: 'Viết 5 bài đăng mạng xã hội (LinkedIn, Facebook) từ nội dung tài liệu này.' },
  // Kỹ thuật
  { id: 'tech-doc',          category: 'Kỹ thuật',  icon: '⚙️', title: 'Tài liệu kỹ thuật',   text: 'Chuyển đổi nội dung tài liệu thành tài liệu kỹ thuật chuẩn với mục lục, mô tả chi tiết và ví dụ.' },
  { id: 'tech-review',       category: 'Kỹ thuật',  icon: '🔧', title: 'Code Review',           text: 'Review code trong tài liệu: tìm lỗi, đề xuất cải thiện, giải thích logic.' }
];

/**
 * Render the prompt library in the popup.
 * @param {string} [filter] — category filter or search query
 */
function renderPromptLibrary(filter = '') {
  const listEl = document.getElementById('promptLibraryList');
  if (!listEl) return;

  const items = filter
    ? PROMPT_LIBRARY.filter(p =>
        p.title.toLowerCase().includes(filter.toLowerCase()) ||
        p.category.toLowerCase().includes(filter.toLowerCase()) ||
        p.text.toLowerCase().includes(filter.toLowerCase())
      )
    : PROMPT_LIBRARY;

  // Group by category
  const categories = {};
  items.forEach(p => {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push(p);
  });

  listEl.innerHTML = Object.entries(categories).map(([cat, prompts]) => `
    <div class="prompt-category">
      <h4 class="prompt-category-title">${cat}</h4>
      <div class="prompt-grid">
        ${prompts.map(p => `
          <div class="prompt-card" data-prompt-id="${p.id}" title="${escapeHtml(p.text)}">
            <span class="prompt-icon">${p.icon}</span>
            <span class="prompt-title">${escapeHtml(p.title)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  if (items.length === 0) {
    listEl.innerHTML = `<p class="empty-state">Không tìm thấy prompt nào.</p>`;
  }
}

/**
 * Use a prompt from the library — insert into chat input.
 * @param {string} promptId
 */
function usePromptFromLibrary(promptId) {
  const prompt = PROMPT_LIBRARY.find(p => p.id === promptId);
  if (!prompt) return;

  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.value = prompt.text;
    chatInput.focus();
    chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
  }

  closeOverlay('overlayPromptLibrary');
  showToast(`✅ Đã chèn prompt: ${prompt.title}`, 'success');
}

// ===================================================================
// SECTION 34: FEEDBACK SYSTEM (T-U7)
// ===================================================================

/**
 * Show feedback panel for a thumbs-down reaction.
 * @param {HTMLElement} msgEl
 */
function showFeedbackPanel(msgEl) {
  const panel = document.getElementById('feedbackPanel');
  if (!panel) { showToast('🙏 Cảm ơn phản hồi!', 'info'); return; }

  panel.style.display = 'flex';
  panel.dataset.msgId = msgEl.id;

  // Position near the message
  const rect = msgEl.getBoundingClientRect();
  panel.style.top  = `${rect.bottom + window.scrollY + 8}px`;
  panel.style.left = `${rect.left   + window.scrollX}px`;
}

/**
 * Submit feedback and store locally.
 * @param {string} reason
 * @param {string} msgId
 */
function submitFeedback(reason, msgId) {
  try {
    const feedbacks = JSON.parse(localStorage.getItem('ttd_feedback') || '[]');
    feedbacks.push({
      msgId,
      reason,
      timestamp: new Date().toISOString(),
      notebookId: STATE.activeNotebookId
    });
    localStorage.setItem('ttd_feedback', JSON.stringify(feedbacks.slice(-100)));

    const panel = document.getElementById('feedbackPanel');
    if (panel) panel.style.display = 'none';

    showToast('🙏 Cảm ơn phản hồi! Chúng tôi sẽ cải thiện.', 'success');
  } catch (err) {
    console.error('[submitFeedback]', err);
  }
}

// ===================================================================
// SECTION 35: UTILITY FUNCTIONS
// ===================================================================

/**
 * Escape a string for use in a RegExp.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format a file size in bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number}   delay — milliseconds
 * @returns {Function}
 */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function call.
 * @param {Function} fn
 * @param {number}   limit — milliseconds
 * @returns {Function}
 */
function throttle(fn, limit) {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/**
 * Get today's date string in Vietnamese locale.
 * @returns {string}
 */
function getTodayString() {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year   : 'numeric',
    month  : 'long',
    day    : 'numeric'
  });
}

// ===================================================================
// SECTION 36: GLOBAL EVENT LISTENERS
// ===================================================================

/**
 * Attach all event listeners — called once on DOMContentLoaded.
 */
function attachEventListeners() {

  // === Chat input ===
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendChat();
      }
    });
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = `${Math.min(chatInput.scrollHeight, 200)}px`;
    });
  }

  // === Send chat button ===
  const sendBtn = document.getElementById('sendChatBtn');
  if (sendBtn) sendBtn.addEventListener('click', handleSendChat);

  // === Notebook list interactions ===
  const notebookList = document.getElementById('notebookList');
  if (notebookList) {
    notebookList.addEventListener('click', async (e) => {
      const btn  = e.target.closest('[data-action]');
      const item = e.target.closest('.notebook-item');

      if (btn) {
        e.stopPropagation();
        const { action, id } = btn.dataset;
        if (action === 'delete') await deleteNotebook(id);
        if (action === 'pin')    await togglePinNotebook(id);
        if (action === 'rename') {
          const name = prompt('Tên mới cho notebook:');
          if (name) await renameNotebook(id, name);
        }
        return;
      }

      if (item && item.dataset.id !== STATE.activeNotebookId) {
        await switchNotebook(item.dataset.id);
      }
    });

    notebookList.addEventListener('dblclick', async (e) => {
      const nameEl = e.target.closest('.notebook-name');
      if (nameEl) {
        const item = nameEl.closest('.notebook-item');
        const name = prompt('Tên mới:', nameEl.textContent);
        if (name) await renameNotebook(item.dataset.id, name);
      }
    });
  }

  // === New notebook button ===
  const newNbBtn = document.getElementById('newNotebookBtn');
  if (newNbBtn) newNbBtn.addEventListener('click', () => createNotebook());

  // === Sidebar toggle ===
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);

  // === Source list interactions ===
  const sourceList = document.getElementById('sourceList');
  if (sourceList) {
    sourceList.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === 'remove')  await removeSource(id);
      if (action === 'preview') await openDocumentViewer(id);
    });

    // Right-click context menu for source tags
    sourceList.addEventListener('contextmenu', (e) => {
      const item = e.target.closest('.source-item');
      if (item) {
        e.preventDefault();
        showSourceContextMenu(e, item.dataset.id);
      }
    });
  }

  // === Source search ===
  const srcSearch = document.getElementById('sourceSearch');
  if (srcSearch) {
    srcSearch.addEventListener('input', debounce((e) => {
      searchSources(e.target.value);
    }, 300));
  }

  // === Add source buttons ===
  document.getElementById('addFileBtn')?.addEventListener('click', () =>
    document.getElementById('fileInput')?.click()
  );
  document.getElementById('addTextBtn')?.addEventListener('click', () =>
    openOverlay('overlayAddText')
  );
  document.getElementById('addUrlBtn')?.addEventListener('click', () =>
    openOverlay('overlayAddUrl')
  );
  document.getElementById('addYoutubeBtn')?.addEventListener('click', () =>
    openOverlay('overlayYoutube')
  );

  // === File input ===
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        await addFileSource(file);
      }
      fileInput.value = '';
    });
  }

// ===================================================================
// SECTION 36 (tiếp theo): GLOBAL EVENT LISTENERS
// ===================================================================

  // === Add text source confirm (T-F2 fix) ===
  document.getElementById('confirmAddTextBtn')?.addEventListener('click', async () => {
    const textarea  = document.getElementById('addTextarea');
    const nameInput = document.getElementById('addTextName');
    if (!textarea) return;

    const content = textarea.value.trim();
    const name    = nameInput?.value.trim() || `Văn bản ${new Date().toLocaleTimeString('vi-VN')}`;

    if (!content) { showToast('⚠️ Vui lòng nhập nội dung.', 'warning'); return; }
    if (content.length > 50000) {
      showToast('⚠️ Nội dung vượt quá 50,000 ký tự.', 'warning');
      return;
    }

    await addTextSource(name, content, 'text');
    textarea.value        = '';
    if (nameInput) nameInput.value = '';
    closeOverlay('overlayAddText');
  });

  // === Paste from clipboard in Add Text modal ===
  document.getElementById('pasteClipboardBtn')?.addEventListener('click', async () => {
    try {
      const text     = await navigator.clipboard.readText();
      const textarea = document.getElementById('addTextarea');
      if (textarea) {
        textarea.value += text;
        // Update char counter
        const counter = document.getElementById('addTextCharCount');
        if (counter) counter.textContent = `${textarea.value.length.toLocaleString('vi-VN')} / 50,000 ký tự`;
      }
      showToast('📋 Đã dán từ clipboard!', 'success');
    } catch {
      showToast('⚠️ Không thể đọc clipboard. Hãy dán thủ công (Ctrl+V).', 'warning');
    }
  });

  // === Add text char counter ===
  document.getElementById('addTextarea')?.addEventListener('input', (e) => {
    const counter = document.getElementById('addTextCharCount');
    if (counter) {
      counter.textContent = `${e.target.value.length.toLocaleString('vi-VN')} / 50,000 ký tự`;
      counter.classList.toggle('over-limit', e.target.value.length > 50000);
    }
  });

  // === Add URL source ===
  document.getElementById('confirmAddUrlBtn')?.addEventListener('click', async () => {
    const urlInput  = document.getElementById('addUrlInput');
    const url       = urlInput?.value.trim();
    if (!url) { showToast('⚠️ Vui lòng nhập URL.', 'warning'); return; }

    try {
      new URL(url); // validate
    } catch {
      showToast('⚠️ URL không hợp lệ.', 'warning');
      return;
    }

    showToast('⏳ Đang tải nội dung URL...', 'info', 5000);

    try {
      const prompt = `Hãy trích xuất và tóm tắt toàn bộ nội dung từ URL này: ${url}
Trả về nội dung đầy đủ và có cấu trúc.`;
      const content = await callGemini([{ text: prompt }]);
      const name    = new URL(url).hostname + ' — ' + new Date().toLocaleDateString('vi-VN');
      await addTextSource(name, content, 'url', url);
      if (urlInput) urlInput.value = '';
      closeOverlay('overlayAddUrl');
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
    }
  });

  // === Add YouTube source ===
  document.getElementById('confirmAddYoutubeBtn')?.addEventListener('click', async () => {
    const ytInput = document.getElementById('youtubeUrlInput');
    const url     = ytInput?.value.trim();
    if (!url) { showToast('⚠️ Vui lòng nhập URL YouTube.', 'warning'); return; }
    await importYouTubeTranscript(url);
    if (ytInput) ytInput.value = '';
  });

  // === Quick actions bar ===
  document.getElementById('quickActionsBar')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) await runQuickAction(btn.dataset.action);
  });

  // === Flashcard config overlay — generate ===
  document.getElementById('generateFlashcardsBtn')?.addEventListener('click', async () => {
    const slider = document.getElementById('fcConfigCountSlider');
    const count  = slider ? parseInt(slider.value, 10) : STATE.flashcardCount;
    STATE.flashcardCount = count;
    await generateFlashcards(count);
  });

  // Flashcard count slider live label
  document.getElementById('fcConfigCountSlider')?.addEventListener('input', (e) => {
    const label = document.getElementById('fcConfigCountLabel');
    if (label) label.textContent = `${e.target.value} thẻ`;
  });

  // === Flashcard overlay controls ===
  document.getElementById('fcFlipBtn')?.addEventListener('click',    flipFlashcard);
  document.getElementById('fcNextBtn')?.addEventListener('click',    nextFlashcard);
  document.getElementById('fcPrevBtn')?.addEventListener('click',    prevFlashcard);
  document.getElementById('fcLearnedBtn')?.addEventListener('click', toggleFlashcardLearned);
  document.getElementById('fcShuffleBtn')?.addEventListener('click', shuffleFlashcards);

  document.getElementById('fcExportCSVBtn')?.addEventListener('click',  exportFlashcardsCSV);
  document.getElementById('fcExportJSONBtn')?.addEventListener('click', exportFlashcardsJSON);

  // Flashcard filter buttons
  document.getElementById('fcFilterAll')?.addEventListener('click',      () => filterFlashcards('all'));
  document.getElementById('fcFilterUnlearned')?.addEventListener('click',() => filterFlashcards('unlearned'));
  document.getElementById('fcFilterLearned')?.addEventListener('click',  () => filterFlashcards('learned'));

  // Flip on card click
  document.getElementById('fcCard')?.addEventListener('click', flipFlashcard);

  // === Quiz overlay ===
  document.getElementById('quizContainer')?.addEventListener('click', (e) => {
    const optBtn  = e.target.closest('.quiz-option');
    const nextBtn = e.target.closest('#quizNextBtn');
    const prevBtn = e.target.closest('#quizPrevBtn');
    const retryBtn= e.target.closest('#quizRetryBtn');
    const exportBtn=e.target.closest('#quizExportBtn');
    const closeBtn= e.target.closest('#quizCloseBtn');

    if (optBtn  && !optBtn.disabled) selectQuizOption(optBtn);
    if (nextBtn) nextQuizQuestion();
    if (prevBtn) {
      const quizEl  = document.getElementById('quizContainer');
      const current = parseInt(quizEl?.dataset.current || '0', 10);
      if (current > 0) {
        quizEl.dataset.current = String(current - 1);
        renderQuizQuestion(JSON.parse(quizEl.dataset.quiz || '[]'), current - 1);
      }
    }
    if (retryBtn)  runQuizAction();
    if (exportBtn) exportChat('html');
    if (closeBtn)  closeOverlay('overlayQuiz');
  });

  // === Podcast overlay ===
  document.getElementById('startPodcastBtn')?.addEventListener('click', async () => {
    const hostInput  = document.getElementById('podcastHostName');
    const guestInput = document.getElementById('podcastGuestName');
    const hostName   = hostInput?.value.trim()  || 'Minh';
    const guestName  = guestInput?.value.trim() || 'Lan';

    const lines = await generatePodcastScript(hostName, guestName);
    if (!lines) return;

    const audioBtn = document.getElementById('playPodcastBtn');
    if (audioBtn) {
      audioBtn.style.display = 'inline-flex';
      audioBtn.dataset.lines      = JSON.stringify(lines);
      audioBtn.dataset.hostName   = hostName;
      audioBtn.dataset.guestName  = guestName;
    }
  });

  document.getElementById('playPodcastBtn')?.addEventListener('click', async (e) => {
    const btn       = e.currentTarget;
    const lines     = JSON.parse(btn.dataset.lines     || '[]');
    const hostName  = btn.dataset.hostName  || 'Minh';
    const guestName = btn.dataset.guestName || 'Lan';
    await synthesizePodcastAudio(lines, hostName, guestName);
  });

  document.getElementById('stopPodcastBtn')?.addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    document.querySelectorAll('.podcast-line').forEach(el => el.classList.remove('playing'));
    showToast('⏹ Đã dừng podcast.', 'info');
  });

  // === TTS controls ===
  document.getElementById('ttsPlayBtn')?.addEventListener('click', () => {
    const ttsTextEl = document.getElementById('ttsTextInput');
    if (!ttsTextEl) return;
    const text = ttsTextEl.value.trim();
    if (!text) { showToast('⚠️ Nhập văn bản để đọc.', 'warning'); return; }
    speakText(text);
  });

  document.getElementById('ttsStopBtn')?.addEventListener('click', stopTTS);

  // TTS engine toggle
  document.querySelectorAll('[data-tts-engine]').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.ttsEngine = btn.dataset.ttsEngine;
      document.querySelectorAll('[data-tts-engine]').forEach(b =>
        b.classList.toggle('active', b.dataset.ttsEngine === STATE.ttsEngine)
      );
      // Toggle engine setting panels
      const browserPanel = document.getElementById('browserTTSPanel');
      const geminiPanel  = document.getElementById('geminiTTSPanel');
      if (browserPanel) browserPanel.style.display = STATE.ttsEngine === 'browser' ? 'block' : 'none';
      if (geminiPanel)  geminiPanel.style.display  = STATE.ttsEngine === 'gemini'  ? 'block' : 'none';
      persistSettings();
    });
  });

  // TTS rate/pitch/volume sliders — live label update
  ['ttsRate', 'ttsPitch', 'ttsVolume'].forEach(id => {
    const slider = document.getElementById(id);
    if (!slider) return;
    slider.addEventListener('input', () => {
      const label = document.getElementById(`${id}Label`);
      if (label) label.textContent = parseFloat(slider.value).toFixed(1);
    });
  });

  // Gemini voice select
  document.getElementById('geminiVoiceSelect')?.addEventListener('change', (e) => {
    STATE.ttsVoice = e.target.value;
    persistSettings();
  });

  // === Meeting minutes (Record tab) ===
  document.getElementById('startRecordBtn')?.addEventListener('click', startRecording);
  document.getElementById('stopRecordBtn')?.addEventListener('click',  stopRecordingAndProcess);

  document.getElementById('copyMinutesBtn')?.addEventListener('click', () => {
    const resultEl = document.getElementById('minutesResult');
    if (resultEl) {
      copyToClipboard(resultEl.innerText);
      showToast('📋 Đã sao chép biên bản!', 'success');
    }
  });

  document.getElementById('exportMinutesMDBtn')?.addEventListener('click', () => {
    const resultEl = document.getElementById('minutesResult');
    if (resultEl) downloadText(resultEl.innerText, `bien-ban-${Date.now()}.md`, 'text/markdown');
  });

  document.getElementById('exportMinutesDOCXBtn')?.addEventListener('click', async () => {
    const resultEl = document.getElementById('minutesResult');
    if (resultEl) await exportToDocx(resultEl.innerText, `bien-ban-${Date.now()}`);
  });

  document.getElementById('addMinutesToNotebookBtn')?.addEventListener('click', async () => {
    const resultEl = document.getElementById('minutesResult');
    if (resultEl) {
      await addTextSource('Biên bản cuộc họp ' + new Date().toLocaleDateString('vi-VN'), resultEl.innerText);
      showToast('✅ Đã thêm biên bản vào Notebook!', 'success');
    }
  });

  // === Notes board ===
  document.getElementById('notesBoard')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, color } = btn.dataset;

    if (action === 'delete-note') {
      await deleteNote(id);
    } else if (action === 'color-note') {
      const note = STATE.pinnedNotes.find(n => n.id === id);
      if (note) { note.color = color; await persistNotes(); renderPinnedNotes(); }
    } else if (action === 'edit-note') {
      const note    = STATE.pinnedNotes.find(n => n.id === id);
      if (!note) return;
      const newText = prompt('Chỉnh sửa ghi chú:', note.content);
      if (newText !== null) {
        note.content = newText;
        await persistNotes();
        renderPinnedNotes();
      }
    }
  });

  document.getElementById('exportNotesBtn')?.addEventListener('click', exportNotes);

  document.getElementById('addManualNoteBtn')?.addEventListener('click', () => {
    const text = prompt('Nhập nội dung ghi chú mới:');
    if (text && text.trim()) pinNote(text.trim(), 'Ghi chú thủ công');
  });

  // === Mind map overlay ===
  document.getElementById('exportMindMapBtn')?.addEventListener('click', () => {
    const svgEl = document.querySelector('.mind-map-svg');
    if (!svgEl) return;
    const svgData   = new XMLSerializer().serializeToString(svgEl);
    const canvas    = document.createElement('canvas');
    canvas.width    = svgEl.clientWidth  || 800;
    canvas.height   = svgEl.clientHeight || 500;
    const ctx       = canvas.getContext('2d');
    const img       = new Image();
    const svgBlob   = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url       = URL.createObjectURL(svgBlob);
    img.onload      = () => {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        const dlUrl = URL.createObjectURL(blob);
        const a     = document.createElement('a');
        a.href      = dlUrl; a.download = 'mindmap-ttd.png';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(dlUrl); URL.revokeObjectURL(url);
      });
    };
    img.src = url;
    showToast('✅ Đã xuất Mind Map PNG!', 'success');
  });

  // Mind map zoom/pan
  initMindMapInteraction();

  // === Command palette ===
  document.getElementById('commandInput')?.addEventListener('input', (e) => {
    filterCommandPalette(e.target.value);
  });

  document.getElementById('commandInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCommandPalette();
    if (e.key === 'Enter') {
      const firstItem = document.querySelector('.command-item');
      if (firstItem) firstItem.click();
    }
    if (e.key === 'ArrowDown') {
      const items = document.querySelectorAll('.command-item');
      const curr  = document.querySelector('.command-item:focus');
      const idx   = curr ? Array.from(items).indexOf(curr) : -1;
      items[idx + 1]?.focus();
    }
    if (e.key === 'ArrowUp') {
      const items = document.querySelectorAll('.command-item');
      const curr  = document.querySelector('.command-item:focus');
      const idx   = curr ? Array.from(items).indexOf(curr) : items.length;
      items[idx - 1]?.focus();
    }
  });

  document.getElementById('commandList')?.addEventListener('click', (e) => {
    const item = e.target.closest('.command-item');
    if (!item) return;
    const idx  = parseInt(item.dataset.index, 10);
    const query= document.getElementById('commandInput')?.value || '';
    const items= query
      ? COMMAND_PALETTE_ITEMS.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
      : COMMAND_PALETTE_ITEMS;
    const cmd  = items[idx];
    if (cmd) { closeCommandPalette(); cmd.action(); }
  });

  // === Settings overlay ===
  document.getElementById('openSettingsBtn')?.addEventListener('click', () => {
    populateSettings();
    openOverlay('overlaySettings');
  });

  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);

  document.getElementById('validateLicenseBtn')?.addEventListener('click', submitLicenseKey);

  // Font size slider live
  document.getElementById('fontSizeSlider')?.addEventListener('input', (e) => {
    const label = document.getElementById('fontSizeLabelVal');
    if (label) label.textContent = `${e.target.value}px`;
    applyFontSize(parseInt(e.target.value, 10));
  });

  // Flashcard count slider in settings live
  document.getElementById('flashcardCountSlider')?.addEventListener('input', (e) => {
    const label = document.getElementById('flashcardCountLabel');
    if (label) label.textContent = `${e.target.value} thẻ`;
  });

  // === Account overlay ===
  document.getElementById('openAccountBtn')?.addEventListener('click', () => {
    populateSettings();
    openOverlay('overlayAccount');
  });

  document.getElementById('signOutBtn')?.addEventListener('click', signOut);

  // === Chat export buttons ===
  document.getElementById('exportChatMDBtn')?.addEventListener('click',   () => exportChat('md'));
  document.getElementById('exportChatTXTBtn')?.addEventListener('click',  () => exportChat('txt'));
  document.getElementById('exportChatJSONBtn')?.addEventListener('click', () => exportChat('json'));
  document.getElementById('exportChatHTMLBtn')?.addEventListener('click', () => exportChat('html'));
  document.getElementById('exportChatDOCXBtn')?.addEventListener('click', async () => {
    const content = STATE.chatHistory
      .map(m => `${m.role === 'user' ? '# Bạn' : '## AI'}\n\n${m.parts[0]?.text || ''}`)
      .join('\n\n---\n\n');
    await exportToDocx(content, `chat-ttd-${Date.now()}`);
  });

  document.getElementById('clearChatBtn')?.addEventListener('click', clearChat);

  // === Chat reactions (delegated from chat container) ===
  document.getElementById('chatMessages')?.addEventListener('click', (e) => {
    const reactionBtn = e.target.closest('.reaction-btn');
    const citationBtn = e.target.closest('.citation-btn');
    const chipBtn     = e.target.closest('.suggestion-chip');

    if (reactionBtn) {
      const msgEl = reactionBtn.closest('.chat-message');
      if (msgEl) handleReaction(reactionBtn, msgEl);
    }

    if (citationBtn) {
      const idx = parseInt(citationBtn.dataset.source, 10);
      handleCitationClick(idx);
    }

    if (chipBtn) {
      const q = chipBtn.dataset.question;
      if (q) {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) { chatInput.value = q; chatInput.focus(); }
      }
    }
  });

  // Refresh suggested questions
  document.getElementById('refreshSuggestionsBtn')?.addEventListener('click', generateSuggestedQuestions);

  // === Writing assistant popup ===
  document.getElementById('writingAssistantPopup')?.addEventListener('click', async (e) => {
    const btn    = e.target.closest('[data-wa]');
    if (!btn) return;
    const action = btn.dataset.wa;
    const popup  = document.getElementById('writingAssistantPopup');
    const text   = popup?.dataset.text || '';
    popup.style.display = 'none';
    if (text && action) await runWritingAssistant(action, text);
  });

  // === Prompt library ===
  document.getElementById('openPromptLibraryBtn')?.addEventListener('click', () => {
    renderPromptLibrary();
    openOverlay('overlayPromptLibrary');
  });

  document.getElementById('promptSearchInput')?.addEventListener('input', (e) => {
    renderPromptLibrary(e.target.value);
  });

  document.getElementById('promptLibraryList')?.addEventListener('click', (e) => {
    const card = e.target.closest('.prompt-card');
    if (card) usePromptFromLibrary(card.dataset.promptId);
  });

  // === Persona selector ===
  document.getElementById('personaSelectorBtn')?.addEventListener('click', () => {
    const dropdown = document.getElementById('personaDropdown');
    if (dropdown) dropdown.classList.toggle('open');
  });

  document.getElementById('personaDropdown')?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-persona]');
    if (!item) return;
    STATE.selectedPersona = item.dataset.persona;
    const btn = document.getElementById('personaSelectorBtn');
    const persona = PERSONAS.find(p => p.id === STATE.selectedPersona);
    if (btn && persona) btn.textContent = persona.label;
    document.getElementById('personaDropdown')?.classList.remove('open');
    persistSettings();
    showToast(`✅ Đã chọn persona: ${persona?.label}`, 'success');
  });

  // === Source context menu ===
  document.addEventListener('click', (e) => {
    const ctxMenu = document.getElementById('sourceContextMenu');
    if (ctxMenu && !ctxMenu.contains(e.target)) ctxMenu.style.display = 'none';
  });

  document.getElementById('sourceContextMenu')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-ctx-action]');
    if (!btn) return;
    const ctxMenu  = document.getElementById('sourceContextMenu');
    const sourceId = ctxMenu?.dataset.sourceId;
    const action   = btn.dataset.ctxAction;
    ctxMenu.style.display = 'none';

    if (action === 'tag-important') await setSourceTag(sourceId, 'important');
    if (action === 'tag-reference') await setSourceTag(sourceId, 'reference');
    if (action === 'tag-review')    await setSourceTag(sourceId, 'review');
    if (action === 'tag-draft')     await setSourceTag(sourceId, 'draft');
    if (action === 'preview')       await openDocumentViewer(sourceId);
    if (action === 'remove')        await removeSource(sourceId);
  });

  // === Split view & Focus mode buttons ===
  document.getElementById('splitViewBtn')?.addEventListener('click',   toggleSplitView);
  document.getElementById('focusModeBtn')?.addEventListener('click',   toggleFocusMode);
  document.getElementById('themeToggle')?.addEventListener('click',    toggleTheme);
  document.getElementById('sidebarToggle')?.addEventListener('click',  toggleSidebar);

  // === Onboarding tour ===
  document.getElementById('onboardingPrev')?.addEventListener('click', () =>
    showOnboardingStep(STATE.onboardingStep - 1)
  );
  document.getElementById('onboardingNext')?.addEventListener('click', () =>
    showOnboardingStep(STATE.onboardingStep + 1)
  );
  document.getElementById('onboardingSkip')?.addEventListener('click', finishOnboardingTour);

  // Re-open tour from settings
  document.getElementById('restartTourBtn')?.addEventListener('click', () => {
    closeOverlay('overlaySettings');
    startOnboardingTour();
  });

  // === Search results click-through ===
  document.getElementById('sourceSearchResults')?.addEventListener('click', async (e) => {
    const item = e.target.closest('.search-result-item');
    if (item) await openDocumentViewer(item.dataset.sourceId);
  });

  // === Feedback panel ===
  document.getElementById('feedbackPanel')?.addEventListener('click', (e) => {
    const btn    = e.target.closest('[data-reason]');
    const closeBtn = e.target.closest('.feedback-close');
    const panel  = document.getElementById('feedbackPanel');

    if (btn && panel) {
      submitFeedback(btn.dataset.reason, panel.dataset.msgId || '');
    }
    if (closeBtn && panel) panel.style.display = 'none';
  });

  // === PWA install banner ===
  document.getElementById('pwaInstallBtn')?.addEventListener('click', () => {
    if (STATE._pwaInstallPrompt) {
      STATE._pwaInstallPrompt.prompt();
      STATE._pwaInstallPrompt.userChoice.then(choice => {
        if (choice.outcome === 'accepted') showToast('✅ Đã cài đặt ứng dụng!', 'success');
        STATE._pwaInstallPrompt = null;
        hidePWABanner();
      });
    }
  });

  document.getElementById('pwaDismissBtn')?.addEventListener('click', hidePWABanner);

  // === All overlay close buttons ===
  document.querySelectorAll('[data-close-overlay]').forEach(btn => {
    btn.addEventListener('click', () => {
      const overlayId = btn.closest('.overlay')?.id;
      if (overlayId) closeOverlay(overlayId);
    });
  });

  // === Close overlay on backdrop click ===
  document.querySelectorAll('.overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !overlay.classList.contains('no-backdrop-close')) {
        closeOverlay(overlay.id);
      }
    });
  });

  // === Nav tabs ===
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // === Bottom navigation (mobile) ===
  document.querySelectorAll('[data-bottom-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.bottomTab));
  });

  // === History overlay ===
  document.getElementById('openHistoryBtn')?.addEventListener('click', () => {
    renderFullHistory();
    openOverlay('overlayHistory');
  });

  // === Document viewer controls ===
  document.getElementById('docViewerCloseBtn')?.addEventListener('click', () =>
    closeOverlay('overlayDocViewer')
  );

  // === STT (Speech-to-Text) file input ===
  document.getElementById('sttFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSttFile(file);
    e.target.value = '';
  });

  document.getElementById('sttUploadBtn')?.addEventListener('click', () =>
    document.getElementById('sttFileInput')?.click()
  );

  // === Compare (T-AI2) ===
  document.getElementById('startCompareBtn')?.addEventListener('click', runDocumentComparison);

  // === Glossary overlay ===
  document.getElementById('glossarySearchInput')?.addEventListener('input',
    debounce((e) => filterGlossary(e.target.value), 300)
  );

  document.getElementById('exportGlossaryBtn')?.addEventListener('click', exportGlossary);

  // === Citation generator ===
  document.getElementById('copyCitationsBtn')?.addEventListener('click', () => {
    const el = document.getElementById('citationResult');
    if (el) { copyToClipboard(el.innerText); showToast('📋 Đã sao chép trích dẫn!', 'success'); }
  });

  // === Sentiment analyzer ===
  document.getElementById('runSentimentBtn')?.addEventListener('click', runSentimentAnalysis);

  console.log(`[TTD] Event listeners attached — v${APP_VERSION}`);
}

// ===================================================================
// SECTION 37: KEYBOARD SHORTCUTS (T-U3)
// ===================================================================

/**
 * Register all global keyboard shortcuts.
 */
function registerKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag      = document.activeElement?.tagName?.toLowerCase();
    const isInput  = ['input', 'textarea', 'select'].includes(tag);
    const ctrl     = e.ctrlKey || e.metaKey;
    const alt      = e.altKey;

    // === Always-active shortcuts ===

    // Esc — close top overlay / exit focus mode
    if (e.key === 'Escape') {
      if (STATE.focusMode) { toggleFocusMode(); return; }
      const openOverlays = document.querySelectorAll('.overlay.open');
      if (openOverlays.length > 0) {
        const lastOverlay = openOverlays[openOverlays.length - 1];
        if (!lastOverlay.classList.contains('no-backdrop-close')) {
          closeOverlay(lastOverlay.id);
        }
      }
    }

    // Ctrl+P — Command Palette
    if (ctrl && e.key === 'p') {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    // Ctrl+/ or ? — Shortcuts cheatsheet
    if ((ctrl && e.key === '/') || (e.key === '?' && !isInput)) {
      e.preventDefault();
      openOverlay('overlayShortcuts');
      return;
    }

    // Skip remaining shortcuts when typing in inputs
    if (isInput) return;

    // Ctrl+N — New notebook
    if (ctrl && e.key === 'n') {
      e.preventDefault();
      createNotebook();
      return;
    }

    // Ctrl+E — Export chat
    if (ctrl && e.key === 'e') {
      e.preventDefault();
      exportChat('md');
      return;
    }

    // Ctrl+\ — Split view
    if (ctrl && e.key === '\\') {
      e.preventDefault();
      toggleSplitView();
      return;
    }

    // Ctrl+, — Settings
    if (ctrl && e.key === ',') {
      e.preventDefault();
      populateSettings();
      openOverlay('overlaySettings');
      return;
    }

    // Alt+F — Flashcards
    if (alt && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      runQuickAction('flashcard');
      return;
    }

    // Alt+P — Podcast
    if (alt && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      openOverlay('overlayPodcast');
      return;
    }

    // Alt+S — Summarize
    if (alt && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      runQuickAction('summary');
      return;
    }

    // Alt+Q — Quiz
    if (alt && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      runQuickAction('quiz');
      return;
    }

    // Ctrl+D — Toggle dark mode
    if (ctrl && e.key === 'd') {
      e.preventDefault();
      toggleTheme();
      return;
    }

    // Ctrl+F — Focus search in source panel
    if (ctrl && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('sourceSearch');
      if (searchInput) { searchInput.focus(); searchInput.select(); }
      return;
    }

    // Ctrl+Enter — Send chat (when chat input is focused)
    if (ctrl && e.key === 'Enter') {
      e.preventDefault();
      handleSendChat();
      return;
    }

    // Ctrl+Shift+N — Add new text source
    if (ctrl && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      openOverlay('overlayAddText');
      return;
    }

    // Ctrl+Shift+P — Prompt library
    if (ctrl && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      renderPromptLibrary();
      openOverlay('overlayPromptLibrary');
      return;
    }
  });
}

// ===================================================================
// SECTION 38: SEND CHAT HANDLER
// ===================================================================

/**
 * Handle the send chat action (from button or Enter key).
 * Reads the chat input, validates, then calls sendChat().
 */
function handleSendChat() {
  const chatInput = document.getElementById('chatInput');
  if (!chatInput) return;

  const text = chatInput.value.trim();
  if (!text)  return;

  chatInput.value  = '';
  chatInput.style.height = 'auto';

  // Hide suggestion chips after sending
  const chipsEl = document.getElementById('suggestedChips');
  if (chipsEl) chipsEl.style.display = 'none';

  sendChat(text);
}

// ===================================================================
// SECTION 39: DOCUMENT COMPARISON (T-AI2)
// ===================================================================

/**
 * Run multi-source document comparison.
 */
async function runDocumentComparison() {
  try {
    if (!STATE.apiKey) { showToast('⚠️ Vui lòng nhập API Key.', 'warning'); return; }
    if (STATE.sources.length < 2) {
      showToast('⚠️ Cần ít nhất 2 nguồn để so sánh.', 'warning');
      return;
    }

    const resultEl = document.getElementById('compareResult');
    if (resultEl) resultEl.innerHTML = `
      <div class="skeleton skeleton-block"></div>
      <div class="skeleton skeleton-block"></div>`;

    const sourcesSummary = STATE.sources
      .map(s => `[Nguồn ${s.index}: ${s.name}]\n${(s.content || '').slice(0, 2000)}`)
      .join('\n\n---\n\n');

    const prompt = `So sánh toàn bộ các tài liệu sau và trả về bảng so sánh Markdown chi tiết.
Bao gồm: điểm giống, điểm khác, điểm mạnh/yếu từng tài liệu.
Dùng bảng Markdown với rows là tiêu chí, columns là tên tài liệu.

Tài liệu:\n${sourcesSummary}`;

    const result = await callGemini([{ text: prompt }]);

    if (resultEl) {
      resultEl.innerHTML = md2html(result);
      // Render CSS radar chart after comparison
      renderComparisonRadar(STATE.sources.length);
    }

    showToast('✅ Đã hoàn thành so sánh!', 'success');
  } catch (err) {
    console.error('[runDocumentComparison]', err);
    showToast(`❌ ${err.message}`, 'error');
  }
}

/**
 * Render a simple CSS-based radar chart for document comparison.
 * @param {number} sourceCount
 */
function renderComparisonRadar(sourceCount) {
  const radarEl = document.getElementById('comparisonRadar');
  if (!radarEl || sourceCount < 2) return;

  // Generate random scores for demo — in production, parse from AI result
  const categories = ['Độ sâu', 'Rõ ràng', 'Bằng chứng', 'Cấu trúc', 'Cập nhật'];
  const colors     = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626'];

  const scores = STATE.sources.slice(0, 5).map(() =>
    categories.map(() => Math.floor(Math.random() * 40 + 60))
  );

  radarEl.innerHTML = `
    <h4 class="radar-title">📊 Biểu đồ so sánh tổng quan</h4>
    <div class="radar-legend">
      ${STATE.sources.slice(0, 5).map((s, i) => `
        <span class="radar-legend-item" style="color:${colors[i]}">
          ● ${escapeHtml(s.name.slice(0, 20))}
        </span>`).join('')}
    </div>
    <div class="radar-bars">
      ${categories.map((cat, ci) => `
        <div class="radar-row">
          <span class="radar-cat">${cat}</span>
          <div class="radar-bar-group">
            ${scores.map((srcScores, si) => `
              <div class="radar-bar" style="width:${srcScores[ci]}%;background:${colors[si]}"
                   title="${STATE.sources[si]?.name}: ${srcScores[ci]}%">
              </div>`).join('')}
          </div>
          <span class="radar-avg">${Math.round(scores.reduce((s, r) => s + r[ci], 0) / scores.length)}%</span>
        </div>`).join('')}
    </div>`;
}

// ===================================================================
// SECTION 40: FULL HISTORY VIEWER (T-AI1)
// ===================================================================

/**
 * Render the full chat history in the History overlay.
 */
function renderFullHistory() {
  const historyEl = document.getElementById('fullHistoryContainer');
  if (!historyEl) return;

  if (STATE.chatHistory.length === 0) {
    historyEl.innerHTML = `<div class="empty-state"><p>Chưa có lịch sử trò chuyện nào.</p></div>`;
    return;
  }

  historyEl.innerHTML = '';

  // Show compressed summary if exists
  if (STATE.chatSummary) {
    const summaryEl = document.createElement('div');
    summaryEl.className = 'history-summary-block';
    summaryEl.innerHTML = `
      <div class="history-summary-label">📋 Lịch sử đã nén</div>
      <div class="history-summary-text">${md2html(STATE.chatSummary)}</div>`;
    historyEl.appendChild(summaryEl);
  }

  STATE.chatHistory.forEach((msg, index) => {
    const msgEl      = document.createElement('div');
    msgEl.className  = `history-item history-${msg.role}`;
    const role       = msg.role === 'user' ? '👤 Bạn' : '🤖 AI';
    const text       = msg.parts[0]?.text || '';
    msgEl.innerHTML  = `
      <div class="history-role">${role} <span class="history-index">#${index + 1}</span></div>
      <div class="history-text">${msg.role === 'model' ? md2html(text) : escapeHtml(text)}</div>`;
    historyEl.appendChild(msgEl);
  });
}

// ===================================================================
// SECTION 41: GLOSSARY BUILDER (T-AI4)
// ===================================================================

/**
 * State for glossary.
 */
const GLOSSARY_STATE = {
  terms    : [],
  filtered : []
};

/**
 * Generate glossary from source documents.
 */
async function generateGlossary() {
  try {
    if (!STATE.apiKey)             { showToast('⚠️ Vui lòng nhập API Key.', 'warning'); return; }
    if (STATE.sources.length === 0){ showToast('⚠️ Vui lòng thêm nguồn.', 'warning'); return; }

    openOverlay('overlayGlossary');
    const glossaryEl = document.getElementById('glossaryContent');
    if (glossaryEl) glossaryEl.innerHTML = `<div class="skeleton skeleton-block"></div>`;

    const sourceText = STATE.sources
      .map(s => `${s.name}:\n${(s.content || '').slice(0, 3000)}`)
      .join('\n\n');

    const prompt = `Từ tài liệu sau, trích xuất tất cả thuật ngữ chuyên ngành, khái niệm quan trọng, tên riêng.
Trả về JSON: {"terms": [{"term": "Thuật ngữ", "definition": "Định nghĩa ngắn gọn", "category": "Loại"}]}
Sắp xếp theo bảng chữ cái. Chỉ trả về JSON.
Tài liệu:\n${sourceText}`;

    const result    = await callGemini([{ text: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Không thể phân tích thuật ngữ.');

    const { terms } = JSON.parse(jsonMatch[0]);
    GLOSSARY_STATE.terms    = terms || [];
    GLOSSARY_STATE.filtered = [...GLOSSARY_STATE.terms];
    renderGlossary(GLOSSARY_STATE.terms);

    showToast(`✅ Đã trích xuất ${terms.length} thuật ngữ!`, 'success');
  } catch (err) {
    console.error('[generateGlossary]', err);
    showToast(`❌ ${err.message}`, 'error');
  }
}

/**
 * Render glossary terms in the overlay.
 * @param {Array} terms
 */
function renderGlossary(terms) {
  const glossaryEl = document.getElementById('glossaryContent');
  if (!glossaryEl) return;

  if (!terms || terms.length === 0) {
    glossaryEl.innerHTML = `<p class="empty-state">Không có thuật ngữ nào.</p>`;
    return;
  }

  // Group by first letter
  const groups = {};
  terms.forEach(t => {
    const letter = (t.term || 'Khác')[0].toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(t);
  });

  glossaryEl.innerHTML = Object.entries(groups).sort().map(([letter, groupTerms]) => `
    <div class="glossary-group">
      <div class="glossary-letter">${letter}</div>
      ${groupTerms.map(t => `
        <div class="glossary-term">
          <span class="term-name">${escapeHtml(t.term)}</span>
          ${t.category ? `<span class="term-category">${escapeHtml(t.category)}</span>` : ''}
          <p class="term-def">${escapeHtml(t.definition || '')}</p>
        </div>`).join('')}
    </div>`).join('');
}

/**
 * Filter glossary by search query.
 * @param {string} query
 */
function filterGlossary(query) {
  const filtered = query
    ? GLOSSARY_STATE.terms.filter(t =>
        t.term.toLowerCase().includes(query.toLowerCase()) ||
        t.definition?.toLowerCase().includes(query.toLowerCase())
      )
    : GLOSSARY_STATE.terms;
  GLOSSARY_STATE.filtered = filtered;
  renderGlossary(filtered);
}

/**
 * Export glossary to TXT.
 */
function exportGlossary() {
  const content = GLOSSARY_STATE.terms
    .map(t => `${t.term}\n  ${t.definition}\n`)
    .join('\n');
  downloadText(content, 'glossary-ttd.txt', 'text/plain');
  showToast('✅ Đã xuất từ điển!', 'success');
}

// ===================================================================
// SECTION 42: SENTIMENT ANALYZER (T-AI6)
// ===================================================================

/**
 * Run sentiment & tone analysis on source documents.
 */
async function runSentimentAnalysis() {
  try {
    if (!STATE.apiKey)              { showToast('⚠️ Vui lòng nhập API Key.', 'warning'); return; }
    if (STATE.sources.length === 0) { showToast('⚠️ Vui lòng thêm nguồn.', 'warning'); return; }

    const resultEl = document.getElementById('sentimentResult');
    if (resultEl) resultEl.innerHTML = `<div class="skeleton skeleton-block"></div>`;

    openOverlay('overlaySentiment');

    const sourceText = STATE.sources
      .map(s => `${s.name}:\n${(s.content || '').slice(0, 3000)}`)
      .join('\n\n');

    const prompt = `Phân tích cảm xúc và tone của tài liệu sau. Trả về JSON:
{
  "overallSentiment": "positive|negative|neutral",
  "sentimentScore": 75,
  "tone": ["formal", "academic"],
  "emotionalWords": ["từ 1", "từ 2", "từ 3", "từ 4", "từ 5"],
  "paragraphSentiments": [
    {"text": "trích đoạn ngắn", "sentiment": "positive|negative|neutral", "score": 80}
  ],
  "summary": "Nhận xét tổng quan về cảm xúc và tone"
}
Chỉ trả về JSON.
Tài liệu:\n${sourceText}`;

    const result    = await callGemini([{ text: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Không thể phân tích cảm xúc.');

    const data = JSON.parse(jsonMatch[0]);
    renderSentimentResult(data);
  } catch (err) {
    console.error('[runSentimentAnalysis]', err);
    showToast(`❌ ${err.message}`, 'error');
  }
}

/**
 * Render sentiment analysis results.
 * @param {Object} data
 */
function renderSentimentResult(data) {
  const resultEl = document.getElementById('sentimentResult');
  if (!resultEl) return;

  const sentimentColor = {
    positive: 'var(--color-success)',
    negative: 'var(--color-error)',
    neutral : 'var(--color-warning)'
  };
  const sentimentLabel = {
    positive: '😊 Tích cực',
    negative: '😔 Tiêu cực',
    neutral : '😐 Trung tính'
  };

  const score   = data.sentimentScore || 50;
  const color   = sentimentColor[data.overallSentiment] || sentimentColor.neutral;
  const label   = sentimentLabel[data.overallSentiment] || sentimentLabel.neutral;

  resultEl.innerHTML = `
    <div class="sentiment-overview">
      <div class="sentiment-gauge">
        <svg viewBox="0 0 120 70" class="gauge-svg">
          <path d="M 10 60 A 50 50 0 0 1 110 60" stroke="#e5e7eb" stroke-width="10" fill="none"/>
          <path d="M 10 60 A 50 50 0 0 1 110 60" stroke="${color}" stroke-width="10" fill="none"
                stroke-dasharray="${score * 1.57} 157" stroke-linecap="round"/>
          <text x="60" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="${color}">${score}%</text>
        </svg>
        <div class="gauge-label">${label}</div>
      </div>
      <div class="sentiment-details">
        <div class="tone-tags">
          ${(data.tone || []).map(t => `<span class="tone-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <p class="sentiment-summary">${escapeHtml(data.summary || '')}</p>
      </div>
    </div>

    <div class="word-cloud">
      <h4>💬 Từ cảm xúc nổi bật</h4>
      <div class="word-cloud-items">
        ${(data.emotionalWords || []).map((w, i) => `
          <span class="word-cloud-item" style="font-size:${1.8 - i * 0.15}rem;opacity:${1 - i * 0.1}">${escapeHtml(w)}</span>
        `).join('')}
      </div>
    </div>

    ${data.paragraphSentiments?.length > 0 ? `
    <div class="paragraph-sentiments">
      <h4>📊 Phân tích từng đoạn</h4>
      ${data.paragraphSentiments.slice(0, 5).map(p => `
        <div class="para-sent-item ${p.sentiment}">
          <div class="para-sent-bar" style="width:${p.score}%;background:${sentimentColor[p.sentiment]}"></div>
          <span class="para-sent-text">${escapeHtml((p.text || '').slice(0, 80))}...</span>
          <span class="para-sent-score">${p.score}%</span>
        </div>`).join('')}
    </div>` : ''}`;
}

// ===================================================================
// SECTION 43: STT FILE PROCESSING
// ===================================================================

/**
 * Process an audio/video file for Speech-to-Text transcription.
 * @param {File} file
 */
async function processSttFile(file) {
  try {
    if (!STATE.apiKey) { showToast('⚠️ Vui lòng nhập API Key.', 'warning'); return; }

    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
      'audio/mp4', 'audio/flac', 'video/webm', 'video/mp4'
    ];

    if (!allowedTypes.includes(file.type)) {
      showToast('⚠️ Định dạng file không được hỗ trợ. Dùng MP3, WAV, OGG, WEBM.', 'warning');
      return;
    }

    showToast(`⏳ Đang phiên âm: ${file.name}...`, 'info', 8000);

    const sttResultEl = document.getElementById('sttResult');
    if (sttResultEl) sttResultEl.innerHTML = `<div class="skeleton skeleton-block"></div>`;

    const base64   = await fileToBase64(file);
    const prompt   = `Phiên âm toàn bộ nội dung audio/video này sang văn bản tiếng Việt.
Định dạng: đánh dấu thời gian khi có thể, phân đoạn theo người nói nếu có nhiều giọng.
Cuối cùng thêm phần "TÓM TẮT:" tóm tắt nội dung chính trong 3-5 câu.`;

    const result = await callGemini([
      { text: prompt },
      { inlineData: { mimeType: file.type, data: base64 } }
    ]);

    if (sttResultEl) {
      sttResultEl.innerHTML = md2html(result);
      sttResultEl.style.display = 'block';
    }

    // Show STT action buttons
    const sttActionsEl = document.getElementById('sttActions');
    if (sttActionsEl) sttActionsEl.style.display = 'flex';

    // Store raw text for further use
    sttActionsEl?.setAttribute('data-stt-text', result);

    showToast(`✅ Phiên âm hoàn tất: ${file.name}`, 'success');
  } catch (err) {
    console.error('[processSttFile]', err);
    showToast(`❌ ${err.message}`, 'error');
  }
}

// ===================================================================
// SECTION 44: SOURCE CONTEXT MENU (T-U5)
// ===================================================================

/**
 * Show the source right-click context menu.
 * @param {MouseEvent} event
 * @param {string}     sourceId
 */
function showSourceContextMenu(event, sourceId) {
  const menu = document.getElementById('sourceContextMenu');
  if (!menu) return;

  menu.dataset.sourceId = sourceId;
  menu.style.display    = 'block';
  menu.style.top        = `${event.clientY}px`;
  menu.style.left       = `${Math.min(event.clientX, window.innerWidth - 180)}px`;
}

/**
 * Set a color tag on a source.
 * @param {string} sourceId
 * @param {string} tag — 'important' | 'reference' | 'review' | 'draft'
 */
async function setSourceTag(sourceId, tag) {
  const source = STATE.sources.find(s => s.id === sourceId);
  if (!source) return;

  if (source.tags.includes(tag)) {
    source.tags = source.tags.filter(t => t !== tag);
  } else {
    source.tags = [...source.tags.filter(t => t !== tag), tag];
  }

  await persistSources();
  renderSources();
  showToast(`🏷️ Tag đã cập nhật.`, 'success');
}

// ===================================================================
// SECTION 45: PWA SUPPORT (T-N10)
// ===================================================================

/**
 * Initialize PWA install prompt capture.
 */
function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    STATE._pwaInstallPrompt = e;

    // Show banner after short delay
    const visitCount = parseInt(localStorage.getItem('ttd_visit_count') || '0', 10) + 1;
    localStorage.setItem('ttd_visit_count', String(visitCount));

    if (visitCount >= 2 && !localStorage.getItem('ttd_pwa_dismissed')) {
      setTimeout(showPWABanner, 3000);
    }
  });

  window.addEventListener('appinstalled', () => {
    STATE._pwaInstallPrompt = null;
    hidePWABanner();
    showToast('✅ TuongTanDigital-AI đã được cài đặt!', 'success', 5000);
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }
}

/**
 * Show the PWA install banner.
 */
function showPWABanner() {
  const banner = document.getElementById('pwaBanner');
  if (banner) banner.classList.add('visible');
}

/**
 * Hide and dismiss the PWA install banner.
 */
function hidePWABanner() {
  const banner = document.getElementById('pwaBanner');
  if (banner) banner.classList.remove('visible');
  localStorage.setItem('ttd_pwa_dismissed', '1');
}

// ===================================================================
// SECTION 46: MIND MAP INTERACTION (Pan & Zoom)
// ===================================================================

/**
 * Initialize pan & zoom interaction for the SVG mind map.
 */
function initMindMapInteraction() {
  const container = document.getElementById('mindMapContainer');
  if (!container) return;

  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;
  let translateX = 0;
  let translateY = 0;
  let scale      = 1;

  const applyTransform = () => {
    const svg = container.querySelector('.mind-map-svg');
    if (svg) svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  };

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    scale = Math.min(Math.max(scale - e.deltaY * 0.001, 0.3), 3);
    applyTransform();
  }, { passive: false });

  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.mind-node')) return;
    isPanning = true;
    startPanX = e.clientX - translateX;
    startPanY = e.clientY - translateY;
    container.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    translateX = e.clientX - startPanX;
    translateY = e.clientY - startPanY;
    applyTransform();
  });

  document.addEventListener('mouseup', () => {
    isPanning = false;
    container.style.cursor = 'default';
  });

  // Mind map zoom buttons
  document.getElementById('mindMapZoomIn')?.addEventListener('click',  () => { scale = Math.min(scale + 0.2, 3); applyTransform(); });
  document.getElementById('mindMapZoomOut')?.addEventListener('click', () => { scale = Math.max(scale - 0.2, 0.3); applyTransform(); });
  document.getElementById('mindMapReset')?.addEventListener('click',   () => { scale = 1; translateX = 0; translateY = 0; applyTransform(); });

  // Node click tooltip
  container.addEventListener('click', (e) => {
    const node = e.target.closest('.mind-node');
    if (node) showMindMapNodeTooltip(node.dataset.text, e.clientX, e.clientY);
  });
}

/**
 * Show a tooltip for a clicked mind map node.
 * @param {string} text
 * @param {number} x
 * @param {number} y
 */
function showMindMapNodeTooltip(text, x, y) {
  let tooltip = document.getElementById('mindMapTooltip');
  if (!tooltip) {
    tooltip    = document.createElement('div');
    tooltip.id = 'mindMapTooltip';
    tooltip.className = 'mind-map-tooltip';
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = text;
  tooltip.style.left  = `${x + 10}px`;
  tooltip.style.top   = `${y - 30}px`;
  tooltip.style.display = 'block';

  setTimeout(() => { tooltip.style.display = 'none'; }, 3000);
}

// ===================================================================
// SECTION 47: SPLASH SCREEN & LOADING
// ===================================================================

/**
 * Show the app splash/loading screen.
 */
function showSplashScreen() {
  const splash = document.getElementById('splashScreen');
  if (splash) splash.classList.add('visible');
}

/**
 * Hide the splash screen with animation.
 */
function hideSplashScreen() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    splash.classList.add('hiding');
    setTimeout(() => {
      splash.classList.remove('visible', 'hiding');
    }, 600);
  }
}

/**
 * Show skeleton loading for source list.
 */
function showSourceSkeleton() {
  const listEl = document.getElementById('sourceList');
  if (!listEl) return;
  listEl.innerHTML = Array(3).fill(`
    <div class="source-item skeleton-item">
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-text"></div>
    </div>`).join('');
}

// ===================================================================
// SECTION 48: INITAPP — MAIN BOOTSTRAP
// ===================================================================

/**
 * Main application bootstrap function.
 * Called once when the DOM is fully loaded.
 */
async function initApp() {
  console.log(`🚀 TuongTanDigital-AI v${APP_VERSION} — Initializing...`);

  try {
    // 1. Show splash
    showSplashScreen();

    // 2. Open IndexedDB
    STATE.dbRef    = await openDatabase();
    STATE.idbReady = true;
    console.log('[IDB] Database opened successfully.');

    // 3. Restore state from IDB
    showSourceSkeleton();
    await restoreStateFromIDB();

    // 4. Apply theme, font, font-size
    applyTheme(STATE.theme);
    applyFont(STATE.selectedFont);
    applyFontSize(STATE.fontSize);

    // 5. Try to restore Google session
    const hasSession = restoreGoogleSession();
    if (hasSession) {
      hideLoginScreen();
      updateUserUI();
      console.log(`[Auth] Session restored: ${STATE.googleUser.email}`);
    } else {
      // Initialize Google Auth SDK
      if (typeof google !== 'undefined' && google.accounts) {
        initGoogleAuth();
      } else {
        // SDK not yet loaded — will be called by callback in HTML
        window.onGoogleLibraryLoad = initGoogleAuth;
      }
    }

    // 6. Validate stored license key (if any)
    if (STATE.licenseKey) {
      const licResult = await validateLicenseKey(STATE.licenseKey);
      applyLicense(licResult);
    } else {
      updateLicenseUI();
    }

    // 7. Render UI
    renderNotebookList();
    renderSources();
    renderChatHistory();
    renderPinnedNotes();
    loadBrowserVoices();
    loadGeminiVoices();

    // 8. Restore persona button label
    const persona    = PERSONAS.find(p => p.id === STATE.selectedPersona) || PERSONAS[0];
    const personaBtn = document.getElementById('personaSelectorBtn');
    if (personaBtn)  personaBtn.textContent = persona.label;

    // 9. Restore sidebar state
    const sidebar = document.getElementById('notebookSidebar');
    if (sidebar) sidebar.classList.toggle('collapsed', !STATE.sidebarOpen);

    // 10. Initialize drag-to-resize
    initResizablePanel();

    // 11. Register keyboard shortcuts
    registerKeyboardShortcuts();

    // 12. Attach all event listeners
    attachEventListeners();

    // 13. Initialize PWA
    initPWA();

    // 14. Auto-save session every 60 seconds
    setInterval(async () => {
      await persistSources();
      await persistChatHistory();
      await persistSettings();
    }, 60000);

    // 15. Show onboarding tour if first time
    if (!STATE.onboardingDone && hasSession) {
      setTimeout(startOnboardingTour, 1500);
    }

    // 16. Restore TTS engine toggle UI
    document.querySelectorAll('[data-tts-engine]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ttsEngine === STATE.ttsEngine);
    });
    const browserPanel = document.getElementById('browserTTSPanel');
    const geminiPanel  = document.getElementById('geminiTTSPanel');
    if (browserPanel) browserPanel.style.display = STATE.ttsEngine === 'browser' ? 'block' : 'none';
    if (geminiPanel)  geminiPanel.style.display  = STATE.ttsEngine === 'gemini'  ? 'block' : 'none';

    // 17. Generate suggested questions if sources exist
    if (STATE.sources.length > 0 && STATE.apiKey) {
      setTimeout(generateSuggestedQuestions, 2000);
    }

    // 18. Hide splash
    setTimeout(hideSplashScreen, 800);

    // 19. Show restore notification if had data
    if (STATE.sources.length > 0 || STATE.chatHistory.length > 0) {
      showToast(
        `✅ Đã khôi phục: ${STATE.sources.length} nguồn, ${STATE.chatHistory.length} tin nhắn.`,
        'success',
        4000
      );
    }

    console.log(`✅ TuongTanDigital-AI v${APP_VERSION} — Ready!`);
  } catch (err) {
    console.error('[initApp] Critical error:', err);
    hideSplashScreen();
    showToast('❌ Lỗi khởi động ứng dụng. Vui lòng tải lại trang.', 'error', 8000);
  }
}

// ===================================================================
// SECTION 49: DOM READY — BOOTSTRAP TRIGGER
// ===================================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ===================================================================
// END OF app.js — Part 3/5
// TuongTanDigital-AI v3.0 | © 2025 TuongTanDigital
// Core: State, Config, IDB, Auth, License, API, Notebook,
//       Chat, TTS, STT, Flashcard, Quiz, Podcast, MindMap,
//       Glossary, Sentiment, Comparison, PWA, Events, Init
// ===================================================================
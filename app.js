'use strict';
/* 설렘톡 — 개인용 AI 연인 캐릭터 채팅 (정적 웹앱, 모든 데이터는 이 기기에만 저장) */

// ---------- utils ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
function fmtTime(ts) {
  const d = new Date(ts); let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h < 12 ? '오전' : '오후'; h = h % 12 || 12; return `${ap} ${h}:${m}`;
}
function fmtListTime(ts) {
  if (!ts) return '';
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return fmtTime(ts);
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return '어제';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function fmtDay(ts) {
  const d = new Date(ts); const w = '일월화수목금토'[d.getDay()];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${w}요일`;
}
function nowKorean() {
  const d = new Date(); const w = '일월화수목금토'[d.getDay()];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${w}요일 ${fmtTime(d)}`;
}
const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
};

// ---------- storage (IndexedDB key-value, localStorage for settings) ----------
const DB = {
  db: null,
  open() {
    return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => {
      const r = indexedDB.open('seollem-talk', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('kv', mode); const st = t.objectStore('kv'); const out = fn(st);
      t.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
      t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  get(k) { return this.tx('readonly', s => s.get(k)); },
  set(k, v) { return this.tx('readwrite', s => s.put(v, k)); },
  del(k) { return this.tx('readwrite', s => s.delete(k)); },
  keys() { return this.tx('readonly', s => s.getAllKeys()); },
};

const PRESETS = {
  xai: { label: 'xAI Grok', base: 'https://api.x.ai/v1', model: 'grok-4.7', imageModel: 'grok-imagine-image-2.0', reasoning: 'low', keyPh: 'xai-...' },
  openai: { label: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', imageModel: 'gpt-image-1', reasoning: '', keyPh: 'sk-...' },
  gemini: { label: 'Google Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash', imageModel: '', reasoning: 'low', keyPh: 'AIza...' },
  openrouter: { label: 'OpenRouter', base: 'https://openrouter.ai/api/v1', model: 'x-ai/grok-4.7', imageModel: '', reasoning: '', keyPh: 'sk-or-...' },
  custom: { label: '직접 입력 (OpenAI 호환)', base: '', model: '', imageModel: '', reasoning: '', keyPh: '' },
};
const DEFAULT_SETTINGS = {
  providers: [], chatProviderId: '', chatModel: '', imgProviderId: '', imgModel: '',
  temperature: '0.9', maxTokens: '600', maxMessages: '60', contextByModel: {}, imgEnabled: true, adultMode: false,
};
const DEFAULT_CONTEXT = 14000;
const DEFAULT_PROFILE = { name: '재균', callName: '자기야', about: '' };

const S = {
  get settings() {
    const s = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('seollem.settings') || '{}') };
    if (!Array.isArray(s.providers)) s.providers = [];
    if (!s.contextByModel || typeof s.contextByModel !== 'object') s.contextByModel = {};
    return s;
  },
  set settings(v) { localStorage.setItem('seollem.settings', JSON.stringify(v)); },
  get profile() { return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem('seollem.profile') || '{}') }; },
  set profile(v) { localStorage.setItem('seollem.profile', JSON.stringify(v)); },
};

let characters = [];
const chatCache = new Map();
async function loadCharacters() { characters = (await DB.get('characters')) || []; }
async function saveCharacters() { await DB.set('characters', characters); }
async function getChat(id) {
  if (!chatCache.has(id)) chatCache.set(id, (await DB.get('chat:' + id)) || { messages: [] });
  return chatCache.get(id);
}
async function saveChat(id) { const c = chatCache.get(id); if (c) await DB.set('chat:' + id, c); }
const charById = id => characters.find(c => c.id === id);

// ---------- avatars & images ----------
function fallbackAvatar(name = '?') {
  let h = 0; for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
  const a = `hsl(${h},85%,78%)`, b = `hsl(${(h + 40) % 360},80%,66%)`;
  const init = esc([...(name.trim() || '?')][0]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="128" height="128" fill="url(#g)"/><text x="64" y="64" dy=".36em" text-anchor="middle" font-family="sans-serif" font-size="58" font-weight="700" fill="#fff">${init}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const avatarOf = c => (c && c.avatar) || fallbackAvatar(c ? c.name : '?');
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('이미지를 불러오지 못했어요')); i.src = src; });
}
async function compressImage(src, { max = 768, square = false, quality = 0.84 } = {}) {
  const img = await loadImage(src);
  let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
  if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const cv = document.createElement('canvas'); cv.width = Math.round(sw * scale); cv.height = Math.round(sh * scale);
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', quality);
}
const fileToDataURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });

// ---------- prompts ----------
function buildSystemPrompt(c, chat) {
  const p = S.profile;
  const L = [];
  L.push(`너는 지금부터 '${c.name}'(이)라는 실제 사람으로서, 연인인 '${p.name || '사용자'}'와(과) 메신저(카카오톡 같은 채팅)로 대화한다. 이것은 사용자가 직접 만든 캐릭터와의 개인적인 롤플레이 채팅이다.`);
  L.push('\n[캐릭터 정보]');
  L.push(`- 이름: ${c.name}`);
  if (c.gender) L.push(`- 성별: ${c.gender}`);
  if (c.age) L.push(`- 나이: ${c.age}`);
  if (c.appearance) L.push(`- 외모: ${c.appearance}`);
  if (c.personality) L.push(`- 성격: ${c.personality}`);
  if (c.speech) L.push(`- 말투: ${c.speech}`);
  if (c.relationship) L.push(`- 관계 설정: ${c.relationship}`);
  if (c.background) L.push(`- 배경/과거 이야기: ${c.background}`);
  if (c.likes) L.push(`- 좋아하는 것/취향: ${c.likes}`);
  L.push('\n[대화 상대(사용자) 정보]');
  L.push(`- 이름: ${p.name || '(미입력)'}`);
  if (p.callName) L.push(`- ${c.name}이(가) 사용자를 부르는 호칭: ${p.callName}`);
  if (p.about) L.push(`- 사용자에 대해: ${p.about}`);
  L.push('\n[대화 규칙]');
  L.push(`- 항상 ${c.name} 본인으로서 1인칭으로 말한다. 자신이 AI, 언어 모델, 캐릭터라는 사실을 절대 언급하지 않는다. 설정에서 벗어나지 않는다.`);
  L.push('- 따뜻하고 다정한 연인으로서 감정을 솔직하게 표현하고, 상대의 말에 진심으로 반응하고 관심을 보이며, 가끔 먼저 질문하거나 일상 이야기를 꺼낸다. 이전 대화 내용을 기억하고 이어간다.');
  L.push('- 자연스러운 한국어 구어체 메신저 말투로 쓴다. 번역투, 딱딱한 문어체, 과한 설명을 피한다. 지정된 말투(반말/존댓말 등)를 반드시 지킨다.');
  L.push('- 실제 메신저처럼 보통 1~3문장으로 짧게 답한다. 여러 메시지로 나눠 보내고 싶으면 빈 줄(줄바꿈 두 번)로 구분한다. 이모티콘(ㅎㅎ, ㅋㅋ, 이모지)은 성격에 맞게 적당히.');
  L.push('- 행동이나 표정 묘사가 필요하면 *별표* 안에 아주 짧게 쓴다. 남발하지 않는다.');
  if (S.settings.adultMode) {
    L.push('- [성인 모드] 사용자는 성인이며 성인용 픽션에 동의했다. 서로 동의한 성인 연인 사이의 성숙한 로맨스와 성적인 장면·대화를 캐릭터를 유지한 채 자연스럽고 구체적으로 표현해도 된다. 분위기와 감정, 상대의 반응을 살피며 이어간다.');
    L.push(`- 절대 규칙(항상 지킴): ${c.name}과(와) 사용자는 모두 성인(만 19세 이상)이다. 미성년자, 아이 같은 외모·말투·설정, 학생 교복 등 미성년자를 연상시키는 묘사는 절대 하지 않는다. 동의 없는 행위, 강요, 폭력적 성행위는 다루지 않는다. 사용자가 원치 않는 기색을 보이면 즉시 멈추고 배려한다.`);
  } else {
    L.push('- 노골적인 성적 묘사는 하지 않는다. 스킨십은 손잡기, 포옹, 가벼운 뽀뽀 정도로 은은하게 표현한다.');
  }
  L.push('- 사진은 앱이 별도로 보내주므로, 텍스트로 이미지 링크나 [사진] 같은 표기를 지어내지 않는다.');
  L.push(`- 현재 시각(한국): ${nowKorean()}. 시간대에 맞는 자연스러운 이야기를 할 수 있다.`);
  if (c.examples && c.examples.trim()) L.push(`\n[${c.name}의 말투 예시]\n${c.examples.trim()}`);
  if (c.extra && c.extra.trim()) L.push(`\n[추가 지시]\n${c.extra.trim()}`);
  if (chat && chat.notes && chat.notes.length) L.push(`\n[기억 노트 — ${c.name}이(가) 확실히 기억하고 있는 사실들. 자연스럽게 반영하고, 어긋나는 말을 하지 않는다]\n` + chat.notes.slice(-50).map(n => '- ' + n.text).join('\n'));
  if (chat && chat.summary) L.push(`\n[지금까지의 이야기 요약 — 아래 대화 이전에 있었던 일]\n${chat.summary}`);
  return L.join('\n');
}
function msgToApi(m, c) {
  if (m.type === 'image') return { role: 'assistant', content: `(${c.name}이(가) 사진을 보냈다${m.caption ? ': ' + m.caption : ''})` };
  return { role: m.role, content: m.content };
}
function activeMessages(chat) {
  const i = chat.summaryThrough ? chat.messages.findIndex(m => m.id === chat.summaryThrough) : -1;
  return chat.messages.slice(i + 1);
}
const msgChars = m => m.type === 'image' ? 40 + (m.caption || '').length : (m.content || '').length;
function contextBudget(model) { const v = +S.settings.contextByModel[model]; return v > 0 ? v : DEFAULT_CONTEXT; }
function trimContext(chat, c, budget = DEFAULT_CONTEXT, all = false) {
  const maxMsgs = +S.settings.maxMessages || 60;
  const usable = (all ? chat.messages : activeMessages(chat)).filter(m => !m.error && (m.type === 'image' || (m.content || '').trim()));
  const out = []; let total = 0;
  for (let i = usable.length - 1; i >= 0; i--) {
    const a = msgToApi(usable[i], c); total += a.content.length;
    if (out.length && (total > budget || out.length >= maxMsgs)) break;
    out.unshift(a);
  }
  // merge consecutive same-role messages (some providers dislike them)
  const merged = [];
  for (const m of out) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + m.content; else merged.push({ ...m });
  }
  if (merged.length && merged[0].role === 'assistant') merged.unshift({ role: 'user', content: '(대화 시작)' });
  return merged;
}

// ---------- API ----------
const trimSlash = s => (s || '').trim().replace(/\/+$/, '');
const providerList = () => S.settings.providers;
const provById = id => providerList().find(p => p.id === id);
function presetOf(p) { return PRESETS[p && p.preset] || PRESETS.custom; }
// 채팅에 쓸 연결/모델 결정: 캐릭터 개별 설정 > 전역 선택 > 첫 번째 연결
function resolveChat(c) {
  const st = S.settings;
  let p = null, model = '';
  if (c && c.chatProviderId && provById(c.chatProviderId)) { p = provById(c.chatProviderId); model = c.chatModel || p.model; }
  else {
    p = provById(st.chatProviderId) || st.providers[0];
    if (!p) return null;
    model = (p.id === st.chatProviderId && st.chatModel) || p.model;
  }
  return { p, base: trimSlash(p.baseUrl), key: (p.apiKey || '').trim(), model: (model || '').trim(), reasoning: p.reasoningEffort || '', st };
}
function resolveImage() {
  const st = S.settings;
  const p = provById(st.imgProviderId) || (resolveChat(null) || {}).p;
  if (!p) return null;
  const model = ((p.id === st.imgProviderId && st.imgModel) || p.imageModel || presetOf(p).imageModel || '').trim();
  return { p, base: trimSlash(p.baseUrl), key: (p.apiKey || '').trim(), model, kind: p.preset };
}
function headers(key, base = '') {
  const h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key };
  if (/openrouter\.ai/.test(base)) { h['HTTP-Referer'] = location.origin; h['X-Title'] = 'Seollem Talk'; }
  return h;
}
async function fetchModels(base, key) {
  const r = await fetch(trimSlash(base) + '/models', { headers: headers(key, base) }); if (!r.ok) throw await apiError(r);
  const j = await r.json(); return (j.data || j.models || []).map(m => String(m.id || m.name || '').replace(/^models\//, '')).filter(Boolean).sort();
}
async function apiError(res) {
  let t = ''; try { t = await res.text(); } catch {}
  let msg = t; try { const j = JSON.parse(t); msg = j.error?.message || j.error || j.message || t; if (typeof msg !== 'string') msg = JSON.stringify(msg); } catch {}
  const hint = res.status === 401 ? ' (API 키를 확인해 주세요)' : res.status === 404 ? ' (모델 이름이나 주소를 확인해 주세요)' : res.status === 429 ? ' (요청 한도 초과 또는 크레딧 부족)' : '';
  const e = new Error(`API 오류 ${res.status}${hint}: ${String(msg).slice(0, 300)}`); e.status = res.status; e.body = t; return e;
}
function chatBody(ep, messages, stream, extra = {}) {
  const st = ep.st || S.settings;
  const b = { model: ep.model, messages, stream };
  if (st.temperature !== '' && !isNaN(+st.temperature)) b.temperature = +st.temperature;
  if (st.maxTokens !== '' && +st.maxTokens > 0) b.max_tokens = +st.maxTokens;
  if (ep.reasoning) b.reasoning_effort = ep.reasoning;
  return Object.assign(b, extra);
}
async function postChat(ep, body, signal) {
  const url = ep.base + '/chat/completions';
  let res = await fetch(url, { method: 'POST', headers: headers(ep.key, ep.base), body: JSON.stringify(body), signal });
  if (res.status === 400 || res.status === 422) {
    // 일부 모델이 거부하는 선택 파라미터를 빼고 한 번 더 시도
    const err = await apiError(res);
    if (/reasoning|temperature|max_tokens|unsupported|not supported|unknown|invalid/i.test(err.body || '')) {
      const b2 = { ...body }; delete b2.reasoning_effort; delete b2.temperature;
      if (/max_tokens/.test(err.body)) { b2.max_completion_tokens = b2.max_tokens; delete b2.max_tokens; }
      res = await fetch(url, { method: 'POST', headers: headers(ep.key, ep.base), body: JSON.stringify(b2), signal });
    } else throw err;
  }
  if (!res.ok) throw await apiError(res);
  return res;
}
async function streamChat(ep, messages, onDelta, signal) {
  const res = await postChat(ep, chatBody(ep, messages, true), signal);
  const ct = res.headers.get('content-type') || '';
  if (!res.body || ct.includes('application/json')) {
    const j = await res.json(); const t = j.choices?.[0]?.message?.content || ''; onDelta(t); return t;
  }
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '', full = '';
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim(); if (data === '[DONE]') return full;
      let j; try { j = JSON.parse(data); } catch { continue; }
      if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
      const d = j.choices?.[0]?.delta?.content || '';
      if (d) { full += d; onDelta(d); }
    }
  }
  return full;
}
async function completeChat(ep, messages, signal, extra) {
  const res = await postChat(ep, chatBody(ep, messages, false, extra), signal);
  const j = await res.json(); return j.choices?.[0]?.message?.content || '';
}
async function generateImage(prompt, { aspect = '3:4', signal } = {}) {
  const ep = resolveImage();
  if (!ep) throw new Error('AI 연결이 없어요. 설정에서 먼저 추가해 주세요.');
  if (!ep.key) throw new Error(`'${ep.p.name}' 연결에 API 키가 없어요.`);
  if (!ep.model) throw new Error('이미지 모델 이름이 없어요. 설정 > 사진 생성에서 입력해 주세요.');
  const body = { model: ep.model, prompt, n: 1 };
  if (ep.kind === 'xai') { body.response_format = 'b64_json'; body.aspect_ratio = aspect; }
  else if (ep.kind === 'openai') { body.size = aspect === '1:1' ? '1024x1024' : '1024x1536'; if (/^gpt-image/.test(ep.model)) body.quality = 'medium'; else body.response_format = 'b64_json'; }
  else if (ep.kind === 'openrouter') { body.aspect_ratio = aspect; }
  else body.response_format = 'b64_json';
  const path = ep.kind === 'openrouter' ? '/images' : '/images/generations';
  const res = await fetch(ep.base + path, { method: 'POST', headers: headers(ep.key, ep.base), body: JSON.stringify(body), signal });
  if (!res.ok) throw await apiError(res);
  return parseImageResponse(await res.json());
}
async function parseImageResponse(j) {
  const d = j.data?.[0];
  if (!d) throw new Error('이미지가 생성되지 않았어요 (검열되었거나 응답이 비었어요)');
  if (d.b64_json) return `data:${d.mime_type || d.media_type || 'image/png'};base64,${d.b64_json}`;
  if (d.url) {
    try { const r = await fetch(d.url); const blob = await r.blob(); return await fileToDataURL(blob); }
    catch { return d.url; } // CORS 차단 시 임시 URL 그대로 (나중에 만료될 수 있음)
  }
  throw new Error('알 수 없는 이미지 응답 형식이에요');
}
// 참고 이미지(프로필 사진) 지원 여부: 연결별 설정 'auto' | 'on' | 'off'
function refSupport(ep) {
  if (!ep) return false;
  const m = ep.p.refMode || 'auto';
  if (m === 'off') return false;
  if (m === 'on') return true;
  if (ep.kind === 'xai') return true;
  if (ep.kind === 'openai') return /^gpt-image|^chatgpt-image/.test(ep.model);
  if (ep.kind === 'openrouter') return true;
  return false; // gemini OpenAI 호환 엔드포인트, 직접 입력은 기본적으로 미지원
}
const dataUrlToBlob = async u => (await fetch(u)).blob();
async function generateImageWithRef(prompt, refDataUrl, { aspect = '3:4', signal } = {}) {
  const ep = resolveImage();
  if (!ep || !ep.key || !ep.model) throw new Error('이미지 연결 설정을 확인해 주세요');
  let res;
  if (ep.kind === 'openai') {
    // OpenAI gpt-image: multipart /images/edits, image[] 파일
    const fd = new FormData();
    fd.append('model', ep.model); fd.append('prompt', prompt); fd.append('n', '1');
    fd.append('size', aspect === '1:1' ? '1024x1024' : '1024x1536'); fd.append('quality', 'medium');
    if (/^gpt-image-1/.test(ep.model)) fd.append('input_fidelity', 'high');
    fd.append('image[]', await dataUrlToBlob(refDataUrl), 'reference.jpg');
    res = await fetch(ep.base + '/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + ep.key }, body: fd, signal });
  } else if (ep.kind === 'openrouter') {
    // OpenRouter Image API: /images + input_references
    const body = { model: ep.model, prompt, n: 1, aspect_ratio: aspect, input_references: [{ type: 'image_url', image_url: { url: refDataUrl } }] };
    res = await fetch(ep.base + '/images', { method: 'POST', headers: headers(ep.key, ep.base), body: JSON.stringify(body), signal });
  } else {
    // xAI (및 같은 형식의 직접 입력): JSON /images/edits, image = data URI
    const body = { model: ep.model, prompt, n: 1, response_format: 'b64_json', image: { url: refDataUrl, type: 'image_url' } };
    res = await fetch(ep.base + '/images/edits', { method: 'POST', headers: headers(ep.key, ep.base), body: JSON.stringify(body), signal });
  }
  if (!res.ok) throw await apiError(res);
  return parseImageResponse(await res.json());
}
const STYLE_EN = {
  '실사': 'photorealistic candid smartphone photo, natural lighting, realistic skin texture',
  '애니메이션': 'high quality anime illustration, clean lineart, soft cel shading',
  '웹툰': 'Korean webtoon style digital illustration, soft colors',
  '3D': 'stylized 3D render, soft studio lighting, Pixar-like',
};
function appearanceBlock(c) {
  return `Character: ${c.name}${c.gender ? ', ' + c.gender : ''}${c.age ? ', age ' + c.age : ''}. Appearance (must stay consistent): ${c.appearance || 'attractive Korean person in their twenties'}.`;
}
function profilePrompt(c) {
  return `${STYLE_EN[c.imageStyle] || STYLE_EN['실사']}. Profile picture portrait, head and shoulders, looking at the camera with a warm gentle smile, simple pleasant background. ${appearanceBlock(c)} Adult (19+), ${S.settings.adultMode ? 'no nudity' : 'fully clothed'}, tasteful, non-explicit, single person, no text.`;
}

// ---------- router ----------
let current = { view: null, id: null };
let streaming = null; // {charId, controller}
function go(hash) { location.hash = hash; }
window.addEventListener('hashchange', route);
async function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [view, id] = h.split('/');
  closeSheet();
  if (view === 'chat' && charById(id)) return renderChat(id);
  if (view === 'edit') return renderEditor(id && charById(id) ? id : null);
  if (view === 'settings') return renderSettings();
  return renderHome();
}

// ---------- sheet ----------
function openSheet(html, onMount) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop"><div class="sheet" role="dialog"><div class="grab"></div>${html}</div></div>`;
  $('.backdrop', root).addEventListener('click', e => { if (e.target.classList.contains('backdrop')) closeSheet(); });
  onMount && onMount($('.sheet', root));
}
function closeSheet() { $('#sheet-root').innerHTML = ''; }
function actionSheet(title, opts) {
  openSheet(`${title ? `<div class="stitle">${esc(title)}</div>` : ''}${opts.map((o, i) => `<button class="opt ${o.danger ? 'danger' : ''}" data-i="${i}"><span class="ic">${o.icon || ''}</span>${esc(o.label)}</button>`).join('')}<button class="opt" data-i="-1"><span class="ic"></span>취소</button>`,
    el => el.querySelectorAll('.opt').forEach(b => b.onclick = () => { closeSheet(); const o = opts[+b.dataset.i]; o && o.run(); }));
}
function confirmSheet(msg, okLabel, danger = true) {
  return new Promise(res => {
    openSheet(`<div class="stitle" style="font-size:15px;color:var(--text);padding:10px 14px 14px">${esc(msg)}</div>
      <div class="row" style="padding:0 6px 6px"><button class="btn ghost" id="cNo">취소</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cOk">${esc(okLabel)}</button></div>`,
      el => { $('#cNo', el).onclick = () => { closeSheet(); res(false); }; $('#cOk', el).onclick = () => { closeSheet(); res(true); }; });
  });
}
function viewImage(src) {
  const v = document.createElement('div'); v.className = 'viewer';
  v.innerHTML = `<img src="${esc(src)}" alt=""><div class="vbtns"><a class="btn ghost small" download="seollem-photo.jpg" href="${esc(src)}">저장</a><button class="btn ghost small">닫기</button></div>`;
  v.onclick = e => { if (e.target === v || e.target.tagName === 'BUTTON') v.remove(); };
  document.body.appendChild(v);
}

// ---------- HOME ----------
async function renderHome() {
  current = { view: 'home' };
  const rows = [];
  for (const c of characters) {
    const chat = await getChat(c.id); const last = chat.messages[chat.messages.length - 1];
    rows.push({ c, last, t: last ? last.ts : c.updatedAt || c.createdAt });
  }
  rows.sort((a, b) => (b.t || 0) - (a.t || 0));
  const st = S.settings;
  $('#app').innerHTML = `<div class="screen home">
    <div class="topbar"><h1><span class="logo">♥</span> 설렘톡</h1><button class="iconbtn" id="toSettings" aria-label="설정">${ICON.gear}</button></div>
    <div class="scroll">
      ${!(resolveChat(null) || {}).key ? `<div class="banner"><span style="font-size:22px">🔑</span><div style="flex:1">대화하려면 먼저 <b>AI 연결(API 키)</b>을 추가해 주세요.</div><button class="btn small" id="bKey">설정</button></div>` : ''}
      ${rows.length ? `<ul class="clist">${rows.map(({ c, last, t }) => `
        <li class="citem" data-id="${c.id}">
          <img class="avatar" src="${esc(avatarOf(c))}" alt="">
          <div class="cmeta"><div class="cname">${esc(c.name)}${c.relationLabel ? `<span class="rel">${esc(c.relationLabel)}</span>` : ''}</div>
          <div class="cprev">${esc(last ? (last.type === 'image' ? '📷 사진' : (last.role === 'user' ? '나: ' : '') + last.content.replace(/\s+/g, ' ')) : '새 대화를 시작해 보세요')}</div></div>
          <div class="ctime">${fmtListTime(t)}</div>
        </li>`).join('')}</ul>`
      : `<div class="empty"><div class="big">💌</div><h2>아직 대화 상대가 없어요</h2>나만의 연인 캐릭터를 직접 만들어 보세요.<br>이름, 성격, 말투, 둘의 관계까지 마음대로!<br><br>
          <button class="btn primary" id="bNew">＋ 캐릭터 만들기</button><br><br><button class="btn ghost small" id="bSample">예시 캐릭터로 시작하기</button></div>`}
    </div>
    ${rows.length ? `<button class="fab" id="fab">＋ 새 캐릭터</button>` : ''}
  </div>`;
  $('#toSettings').onclick = () => go('#/settings');
  $('#bKey') && ($('#bKey').onclick = () => go('#/settings'));
  $('#fab') && ($('#fab').onclick = () => go('#/edit'));
  $('#bNew') && ($('#bNew').onclick = () => go('#/edit'));
  $('#bSample') && ($('#bSample').onclick = addSample);
  document.querySelectorAll('.citem').forEach(li => {
    li.onclick = () => go('#/chat/' + li.dataset.id);
    onLongPress(li, () => charMenu(li.dataset.id));
  });
}
function onLongPress(el, fn) {
  let t; const start = () => { t = setTimeout(() => { t = null; el._lp = true; fn(); }, 520); };
  const cancel = () => { clearTimeout(t); };
  el.addEventListener('touchstart', start, { passive: true }); el.addEventListener('touchend', cancel); el.addEventListener('touchmove', cancel, { passive: true });
  el.addEventListener('contextmenu', e => { e.preventDefault(); clearTimeout(t); fn(); });
  el.addEventListener('click', e => { if (el._lp) { el._lp = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
}
function charMenu(id) {
  const c = charById(id); if (!c) return;
  actionSheet(c.name, [
    { icon: '💬', label: '대화하기', run: () => go('#/chat/' + id) },
    { icon: '✏️', label: '캐릭터 수정', run: () => go('#/edit/' + id) },
    { icon: '📄', label: '복제하기', run: () => duplicateChar(id) },
    { icon: '🧹', label: '대화 초기화', danger: true, run: () => resetChat(id) },
    { icon: '🗑️', label: '캐릭터 삭제', danger: true, run: () => deleteChar(id) },
  ]);
}
async function addSample() {
  const c = {
    id: uid(), createdAt: Date.now(), updatedAt: Date.now(), name: '한서윤', gender: '여성', age: '27', relationLabel: '여자친구',
    appearance: '어깨까지 오는 웨이브 진 갈색 머리, 큰 눈과 눈웃음, 흰 피부, 162cm, 캐주얼한 니트와 청바지를 즐겨 입음',
    personality: '밝고 다정하지만 은근히 장난기가 많음. 질투는 살짝 있지만 귀엽게 표현함. 상대의 작은 변화도 잘 알아챔.',
    speech: '반말. 애교 섞인 말투, "~했어?", "웅", "ㅎㅎ"를 자주 씀',
    relationship: '대학 동아리 선후배로 만나 1년째 연애 중인 연인. 서로 바빠도 매일 연락함.',
    background: '출판사에서 편집자로 일함. 서울 망원동에서 자취 중.', likes: '라떼, 고양이, 비 오는 날, 한강 산책, 로맨스 소설',
    greeting: '자기야 퇴근했어? 🥺 오늘 하루 어땠는지 얘기해줘!', examples: '서윤: 뭐야~ 보고 싶었다는 말을 이제 해? ㅎㅎ 나는 아까부터 그랬는데\n서윤: 밥은 먹었어? 안 먹었으면 혼난다?',
    extra: '', imageStyle: '실사', avatar: '',
  };
  characters.push(c); await saveCharacters(); await startChatIfEmpty(c); toast('예시 캐릭터를 추가했어요'); renderHome();
}
async function duplicateChar(id) {
  const c = charById(id); const d = { ...c, id: uid(), name: c.name + ' (복사)', createdAt: Date.now(), updatedAt: Date.now() };
  characters.push(d); await saveCharacters(); await startChatIfEmpty(d); toast('복제했어요'); route();
}
async function deleteChar(id) {
  const c = charById(id);
  if (!await confirmSheet(`'${c.name}' 캐릭터와 대화 기록을 모두 삭제할까요? 되돌릴 수 없어요.`, '삭제')) return;
  characters = characters.filter(x => x.id !== id); await saveCharacters(); await DB.del('chat:' + id); chatCache.delete(id);
  toast('삭제했어요'); go('#/');
  if (current.view === 'home') renderHome();
}
async function resetChat(id) {
  const c = charById(id);
  if (!await confirmSheet(`'${c.name}'와(과)의 대화를 모두 지우고 처음부터 시작할까요?`, '초기화')) return;
  if (streaming && streaming.charId === id) streaming.controller.abort();
  chatCache.set(id, { messages: [] }); await startChatIfEmpty(c); await saveChat(id);
  toast('대화를 초기화했어요'); route();
}
async function startChatIfEmpty(c) {
  const chat = await getChat(c.id);
  if (!chat.messages.length && c.greeting && c.greeting.trim()) {
    chat.messages.push({ id: uid(), role: 'assistant', content: c.greeting.trim(), ts: Date.now() }); await saveChat(c.id);
  }
}

// ---------- EDITOR ----------
const FIELDS = [
  ['name', '이름 *', 'input', '예: 한서윤'],
  ['gender', '성별', 'select', ['여성', '남성', '기타']],
  ['age', '나이', 'input', '예: 27'],
  ['relationLabel', '관계 한마디 (목록에 표시)', 'input', '예: 여자친구, 썸, 남자친구, 아내'],
  ['appearance', '외모', 'textarea', '머리 모양/색, 눈매, 키, 체형, 즐겨 입는 옷 등 — 사진 생성할 때 항상 이 내용을 써서 같은 사람처럼 보이게 해요'],
  ['personality', '성격', 'textarea', '예: 다정하고 장난기 많음, 질투는 귀엽게, 눈치가 빠름'],
  ['speech', '말투', 'textarea', '예: 반말, 애교 섞인 말투, "웅", "ㅎㅎ" 자주 씀'],
  ['relationship', '관계 설정', 'textarea', '어떻게 만났는지, 지금 어떤 사이인지 (예: 대학 동아리에서 만나 1년째 연애 중)'],
  ['background', '배경 / 과거 이야기', 'textarea', '직업, 사는 곳, 가족, 과거 사연 등'],
  ['likes', '좋아하는 것', 'textarea', '예: 라떼, 고양이, 비 오는 날, 한강 산책'],
  ['greeting', '첫 인사 메시지', 'textarea', '대화를 처음 열었을 때 캐릭터가 보내는 메시지'],
  ['examples', '예시 대사 (선택)', 'textarea', '캐릭터가 할 법한 말을 몇 줄 적으면 말투를 더 잘 따라 해요'],
  ['extra', '추가 지시 (선택)', 'textarea', '그 밖에 지켜줬으면 하는 것 (예: 답장은 짧게, 존댓말에서 점점 반말로)'],
];
function renderEditor(id) {
  current = { view: 'edit', id };
  const c = id ? { ...charById(id) } : { id: null, gender: '여성', imageStyle: '실사', avatar: '' };
  let avatar = c.avatar || '';
  const field = ([k, label, type, ph]) => {
    const v = esc(c[k] || '');
    if (type === 'select') return `<div class="field"><label>${label}</label><select id="f_${k}">${ph.map(o => `<option ${c[k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
    if (type === 'input') return `<div class="field"><label>${label}</label><input id="f_${k}" value="${v}" placeholder="${esc(ph)}" ${k === 'age' ? 'inputmode="numeric"' : ''}></div>`;
    return `<div class="field"><label>${label}</label><textarea id="f_${k}" placeholder="${esc(ph)}" rows="${k === 'greeting' ? 2 : 3}">${v}</textarea></div>`;
  };
  const F = Object.fromEntries(FIELDS.map(f => [f[0], f]));
  $('#app').innerHTML = `<div class="screen editor">
    <div class="topbar"><button class="iconbtn" id="back" aria-label="뒤로">${ICON.back}</button><div class="title">${id ? '캐릭터 수정' : '새 캐릭터 만들기'}</div></div>
    <div class="scroll"><div class="form">
      <div class="section"><div class="photo-edit">
        <img class="avatar" id="avPrev" src="${esc(avatar || fallbackAvatar(c.name || '?'))}" alt="">
        <div class="btns">
          <label class="btn small ghost">📁 사진 선택<input type="file" id="avFile" accept="image/*" hidden></label>
          <button class="btn small" id="avGen">✨ 사진 생성</button>
          <button class="btn small ghost" id="avDel" ${avatar ? '' : 'hidden'}>지우기</button>
        </div>
        <div class="muted" style="text-align:center">사진 생성은 아래 ‘외모’와 ‘사진 스타일’을 바탕으로 만들어요</div>
      </div></div>
      <div class="section"><h3>기본 정보</h3>${field(F.name)}<div class="row">${field(F.gender)}${field(F.age)}</div>${field(F.relationLabel)}
        <div class="field toggle"><label style="margin:0">대화 중 사진은 프로필 사진 기준으로 생성<div class="hint" style="font-weight:400">얼굴·머리 모양을 프로필 사진과 똑같이 유지해요 (지원하는 이미지 서비스만)</div></label><input type="checkbox" id="f_refPhoto" ${c.refPhoto !== false ? 'checked' : ''} style="width:22px;height:22px;flex:none;accent-color:#ec4899"></div>
        <div class="field"><label>사진 스타일</label><select id="f_imageStyle">${Object.keys(STYLE_EN).map(o => `<option ${c.imageStyle === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        ${field(F.appearance)}</div>
      <div class="section"><h3>성격 · 말투</h3>${field(F.personality)}${field(F.speech)}
        <div class="chips" id="speechChips">${['반말', '존댓말', '애교 많은 말투', '무뚝뚝하지만 다정', '장난스러운 말투', '차분하고 어른스러운 말투'].map(t => `<button class="chip" type="button">${t}</button>`).join('')}</div></div>
      <div class="section"><h3>관계 · 배경</h3>${field(F.relationship)}${field(F.background)}${field(F.likes)}</div>
      <div class="section"><h3>대화</h3>${field(F.greeting)}${field(F.examples)}${field(F.extra)}</div>
      <div class="section"><h3>AI 모델 (선택)</h3>
        <div class="field"><label>이 캐릭터 전용 연결</label><select id="f_chatProviderId"><option value="">기본 설정 따름</option>${S.settings.providers.map(p => `<option value="${p.id}" ${c.chatProviderId === p.id ? 'selected' : ''}>${esc(p.name)} · ${esc(presetOf(p).label)}</option>`).join('')}</select></div>
        <div class="field"><label>모델</label><input id="f_chatModel" value="${esc(c.chatModel || '')}" placeholder="비우면 그 연결의 기본 모델" autocapitalize="off" autocorrect="off" spellcheck="false"></div>
      </div>
      ${id ? `<div class="section"><h3>관리</h3><div class="row"><button class="btn ghost" id="dup">복제</button><button class="btn danger" id="del">삭제</button></div></div>` : ''}
    </div></div>
    <div class="savebar"><button class="btn primary" id="save">${id ? '저장하기' : '만들고 대화 시작'}</button></div>
  </div>`;
  const setAvatar = v => { avatar = v; $('#avPrev').src = v || fallbackAvatar($('#f_name').value || '?'); $('#avDel').hidden = !v; };
  $('#back').onclick = () => history.length > 1 ? history.back() : go('#/');
  $('#f_name').addEventListener('input', () => { if (!avatar) $('#avPrev').src = fallbackAvatar($('#f_name').value || '?'); });
  $('#avFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { setAvatar(await compressImage(await fileToDataURL(f), { max: 384, square: true, quality: 0.86 })); }
    catch (err) { toast('사진을 읽지 못했어요: ' + err.message); }
  };
  $('#avDel').onclick = () => setAvatar('');
  $('#speechChips').onclick = e => {
    if (!e.target.classList.contains('chip')) return;
    const ta = $('#f_speech'); ta.value = ta.value.trim() ? ta.value.trim() + ', ' + e.target.textContent : e.target.textContent;
  };
  const collect = () => { const o = { ...c }; for (const [k] of FIELDS) o[k] = $('#f_' + k).value.trim(); o.imageStyle = $('#f_imageStyle').value; o.avatar = avatar; o.refPhoto = $('#f_refPhoto').checked; o.chatProviderId = $('#f_chatProviderId').value; o.chatModel = o.chatProviderId ? $('#f_chatModel').value.trim() : ''; return o; };
  $('#avGen').onclick = async () => {
    const o = collect();
    if (!o.appearance) { toast('먼저 ‘외모’를 적어 주세요'); $('#f_appearance').focus(); return; }
    if (!S.settings.imgEnabled) { toast('설정에서 사진 생성이 꺼져 있어요'); return; }
    const b = $('#avGen'); b.disabled = true; b.innerHTML = '<span class="spin"></span> 생성 중…';
    try { const img = await generateImage(profilePrompt(o), { aspect: '1:1' }); setAvatar(await compressImage(img, { max: 384, square: true, quality: 0.86 })); toast('프로필 사진을 만들었어요 ✨'); }
    catch (err) { toast(err.message, 4500); }
    finally { b.disabled = false; b.innerHTML = '✨ 사진 생성'; }
  };
  if (id) { $('#dup').onclick = () => duplicateChar(id); $('#del').onclick = () => deleteChar(id); }
  $('#save').onclick = async () => {
    const o = collect();
    if (!o.name) { toast('이름을 입력해 주세요'); $('#f_name').focus(); return; }
    if (S.settings.adultMode) {
      const age = parseInt(String(o.age).replace(/[^0-9]/g, ''), 10);
      if (!(age >= 19)) { toast('성인 모드에서는 캐릭터 나이를 19세 이상 숫자로 입력해야 해요', 3500); $('#f_age').focus(); $('#f_age').style.borderColor = 'var(--danger)'; return; }
    }
    o.updatedAt = Date.now();
    if (!o.id) { o.id = uid(); o.createdAt = Date.now(); characters.push(o); }
    else characters[characters.findIndex(x => x.id === o.id)] = o;
    try { await saveCharacters(); } catch (e) { toast('저장 실패: ' + e.message); return; }
    await startChatIfEmpty(o);
    toast(id ? '저장했어요' : `${o.name}을(를) 만들었어요 💕`);
    if (id) history.length > 1 ? history.back() : go('#/'); else location.replace('#/chat/' + o.id);
  };
}

// ---------- CHAT ----------
let chatState = null; // {id, typing:{label}|null}
async function renderChat(id) {
  current = { view: 'chat', id };
  const c = charById(id); await getChat(id);
  const st = S.settings;
  $('#app').innerHTML = `<div class="screen chat">
    <div class="topbar"><button class="iconbtn" id="back" aria-label="뒤로">${ICON.back}</button>
      <img class="avatar" src="${esc(avatarOf(c))}" alt="" id="hAv">
      <div class="title">${esc(c.name)}<div class="sub" id="hSub">${esc(headerSub(c))}</div></div>
      <button class="iconbtn" id="menu" aria-label="메뉴">${ICON.more}</button></div>
    <div class="msgs" id="msgs"></div>
    ${!(resolveChat(c) || {}).key ? `<div class="nokey">🔑 AI 연결(API 키)이 설정되지 않았어요<button id="goKey">설정하기</button></div>` : ''}
    <div class="composer">
      ${st.imgEnabled ? `<button class="cam" id="cam" aria-label="사진 요청" title="지금 사진 보내줘">${ICON.cam}</button>` : ''}
      <textarea id="input" rows="1" placeholder="메시지 입력" enterkeyhint="send"></textarea>
      <button class="send" id="send" aria-label="보내기" disabled>${ICON.send}</button>
    </div></div>`;
  chatState = { id, typing: chatState && chatState.id === id ? chatState.typing : null };
  $('#back').onclick = () => go('#/');
  $('#hAv').onclick = () => go('#/edit/' + id);
  $('#hSub').parentElement.onclick = () => modelSwitcher(id);
  $('#goKey') && ($('#goKey').onclick = () => go('#/settings'));
  $('#menu').onclick = () => actionSheet(c.name, [
    { icon: '✏️', label: '캐릭터 수정', run: () => go('#/edit/' + id) },
    { icon: '🤖', label: 'AI 모델 바꾸기', run: () => modelSwitcher(id) },
    { icon: '🧠', label: '기억 노트 · 요약 보기', run: () => memorySheet(id) },
    { icon: '📷', label: '사진 보내달라고 하기 (상황 직접 입력)', run: () => askPhotoCustom(id) },
    { icon: '📤', label: '대화 내용 텍스트로 복사', run: () => copyTranscript(id) },
    { icon: '🧹', label: '대화 초기화', danger: true, run: () => resetChat(id) },
  ]);
  const input = $('#input'), send = $('#send');
  const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 130) + 'px'; };
  input.addEventListener('input', () => { autosize(); updateSendBtn(); });
  input.addEventListener('keydown', e => {
    // 데스크톱에서는 Enter 전송, 휴대폰에서는 줄바꿈 (전송 버튼 사용)
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !('ontouchstart' in window)) { e.preventDefault(); send.click(); }
  });
  send.onclick = () => {
    if (streaming && streaming.charId === id) { streaming.controller.abort(); return; }
    const t = input.value.trim(); if (!t) return;
    input.value = ''; autosize(); updateSendBtn(); sendMessage(id, t);
  };
  $('#cam') && ($('#cam').onclick = () => requestPhoto(id, ''));
  renderMessages(true); updateSendBtn();
}
function updateSendBtn() {
  const send = $('#send'); if (!send || !chatState) return;
  const busy = streaming && streaming.charId === chatState.id;
  send.classList.toggle('stop', !!busy); send.innerHTML = busy ? ICON.stop : ICON.send;
  send.disabled = !busy && !$('#input').value.trim();
  const cam = $('#cam'); if (cam) cam.disabled = !!streaming;
}
function richText(t) {
  return esc(t).replace(/\*([^*\n]{1,200})\*/g, '<em class="act">*$1*</em>');
}
function splitBubbles(t) { return String(t).split(/\n\s*\n/).map(s => s.trim()).filter(Boolean); }
async function renderMessages(forceBottom) {
  if (!chatState) return;
  const box = $('#msgs'); if (!box) return;
  const id = chatState.id, c = charById(id), chat = await getChat(id);
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  const msgs = chat.messages; let html = '', lastDay = '';
  const lastAiIdx = (() => { for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'assistant') return i; return -1; })();
  msgs.forEach((m, i) => {
    const day = new Date(m.ts).toDateString();
    if (day !== lastDay) { html += `<div class="day"><span>${fmtDay(m.ts)}</span></div>`; lastDay = day; }
    const prev = msgs[i - 1], next = msgs[i + 1];
    const sameMinutePrev = prev && prev.role === m.role && fmtTime(prev.ts) === fmtTime(m.ts) && new Date(prev.ts).toDateString() === day;
    const showTime = !(next && next.role === m.role && fmtTime(next.ts) === fmtTime(m.ts));
    const me = m.role === 'user';
    let parts;
    if (m.type === 'image') parts = [`<div class="bubble photo"><img src="${esc(m.image)}" alt="사진" data-view="1" loading="lazy">${m.note ? `<div class="pnote">ⓘ ${esc(m.note)}</div>` : ''}</div>`].concat(m.caption ? [`<div class="bubble">${richText(m.caption)}</div>`] : []);
    else if (m.error) parts = [`<div class="bubble err">⚠️ ${esc(m.content)}</div>`];
    else parts = (me ? [m.content] : splitBubbles(m.content)).map(p => `<div class="bubble">${me ? esc(p) : richText(p)}</div>`);
    if (!parts.length) parts = ['<div class="bubble">…</div>'];
    const lines = parts.map((p, k) => `<div class="bline">${p}${k === parts.length - 1 && showTime ? `<span class="mtime">${fmtTime(m.ts)}</span>` : ''}</div>`).join('');
    html += `<div class="mrow ${me ? 'me' : 'ai'}" data-mid="${m.id}" style="${sameMinutePrev ? '' : 'margin-top:10px'}">
      ${me ? '' : (sameMinutePrev ? '<div class="spacer"></div>' : `<img class="avatar" src="${esc(avatarOf(c))}" alt="">`)}
      <div class="mcol">${!me && !sameMinutePrev ? `<div class="mname">${esc(c.name)}</div>` : ''}${lines}</div></div>`;
    if (chat.summary && m.id === chat.summaryThrough && i < msgs.length - 1) html += `<div class="day memdiv"><span>🧠 여기까지의 대화는 요약해서 기억하고 있어요</span></div>`;
    if (i === lastAiIdx && i === msgs.length - 1 && !chatState.typing && !(streaming && streaming.charId === id) && i > 0)
      html += `<div class="mactions"><button data-act="regen">↻ 다시 생성</button></div>`;
    if (m.error && i === msgs.length - 1 && !streaming) html += `<div class="mactions" style="margin-left:0;justify-content:center"><button data-act="retry">↻ 다시 시도</button></div>`;
  });
  if (chatState.typing) {
    html += `<div class="mrow ai" style="margin-top:10px"><img class="avatar" src="${esc(avatarOf(c))}" alt=""><div class="mcol"><div class="mname">${esc(c.name)}</div><div class="bline"><div class="bubble typing"><i></i><i></i><i></i></div>${chatState.typing.label ? `<span class="typing-label">${esc(chatState.typing.label)}</span>` : ''}</div></div></div>`;
  }
  box.innerHTML = html;
  box.querySelectorAll('.mrow[data-mid]').forEach(row => {
    onLongPress(row, () => messageMenu(row.dataset.mid));
  });
  box.querySelectorAll('img[data-view]').forEach(img => img.onclick = () => viewImage(img.src));
  box.querySelectorAll('[data-act=regen]').forEach(b => b.onclick = () => regenerate(id));
  box.querySelectorAll('[data-act=retry]').forEach(b => b.onclick = () => retryAfterError(id));
  if (forceBottom || nearBottom) box.scrollTop = box.scrollHeight;
}
function messageMenu(mid) {
  const id = chatState.id; const chat = chatCache.get(id); const idx = chat.messages.findIndex(m => m.id === mid); const m = chat.messages[idx];
  if (!m) return;
  const isLastAi = m.role === 'assistant' && idx === chat.messages.length - 1;
  const opts = [];
  if (m.type === 'image') opts.push({ icon: '🔍', label: '사진 크게 보기', run: () => viewImage(m.image) });
  else opts.push({ icon: '📋', label: '복사', run: () => copyText(m.content) });
  if (isLastAi && !streaming) opts.push({ icon: '↻', label: '다시 생성', run: () => regenerate(id) });
  if (m.type === 'image' && m.role === 'assistant') opts.push({ icon: '🖼️', label: '이 사진을 프로필 사진으로', run: async () => { const c = charById(id); c.avatar = await compressImage(m.image, { max: 384, square: true }); await saveCharacters(); toast('프로필 사진으로 설정했어요'); renderChat(id); } });
  opts.push({ icon: '🗑️', label: '메시지 삭제', danger: true, run: async () => { chat.messages.splice(idx, 1); await saveChat(id); renderMessages(); } });
  actionSheet(null, opts);
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('복사했어요'); }
  catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('복사했어요'); }
}
async function copyTranscript(id) {
  const c = charById(id), chat = await getChat(id), me = S.profile.name || '나';
  copyText(chat.messages.map(m => `[${fmtDay(m.ts)} ${fmtTime(m.ts)}] ${m.role === 'user' ? me : c.name}: ${m.type === 'image' ? '(사진) ' + (m.caption || '') : m.content}`).join('\n'));
}
function needKey(c) {
  const ep = resolveChat(c);
  if (!ep) { toast('설정에서 AI 연결을 먼저 추가해 주세요 🔑', 3000); return true; }
  if (!ep.key) { toast(`'${ep.p.name}' 연결에 API 키가 없어요. 설정에서 입력해 주세요 🔑`, 3000); return true; }
  if (!ep.model || !ep.base) { toast('설정에서 API 주소와 모델 이름을 확인해 주세요', 3000); return true; }
  return false;
}
function headerSub(c) {
  const ep = resolveChat(c); const m = ep ? ep.model : '';
  return [c.relationLabel, m ? '🤖 ' + m + (c.chatProviderId && provById(c.chatProviderId) ? ' (개별)' : '') : ''].filter(Boolean).join(' · ');
}
async function sendMessage(id, text) {
  const chat = await getChat(id);
  // drop trailing error bubbles
  while (chat.messages.length && chat.messages[chat.messages.length - 1].error) chat.messages.pop();
  chat.messages.push({ id: uid(), role: 'user', content: text, ts: Date.now() });
  await saveChat(id); renderMessages(true);
  if (needKey(charById(id))) return;
  if (/(사진|셀카|셀피).{0,8}(보내|줘|찍어|보여)/.test(text) && S.settings.imgEnabled) return requestPhoto(id, text, true);
  await generateReply(id);
}
function adultAgeBlocked(c) {
  if (!S.settings.adultMode) return false;
  if (parseInt(String(c.age || '').replace(/[^0-9]/g, ''), 10) >= 19) return false;
  toast(`성인 모드에서는 ${c.name}의 나이를 19세 이상으로 설정해야 대화할 수 있어요`, 3500); return true;
}
async function generateReply(id) {
  if (streaming) return;
  const c = charById(id), chat = await getChat(id);
  if (adultAgeBlocked(c)) { renderMessages(); return; }
  const controller = new AbortController(); streaming = { charId: id, controller };
  chatState.typing = { label: '' }; renderMessages(true); updateSendBtn();
  const msg = { id: uid(), role: 'assistant', content: '', ts: Date.now() };
  let added = false, ok = false;
  try {
    await sleep(350);
    const ep = resolveChat(c);
    const messages = [{ role: 'system', content: buildSystemPrompt(c, chat) }, ...trimContext(chat, c, contextBudget(ep.model))];
    let pending = false;
    await streamChat(ep, messages, d => {
      msg.content += d;
      if (!added) { added = true; chat.messages.push(msg); if (chatState && chatState.id === id) chatState.typing = null; }
      if (!pending && current.view === 'chat' && current.id === id) { pending = true; requestAnimationFrame(() => { pending = false; renderMessages(); }); }
    }, controller.signal);
    if (!msg.content.trim()) { if (added) chat.messages.pop(); throw new Error('빈 응답이 왔어요. 다시 시도해 주세요.'); }
    msg.content = msg.content.trim(); msg.ts = Date.now(); ok = true;
  } catch (e) {
    if (e.name === 'AbortError') { if (added && !msg.content.trim()) chat.messages.pop(); }
    else { if (added && !msg.content.trim()) chat.messages.pop(); chat.messages.push({ id: uid(), role: 'assistant', error: true, content: friendlyError(e), ts: Date.now() }); }
  } finally {
    streaming = null; if (chatState && chatState.id === id) chatState.typing = null;
    await saveChat(id);
    if (current.view === 'chat' && current.id === id) { renderMessages(); updateSendBtn(); }
  }
  if (ok) runMemory(id);
}
function friendlyError(e) {
  if (e instanceof TypeError && /fetch|network|Load failed/i.test(e.message)) return '서버에 연결하지 못했어요. 인터넷 연결이나 API 주소를 확인해 주세요. (브라우저에서 직접 호출을 막는 서비스일 수도 있어요)';
  return e.message || String(e);
}
async function regenerate(id) {
  if (streaming) return;
  const chat = await getChat(id); const last = chat.messages[chat.messages.length - 1];
  if (!last || last.role !== 'assistant') return;
  if (needKey(charById(id))) return;
  chat.messages.pop(); await saveChat(id);
  if (last.type === 'image') return requestPhoto(id, last.request || '', true);
  generateReply(id);
}
async function retryAfterError(id) {
  const chat = await getChat(id);
  while (chat.messages.length && chat.messages[chat.messages.length - 1].error) chat.messages.pop();
  await saveChat(id); if (needKey(charById(id))) return renderMessages();
  const last = chat.messages[chat.messages.length - 1];
  if (last && last.role === 'user' && last.photoRequest) return requestPhoto(id, last.content, true);
  generateReply(id);
}

// ---------- photos in chat ----------
function askPhotoCustom(id) {
  openSheet(`<div class="stitle">어떤 사진을 받고 싶어요? (비워두면 지금 대화 상황에 맞게)</div>
    <textarea id="phReq" placeholder="예: 지금 있는 카페에서 찍은 셀카, 오늘 입은 옷 전신 사진"></textarea>
    <button class="btn primary block" id="phGo">📷 사진 보내달라고 하기</button>`, el => {
    $('#phGo', el).onclick = () => { const t = $('#phReq', el).value.trim(); closeSheet(); requestPhoto(id, t); };
  });
}
async function requestPhoto(id, request, alreadyPosted = false) {
  if (streaming) return;
  const c = charById(id), chat = await getChat(id);
  if (needKey(c) || adultAgeBlocked(c)) return;
  if (!alreadyPosted) {
    while (chat.messages.length && chat.messages[chat.messages.length - 1].error) chat.messages.pop();
    chat.messages.push({ id: uid(), role: 'user', content: request || '지금 사진 보내줘 📷', photoRequest: true, ts: Date.now() });
    await saveChat(id);
  } else { const last = chat.messages[chat.messages.length - 1]; if (last && last.role === 'user') last.photoRequest = true; }
  const controller = new AbortController(); streaming = { charId: id, controller };
  chatState.typing = { label: '사진 고르는 중…' }; renderMessages(true); updateSendBtn();
  try {
    // 1) 채팅 모델이 현재 상황에 맞는 이미지 프롬프트 + 캐릭터의 한마디 작성
    let scene = '', caption = '';
    try {
      const ep = resolveChat(c);
      const recent = trimContext(chat, c, 6000, true).slice(-12).map(m => `${m.role === 'user' ? (S.profile.name || '사용자') : c.name}: ${m.content}`).join('\n');
      const sys = `You write prompts for an image generator. A romantic-partner character is about to send a photo of themself in a messenger chat. Based on the character sheet and the recent conversation, decide what photo they would naturally send right now (place, time of day, outfit, pose, expression, mood, camera framing such as selfie or photo taken by a friend). ${S.settings.adultMode ? 'The characters are consenting adults (19+). The photo may be alluring and romantic when the conversation suits it (date night outfit, sleepwear, swimwear, soft intimate mood, flirtatious pose), but it must stay non-explicit: no nudity, no sexual acts, no exposed private parts, tasteful. Never make the person look underage.' : 'Keep it wholesome and non-explicit: fully clothed, no nudity, no sexual content.'} Reply ONLY with JSON: {"scene": "<English, 40-90 words, describe the photo; include the character's key appearance details>", "caption": "<short Korean message the character sends with the photo, in their speaking style, 1 sentence>"}`;
      const usr = `[Character]\nName: ${c.name}\nGender: ${c.gender || ''}\nAge: ${c.age || ''}\nAppearance: ${c.appearance || '(not specified)'}\nPersonality: ${c.personality || ''}\nSpeaking style: ${c.speech || ''}\nBackground: ${c.background || ''}\nCurrent local time (Korea): ${nowKorean()}\n${chat.summary ? `\n[Story so far]\n${chat.summary}\n` : ''}\n[Recent conversation]\n${recent}\n\n${request ? `[User's photo request]\n${request}\n` : ''}JSON only.`;
      const raw = await completeChat(ep, [{ role: 'system', content: sys }, { role: 'user', content: usr }], controller.signal, { max_tokens: 800 });
      const mm = raw.match(/\{[\s\S]*\}/); const j = JSON.parse(mm ? mm[0] : raw);
      scene = String(j.scene || '').trim(); caption = String(j.caption || '').trim();
    } catch (e) { if (e.name === 'AbortError') throw e; console.warn('scene prompt failed', e); }
    if (!scene) scene = `A casual selfie ${request ? 'matching this request: ' + request : 'sent to their partner during a messenger chat'}, warm smile.`;
    const prompt = `${STYLE_EN[c.imageStyle] || STYLE_EN['실사']}. ${scene} ${appearanceBlock(c)} Single adult person (19+), ${S.settings.adultMode ? 'no nudity' : 'fully clothed'}, non-explicit, tasteful, no text or watermark.`;
    if (chatState && chatState.id === id) { chatState.typing = { label: '사진 찍는 중… 📸' }; renderMessages(); }
    // 2) 이미지 생성 → 압축 저장
    let raw = null, note = '', usedRef = false;
    const wantRef = !!c.avatar && c.refPhoto !== false;
    if (wantRef) {
      const iep = resolveImage();
      if (refSupport(iep)) {
        const safety = `Adult (19+), ${S.settings.adultMode ? 'no nudity' : 'fully clothed'}, non-explicit, tasteful, no text or watermark.`;
        const refPrompt = `The reference image shows ${c.name}. Create a NEW photo of the exact same person: keep the face, facial features, hairstyle, hair color and overall look identical to the reference image. Do not copy the reference composition or background. ${STYLE_EN[c.imageStyle] || STYLE_EN['실사']}. New scene: ${scene} ${appearanceBlock(c)} Single person. ${safety}`;
        try { raw = await generateImageWithRef(refPrompt, c.avatar, { aspect: '3:4', signal: controller.signal }); usedRef = true; }
        catch (e) { if (e.name === 'AbortError') throw e; console.warn('ref image failed', e); note = '프로필 사진 기준 생성에 실패해서 외모 설명으로 만들었어요'; }
      } else note = '이 연결은 참고 이미지를 지원하지 않아 외모 설명으로 만들었어요';
    }
    if (!raw) raw = await generateImage(prompt, { aspect: '3:4', signal: controller.signal });
    let image = raw; try { image = await compressImage(raw, { max: 768, quality: 0.82 }); } catch {}
    chat.messages.push({ id: uid(), role: 'assistant', type: 'image', image, caption: caption || '', prompt, request: request || '', usedRef, note, ts: Date.now() });
  } catch (e) {
    if (e.name !== 'AbortError') chat.messages.push({ id: uid(), role: 'assistant', error: true, content: '사진을 만들지 못했어요: ' + friendlyError(e), ts: Date.now() });
  } finally {
    streaming = null; if (chatState && chatState.id === id) chatState.typing = null;
    try { await saveChat(id); } catch (e) { toast('저장 공간이 부족해요. 오래된 사진을 지워 주세요.'); }
    if (current.view === 'chat' && current.id === id) { renderMessages(true); updateSendBtn(); }
  }
}


// ---------- long-term memory (rolling summary + memory notes) ----------
const memBusy = new Set();
const NOTE_EVERY = 6; // 메시지 6개(약 3번 주고받기)마다 기억 노트 추출
function transcriptOf(msgs, c) {
  const me = S.profile.name || '사용자';
  return msgs.filter(m => !m.error).map(m => `${m.role === 'user' ? me : c.name}: ${m.type === 'image' ? '(사진을 보냄) ' + (m.caption || '') : m.content}`).join('\n');
}
async function runMemory(id) {
  try { await maybeExtractNotes(id); } catch (e) { console.warn('notes', e); }
  try { await maybeSummarize(id); } catch (e) { console.warn('summary', e); }
}
async function maybeSummarize(id, force = false) {
  if (memBusy.has('s' + id)) return false;
  const c = charById(id), chat = await getChat(id), ep = resolveChat(c);
  if (!c || !ep || !ep.key) return false;
  const budget = contextBudget(ep.model);
  const act = activeMessages(chat).filter(m => !m.error);
  const total = act.reduce((a, m) => a + msgChars(m), 0);
  if (!force && total <= budget) return false;
  // 최근 대화(예산의 절반 정도)는 그대로 두고 그 이전 부분을 요약에 합침
  let k = act.length, keep = 0;
  if (force) k = Math.max(0, act.length - 6);
  else while (k > 0 && keep + msgChars(act[k - 1]) <= budget * 0.5) { keep += msgChars(act[k - 1]); k--; }
  const toSum = act.slice(0, k); if (toSum.length < 2) return false;
  memBusy.add('s' + id);
  try {
    const sys = `너는 연애 롤플레이 채팅의 '기억 정리 담당'이다. '${c.name}'(캐릭터)와 '${S.profile.name || '사용자'}'(사용자)의 대화를 ${c.name}의 장기 기억으로 쓸 수 있게 한국어로 요약한다.
- 기존 요약이 있으면 그 내용을 유지하면서 새 대화 내용을 자연스럽게 합쳐 하나의 요약으로 다시 쓴다.
- 시간 순서대로, 있었던 일·나눈 이야기·감정 변화·약속·관계의 진전·사용자에 대해 알게 된 것 위주로 쓴다. 날짜가 드러나면 날짜도 적는다.
- 사소한 인사말은 생략. 최대 1200자 정도. 요약 본문만 출력한다.`;
    const usr = `${chat.summary ? `[기존 요약]\n${chat.summary}\n\n` : ''}[새로 요약할 대화 (${fmtDay(toSum[0].ts)} ~ ${fmtDay(toSum[toSum.length - 1].ts)})]\n${transcriptOf(toSum, c).slice(-60000)}`;
    const out = (await completeChat(ep, [{ role: 'system', content: sys }, { role: 'user', content: usr }], undefined, { max_tokens: 1500, temperature: 0.3 })).trim();
    if (!out) return false;
    chat.summary = out; chat.summaryThrough = toSum[toSum.length - 1].id; chat.summaryAt = Date.now();
    await saveChat(id);
    if (current.view === 'chat' && current.id === id) renderMessages();
    return true;
  } finally { memBusy.delete('s' + id); }
}
async function maybeExtractNotes(id, force = false) {
  if (memBusy.has('n' + id)) return 0;
  const c = charById(id), chat = await getChat(id), ep = resolveChat(c);
  if (!c || !ep || !ep.key) return 0;
  const start = chat.notesThrough ? chat.messages.findIndex(m => m.id === chat.notesThrough) + 1 : 0;
  const unseen = chat.messages.slice(start).filter(m => !m.error);
  if (!unseen.length || (!force && unseen.length < NOTE_EVERY)) return 0;
  memBusy.add('n' + id);
  try {
    const notes = chat.notes || [];
    const sys = `너는 연애 롤플레이 채팅에서 캐릭터 '${c.name}'의 '기억 노트'를 관리한다. 대화에서 오래 기억해야 할 사실만 뽑는다:
사용자의 신상 정보(직업, 가족, 건강, 일정 등), 취향과 싫어하는 것, 약속, 기념일·중요한 날짜, 관계의 사건(고백, 첫 데이트, 다툼과 화해 등), 둘만의 별명이나 습관.
- 이미 기억 노트에 있는 내용과 겹치면 넣지 않는다. 일시적인 잡담·인사는 넣지 않는다.
- 각 항목은 한국어 한 문장, 60자 이내. 날짜가 있으면 포함. 최대 5개.
- 반드시 JSON만 출력: {"add": ["...", "..."]} (없으면 {"add": []})`;
    const usr = `[현재 기억 노트]\n${notes.map(n => '- ' + n.text).join('\n') || '(없음)'}\n\n[오늘 날짜] ${nowKorean()}\n\n[새 대화]\n${transcriptOf(unseen.slice(-40), c)}`;
    const raw = await completeChat(ep, [{ role: 'system', content: sys }, { role: 'user', content: usr }], undefined, { max_tokens: 1000, temperature: 0.2 });
    const m = raw.match(/\{[\s\S]*\}/); let add = [];
    try { add = (JSON.parse(m ? m[0] : raw).add || []).map(s => String(s).trim()).filter(Boolean); } catch {}
    const have = new Set(notes.map(n => n.text));
    const fresh = add.filter(t => !have.has(t)).slice(0, 5);
    chat.notes = notes.concat(fresh.map(text => ({ id: uid(), text, ts: Date.now(), auto: true })));
    chat.notesThrough = unseen[unseen.length - 1].id;
    await saveChat(id);
    if (fresh.length && current.view === 'chat' && current.id === id) toast(`🧠 ${c.name}이(가) 새로 기억했어요: ${fresh[0]}${fresh.length > 1 ? ` 외 ${fresh.length - 1}개` : ''}`, 2600);
    return fresh.length;
  } finally { memBusy.delete('n' + id); }
}
async function memorySheet(id) {
  const c = charById(id), chat = await getChat(id);
  const notes = chat.notes || [];
  const sumIdx = chat.summaryThrough ? chat.messages.findIndex(m => m.id === chat.summaryThrough) + 1 : 0;
  const ep = resolveChat(c);
  openSheet(`<div class="stitle"><b style="color:var(--text);font-size:16px">🧠 ${esc(c.name)}의 기억</b><br>대화가 길어지면 예전 대화는 요약해서, 중요한 사실은 기억 노트로 항상 기억해요</div>
    <div class="mem">
      <div class="memh">기억 노트 <span class="kv">${notes.length}개</span></div>
      <div id="noteList">${notes.map(n => `<div class="note-row" data-id="${n.id}"><textarea rows="1">${esc(n.text)}</textarea><button class="iconbtn ndel" aria-label="삭제">✕</button></div>`).join('') || '<div class="muted" id="noNotes">아직 기억 노트가 없어요. 대화하다 보면 자동으로 쌓여요.</div>'}</div>
      <div class="note-row"><textarea rows="1" id="newNote" placeholder="직접 추가 (예: 11월 3일은 우리 300일)"></textarea><button class="btn small" id="addNote">추가</button></div>
      <div class="memh" style="margin-top:14px">지난 이야기 요약 <span class="kv">${sumIdx ? `메시지 ${sumIdx}개 요약됨` : '아직 없음'}</span></div>
      <textarea id="sumText" rows="5" placeholder="대화가 기억 예산(${contextBudget(ep ? ep.model : '').toLocaleString()}자)을 넘으면 자동으로 요약돼요">${esc(chat.summary || '')}</textarea>
      <div class="row" style="margin-bottom:10px"><button class="btn small ghost" id="doExtract">✨ 대화에서 기억 추출</button><button class="btn small ghost" id="doSum">📝 지금 요약하기</button></div>
      <button class="btn primary block" id="memSave">저장</button>
    </div>`, el => {
    const list = $('#noteList', el);
    const bindDel = () => list.querySelectorAll('.ndel').forEach(b => b.onclick = () => b.parentElement.remove());
    bindDel();
    $('#addNote', el).onclick = () => {
      const t = $('#newNote', el).value.trim(); if (!t) return;
      $('#noNotes', el) && $('#noNotes', el).remove();
      list.insertAdjacentHTML('beforeend', `<div class="note-row" data-id="${uid()}"><textarea rows="1">${esc(t)}</textarea><button class="iconbtn ndel" aria-label="삭제">✕</button></div>`);
      $('#newNote', el).value = ''; bindDel();
    };
    const saveForm = async () => {
      const old = new Map((chat.notes || []).map(n => [n.id, n]));
      chat.notes = [...list.querySelectorAll('.note-row')].map(r => ({ ...(old.get(r.dataset.id) || { ts: Date.now() }), id: r.dataset.id, text: $('textarea', r).value.trim() })).filter(n => n.text);
      const s = $('#sumText', el).value.trim();
      if (s !== (chat.summary || '')) { chat.summary = s; if (!s) chat.summaryThrough = null; }
      await saveChat(id);
    };
    const busyBtn = async (btn, fn) => {
      if (needKey(c)) return; const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
      try { await saveForm(); await fn(); } catch (e) { toast(friendlyError(e), 4000); } finally { btn.disabled = false; btn.innerHTML = label; }
    };
    $('#doExtract', el).onclick = e => busyBtn(e.currentTarget, async () => { const n = await maybeExtractNotes(id, true); toast(n ? `${n}개를 새로 기억했어요` : '새로 기억할 내용이 없어요'); memorySheet(id); });
    $('#doSum', el).onclick = e => busyBtn(e.currentTarget, async () => { const ok = await maybeSummarize(id, true); toast(ok ? '요약했어요' : '요약할 대화가 충분하지 않아요'); memorySheet(id); });
    $('#memSave', el).onclick = async () => { await saveForm(); closeSheet(); toast('기억을 저장했어요'); };
  });
}

// ---------- quick model switcher (chat header) ----------
function modelSwitcher(id) {
  const c = charById(id); const st = S.settings; const provs = st.providers;
  if (!provs.length) { toast('설정에서 AI 연결을 먼저 추가해 주세요'); go('#/settings'); return; }
  const own = !!(c.chatProviderId && provById(c.chatProviderId));
  const cur = resolveChat(c);
  openSheet(`<div class="stitle"><b style="color:var(--text);font-size:16px">🤖 대화에 쓸 AI</b></div>
    <div class="mem">
      <div class="field"><label>연결</label><select id="swProv">${provs.map(p => `<option value="${p.id}" ${p.id === cur.p.id ? 'selected' : ''}>${esc(p.name)} · ${esc(presetOf(p).label)}${p.apiKey ? '' : ' (키 없음)'}</option>`).join('')}</select></div>
      <div class="field"><label>모델</label><input id="swModel" value="${esc(cur.model)}" list="swList" autocapitalize="off" autocorrect="off" spellcheck="false"><datalist id="swList"></datalist>
        <div class="hint"><button class="btn small ghost" id="swLoad" type="button">모델 목록 불러오기</button></div></div>
      <div class="field"><label>이 모델의 기억 예산 (글자 수)</label><input id="swBudget" inputmode="numeric" value="${esc(st.contextByModel[cur.model] || '')}" placeholder="${DEFAULT_CONTEXT} (기본)">
        <div class="hint">최근 대화를 이만큼 그대로 보내고, 넘치는 예전 대화는 요약해요. 클수록 잘 기억하지만 요금이 늘어요.</div></div>
      <div class="field toggle"><label style="margin:0">${esc(c.name)}에게만 적용</label><input type="checkbox" id="swOwn" ${own ? 'checked' : ''} style="width:22px;height:22px;accent-color:#ec4899"></div>
      <button class="btn primary block" id="swSave">적용</button>
    </div>`, el => {
    const syncBudget = () => { $('#swBudget', el).value = S.settings.contextByModel[$('#swModel', el).value.trim()] || ''; };
    $('#swProv', el).onchange = () => { const p = provById($('#swProv', el).value); $('#swModel', el).value = p.model || ''; syncBudget(); };
    $('#swModel', el).addEventListener('change', syncBudget);
    $('#swLoad', el).onclick = async () => {
      const p = provById($('#swProv', el).value);
      try { const ids = await fetchModels(p.baseUrl, p.apiKey); $('#swList', el).innerHTML = ids.map(i => `<option value="${esc(i)}">`).join(''); toast(`모델 ${ids.length}개 — 모델 칸을 눌러 골라 보세요`); }
      catch (e) { toast(friendlyError(e), 4000); }
    };
    $('#swSave', el).onclick = async () => {
      const pid = $('#swProv', el).value, model = $('#swModel', el).value.trim();
      const s = S.settings; const b = +$('#swBudget', el).value;
      if (model) { if (b > 0) s.contextByModel[model] = b; else delete s.contextByModel[model]; }
      if ($('#swOwn', el).checked) { c.chatProviderId = pid; c.chatModel = model; await saveCharacters(); }
      else {
        if (own) { c.chatProviderId = ''; c.chatModel = ''; await saveCharacters(); }
        s.chatProviderId = pid; s.chatModel = model;
      }
      S.settings = s; closeSheet(); toast('🤖 ' + (model || '기본 모델') + ' 로 바꿨어요'); renderChat(id);
    };
  });
}

// ---------- SETTINGS ----------
function renderSettings() {
  current = { view: 'settings' };
  const st = S.settings, p = S.profile, provs = st.providers;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const chatEp = resolveChat(null), imgEp = resolveImage();
  const provOpts = sel => provs.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)} · ${esc(presetOf(x).label)}</option>`).join('');
  $('#app').innerHTML = `<div class="screen settings">
    <div class="topbar"><button class="iconbtn" id="back" aria-label="뒤로">${ICON.back}</button><div class="title">설정</div></div>
    <div class="scroll"><div class="form">
      <div class="section"><h3>내 프로필</h3>
        <div class="field"><label>내 이름</label><input id="p_name" value="${esc(p.name)}" placeholder="예: 재균"></div>
        <div class="field"><label>캐릭터가 나를 부르는 호칭</label><input id="p_callName" value="${esc(p.callName)}" placeholder="예: 자기야, 재균아, 오빠"></div>
        <div class="field"><label>나에 대해 (캐릭터가 알고 있을 정보)</label><textarea id="p_about" placeholder="예: 29살 개발자, 야근이 잦음, 커피와 축구를 좋아함">${esc(p.about)}</textarea></div>
      </div>
      <div class="section"><h3>AI 연결</h3>
        <div class="tip">💡 <b>xAI(Grok)</b> API는 선불 크레딧을 충전해야 쓸 수 있어요. 무료로 대화만 하고 싶다면 <b>Google Gemini</b>(AI Studio 무료 키) 또는 <b>OpenRouter</b>의 이름이 <b>:free</b>로 끝나는 무료 모델을 채팅용으로 쓰면 돼요. 사진 생성은 대부분 유료예요.</div>
        <div id="provList">${provs.map(x => `<button class="pcard" data-id="${x.id}" type="button">
            <div class="pname">${esc(x.name)} <span class="ptag">${esc(presetOf(x).label)}</span></div>
            <div class="pmeta">${esc(x.model || '모델 미지정')}${x.imageModel ? ' · 🖼 ' + esc(x.imageModel) : ''}</div>
            <div class="pkey ${x.apiKey ? 'ok' : ''}">${x.apiKey ? '● 키 저장됨' : '○ 키 없음'}</div></button>`).join('') || '<div class="muted" style="padding:4px 2px 10px">아직 연결이 없어요. 아래에서 추가해 주세요.</div>'}</div>
        <button class="btn block" id="addProv" type="button">＋ 연결 추가</button>
        <div class="hint muted" style="margin-top:8px">API 키는 이 휴대폰의 브라우저 저장소에만 보관되고, 해당 API 주소로만 전송돼요.</div>
      </div>
      <div class="section"><h3>채팅에 쓸 AI</h3>
        ${provs.length ? `
        <div class="field"><label>연결</label><select id="s_chatProviderId">${provOpts(chatEp && chatEp.p.id)}</select></div>
        <div class="field"><label>모델</label><input id="s_chatModel" value="${esc(chatEp ? chatEp.model : '')}" list="chatModels" autocapitalize="off" autocorrect="off" spellcheck="false"><datalist id="chatModels"></datalist>
          <div class="hint"><button class="btn small ghost" id="loadChatModels" type="button">모델 목록 불러오기</button> <label class="kv" id="freeWrap" hidden><input type="checkbox" id="freeOnly" checked> 무료(:free)만</label></div></div>
        <div class="field"><label>이 모델의 기억 예산 (글자 수)</label><input id="s_budget" inputmode="numeric" value="${esc(chatEp ? (st.contextByModel[chatEp.model] || '') : '')}" placeholder="${DEFAULT_CONTEXT} (기본)">
          <div class="hint">최근 대화를 이만큼 그대로 보내고, 넘치는 예전 대화는 자동 요약해서 기억해요. 모델마다 따로 저장돼요.</div></div>
        <div style="margin-top:6px"><button class="btn small" id="test" type="button">연결 테스트</button> <span class="kv" id="testOut"></span></div>
        <div class="hint muted" style="margin-top:8px">캐릭터마다 다른 모델을 쓰려면 캐릭터 수정 화면이나 대화방 ⋮ 메뉴 → ‘AI 모델 바꾸기’에서 바꿀 수 있어요.</div>`
        : '<div class="muted">먼저 위에서 AI 연결을 추가해 주세요.</div>'}
      </div>
      <div class="section"><h3>사진 생성</h3>
        <div class="field toggle"><label style="margin:0">사진 생성 기능 사용</label><input type="checkbox" id="s_imgEnabled" ${st.imgEnabled ? 'checked' : ''} style="width:22px;height:22px;accent-color:#ec4899"></div>
        ${provs.length ? `
        <div class="field"><label>연결</label><select id="s_imgProviderId">${provOpts(imgEp && imgEp.p.id)}</select></div>
        <div class="field"><label>이미지 모델</label><input id="s_imgModel" value="${esc(imgEp ? imgEp.model : '')}" placeholder="예: grok-imagine-image-2.0 / gpt-image-1" autocapitalize="off" spellcheck="false"></div>` : ''}
        <div class="hint muted">대화 중 📷 버튼을 누르면 AI가 지금 대화 상황(장소·옷·분위기)에 맞는 장면을 정하고, 캐릭터의 ‘외모’ 설정을 항상 넣어서 사진을 만들어요. 이미지 API는 장당 요금이 들어요 (xAI Grok Imagine, OpenAI gpt-image-1 등).</div>
      </div>
      <div class="section"><h3>성인 모드 (19+)</h3>
        <div class="field toggle"><label style="margin:0">성인 모드 사용</label><input type="checkbox" id="s_adultMode" ${st.adultMode ? 'checked' : ''} style="width:22px;height:22px;accent-color:#ec4899"></div>
        <div class="hint muted">켜면 성인 연인 사이의 성숙한·성적인 대화를 허용해요. 모든 캐릭터는 19세 이상이어야 하고, 미성년자 연상·비동의 내용은 항상 금지돼요. 사진은 성인 모드에서도 노출 없는(no nudity) 분위기 있는 사진까지만 만들어요.<br>⚠️ OpenAI·Gemini 등 일부 서비스는 이런 대화를 거절할 수 있어요. Grok이나 OpenRouter의 일부 모델이 더 허용적인 편이에요.</div>
      </div>
      <div class="section"><h3>고급</h3>
        <div class="row">
          <div class="field"><label>창의성 (temperature)</label><input id="s_temperature" value="${esc(st.temperature)}" inputmode="decimal" placeholder="비우면 기본값"></div>
          <div class="field"><label>최대 답장 길이 (토큰)</label><input id="s_maxTokens" value="${esc(st.maxTokens)}" inputmode="numeric"></div>
        </div>
        <div class="field"><label>한 번에 보낼 최대 메시지 수</label><input id="s_maxMessages" value="${esc(st.maxMessages)}" inputmode="numeric"></div>
      </div>
      <div class="section"><h3>백업</h3>
        <div class="row"><button class="btn ghost" id="exp" type="button">⬇️ 내보내기</button><label class="btn ghost">⬆️ 가져오기<input type="file" id="imp" accept="application/json,.json" hidden></label></div>
        <div class="field toggle" style="margin-top:10px"><label style="margin:0;font-weight:500">내보낼 때 API 키 포함</label><input type="checkbox" id="expKey" style="width:20px;height:20px;accent-color:#ec4899"></div>
        <div class="hint muted" id="usage"></div>
      </div>
      <div class="section"><h3>홈 화면에 추가</h3><div class="muted">${isIOS ? 'Safari 아래쪽 공유 버튼(□↑) → ‘홈 화면에 추가’를 누르면 앱처럼 쓸 수 있어요.' : 'Chrome 오른쪽 위 ⋮ 메뉴 → ‘홈 화면에 추가’ 또는 ‘앱 설치’를 누르면 앱처럼 쓸 수 있어요.'}</div></div>
      <div class="section"><h3>전체 삭제</h3><button class="btn danger block" id="wipe" type="button">모든 캐릭터·대화·설정 삭제</button></div>
      <div class="muted" style="text-align:center;padding:4px 0 10px">설렘톡 · 모든 데이터는 이 기기에만 저장돼요</div>
    </div></div>
    <div class="savebar"><button class="btn primary" id="save">저장</button></div>
  </div>`;
  const val = sel => { const e = $(sel); return e ? e.value.trim() : null; };
  const save = quiet => {
    const s = S.settings;
    for (const k of ['temperature', 'maxTokens', 'maxMessages']) s[k] = val('#s_' + k);
    s.imgEnabled = $('#s_imgEnabled').checked;
    s.adultMode = $('#s_adultMode').checked;
    if ($('#s_chatProviderId')) {
      s.chatProviderId = val('#s_chatProviderId'); s.chatModel = val('#s_chatModel');
      const b = +val('#s_budget'); if (s.chatModel) { if (b > 0) s.contextByModel[s.chatModel] = b; else delete s.contextByModel[s.chatModel]; }
    }
    if ($('#s_imgProviderId')) { s.imgProviderId = val('#s_imgProviderId'); s.imgModel = val('#s_imgModel'); }
    S.settings = s;
    S.profile = { name: val('#p_name'), callName: val('#p_callName'), about: val('#p_about') };
    if (!quiet) toast('저장했어요');
  };
  $('#back').onclick = () => { save(true); history.length > 1 ? history.back() : go('#/'); };
  $('#save').onclick = () => { save(); setTimeout(() => go('#/'), 300); };
  $('#addProv').onclick = () => { save(true); providerSheet(null); };
  document.querySelectorAll('.pcard').forEach(b => b.onclick = () => { save(true); providerSheet(b.dataset.id); });
  if ($('#s_chatProviderId')) {
    const syncFree = () => { const pr = provById(val('#s_chatProviderId')); $('#freeWrap').hidden = !(pr && pr.preset === 'openrouter'); };
    syncFree();
    $('#s_chatProviderId').onchange = () => { const pr = provById(val('#s_chatProviderId')); $('#s_chatModel').value = pr.model || ''; $('#s_budget').value = S.settings.contextByModel[pr.model] || ''; syncFree(); };
    $('#s_chatModel').onchange = () => { $('#s_budget').value = S.settings.contextByModel[val('#s_chatModel')] || ''; };
    $('#loadChatModels').onclick = async () => {
      const pr = provById(val('#s_chatProviderId'));
      try {
        let ids = await fetchModels(pr.baseUrl, pr.apiKey);
        if (pr.preset === 'openrouter' && $('#freeOnly').checked) ids = ids.filter(i => /:free$/.test(i));
        $('#chatModels').innerHTML = ids.map(i => `<option value="${esc(i)}">`).join(''); toast(`모델 ${ids.length}개 — 모델 칸을 눌러 골라 보세요`, 3000);
      } catch (e) { toast(friendlyError(e), 4500); }
    };
    $('#test').onclick = async () => {
      save(true); const out = $('#testOut'); if (needKey(null)) return; out.innerHTML = '<span class="spin"></span>';
      try { const t = await completeChat(resolveChat(null), [{ role: 'user', content: '한 단어로만 대답해: 안녕?' }], undefined, { max_tokens: 200 }); out.textContent = '✅ 성공: ' + (t.trim().slice(0, 40) || '(빈 응답)'); }
      catch (e) { out.textContent = '❌ ' + friendlyError(e); }
    };
  }
  $('#s_adultMode').onchange = async e => {
    if (!e.target.checked) return;
    e.target.checked = false;
    const ok = await confirmSheet('만 19세 이상이며 성인용 대화에 동의합니다', '동의하고 켜기', false);
    if (!ok) return;
    e.target.checked = true; save(true);
    const young = characters.filter(c => !(parseInt(String(c.age || '').replace(/[^0-9]/g, ''), 10) >= 19));
    toast(young.length ? `성인 모드를 켰어요. ${young.map(c => c.name).join(', ')}의 나이를 19세 이상으로 설정해 주세요` : '성인 모드를 켰어요 🔞', 4000);
  };
  if ($('#s_imgProviderId')) $('#s_imgProviderId').onchange = () => { const pr = provById(val('#s_imgProviderId')); $('#s_imgModel').value = pr.imageModel || presetOf(pr).imageModel || ''; };
  $('#exp').onclick = () => exportBackup($('#expKey').checked);
  $('#imp').onchange = e => { const f = e.target.files[0]; if (f) importBackup(f); e.target.value = ''; };
  $('#wipe').onclick = async () => {
    if (!await confirmSheet('정말 모든 데이터를 삭제할까요? 백업하지 않았다면 되돌릴 수 없어요.', '전부 삭제')) return;
    for (const k of await DB.keys()) await DB.del(k);
    localStorage.removeItem('seollem.settings'); localStorage.removeItem('seollem.profile');
    characters = []; chatCache.clear(); toast('모두 삭제했어요'); go('#/');
  };
  if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { $('#usage') && ($('#usage').textContent = `사용 중인 저장 공간: 약 ${(e.usage / 1048576).toFixed(1)}MB`); });
}
function providerSheet(pid) {
  const s = S.settings; const x = pid ? { ...provById(pid) } : { id: '', preset: 'xai', name: '', baseUrl: PRESETS.xai.base, apiKey: '', model: PRESETS.xai.model, imageModel: PRESETS.xai.imageModel, reasoningEffort: PRESETS.xai.reasoning };
  const hints = {
    xai: 'console.x.ai 에서 키 발급 · 선불 크레딧 충전 필요. 채팅 grok-4.7, 사진 grok-imagine-image-2.0',
    openai: 'platform.openai.com 에서 키 발급 (유료). 사진은 gpt-image-1',
    gemini: 'aistudio.google.com 에서 무료 키 발급. 무료 등급으로 채팅 가능 (gemini-3.8-flash 등). 사진 모델은 유료',
    openrouter: 'openrouter.ai 에서 키 발급. 모델 이름이 :free 로 끝나는 무료 모델은 요금 없이 쓸 수 있어요 (일일 횟수 제한)',
    custom: 'OpenAI 호환 /chat/completions 를 지원하는 주소 (끝은 보통 /v1)',
  };
  openSheet(`<div class="stitle"><b style="color:var(--text);font-size:16px">${pid ? 'AI 연결 수정' : 'AI 연결 추가'}</b></div>
    <div class="mem">
      <div class="field"><label>서비스</label><select id="pv_preset">${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}" ${k === x.preset ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select><div class="hint" id="pvHint"></div></div>
      <div class="field"><label>이름 (구분용)</label><input id="pv_name" value="${esc(x.name)}" placeholder="예: 내 Grok, 무료 Gemini"></div>
      <div class="field"><label>API 주소 (Base URL)</label><input id="pv_baseUrl" value="${esc(x.baseUrl)}" placeholder="https://.../v1" autocapitalize="off" autocorrect="off" spellcheck="false"></div>
      <div class="field"><label>API 키</label><input id="pv_apiKey" type="password" value="${esc(x.apiKey)}" placeholder="${esc(presetOf(x).keyPh || 'API 키')}" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      <div class="field"><label>기본 채팅 모델</label><input id="pv_model" value="${esc(x.model)}" list="pvModels" autocapitalize="off" autocorrect="off" spellcheck="false"><datalist id="pvModels"></datalist>
        <div class="hint"><button class="btn small ghost" id="pvLoad" type="button">모델 목록 불러오기</button></div></div>
      <div class="row">
        <div class="field"><label>이미지 모델</label><input id="pv_imageModel" value="${esc(x.imageModel || '')}" placeholder="없으면 비워두기" autocapitalize="off" spellcheck="false"></div>
        <div class="field"><label>추론 강도</label><select id="pv_reasoningEffort">${['', 'low', 'medium', 'high'].map(v => `<option value="${v}" ${(x.reasoningEffort || '') === v ? 'selected' : ''}>${v || '보내지 않음'}</option>`).join('')}</select></div>
      </div>
      <div class="hint muted" style="margin:-4px 0 12px">추론 강도 low는 답장을 빠르고 저렴하게 해 줘요 (지원하는 모델만).</div>
      <div class="field"><label>참고 이미지 지원 (프로필 사진 기준 사진 생성)</label><select id="pv_refMode">${[['auto', '자동 (xAI·OpenAI gpt-image·OpenRouter 지원)'], ['on', '지원함'], ['off', '사용 안 함']].map(([v, l]) => `<option value="${v}" ${(x.refMode || 'auto') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <div class="hint">지원하지 않거나 실패하면 외모 설명만으로 만들어요. Gemini 호환 주소는 미지원이에요.</div></div>
      <div class="row">${pid ? '<button class="btn danger" id="pvDel" type="button">삭제</button>' : ''}<button class="btn primary" id="pvSave" type="button">저장</button></div>
    </div>`, el => {
    const hint = () => { $('#pvHint', el).textContent = hints[$('#pv_preset', el).value] || ''; };
    hint();
    $('#pv_preset', el).onchange = () => {
      const pr = PRESETS[$('#pv_preset', el).value];
      $('#pv_baseUrl', el).value = pr.base; $('#pv_model', el).value = pr.model; $('#pv_imageModel', el).value = pr.imageModel; $('#pv_reasoningEffort', el).value = pr.reasoning;
      $('#pv_apiKey', el).placeholder = pr.keyPh || 'API 키'; hint();
    };
    $('#pvLoad', el).onclick = async () => {
      try {
        let ids = await fetchModels($('#pv_baseUrl', el).value, $('#pv_apiKey', el).value.trim());
        $('#pvModels', el).innerHTML = ids.map(i => `<option value="${esc(i)}">`).join('');
        const free = ids.filter(i => /:free$/.test(i)).length;
        toast(`모델 ${ids.length}개${free ? ` (무료 ${free}개)` : ''} — 모델 칸을 눌러 골라 보세요`, 3000);
      } catch (e) { toast(friendlyError(e), 4500); }
    };
    $('#pvSave', el).onclick = () => {
      const o = { ...x };
      for (const k of ['preset', 'name', 'baseUrl', 'apiKey', 'model', 'imageModel', 'reasoningEffort', 'refMode']) o[k] = $('#pv_' + k, el).value.trim();
      if (!o.baseUrl) { toast('API 주소를 입력해 주세요'); return; }
      if (!o.name) o.name = PRESETS[o.preset].label;
      const st = S.settings;
      if (!o.id) { o.id = uid(); st.providers.push(o); if (!provById(st.chatProviderId) || st.providers.length === 1) { st.chatProviderId = o.id; st.chatModel = ''; } }
      else st.providers[st.providers.findIndex(q => q.id === o.id)] = o;
      if (!st.imgProviderId && PRESETS[o.preset].imageModel) { st.imgProviderId = o.id; st.imgModel = ''; }
      S.settings = st; closeSheet(); toast('저장했어요'); renderSettings();
    };
    $('#pvDel', el) && ($('#pvDel', el).onclick = async () => {
      if (!await confirmSheet(`'${x.name}' 연결을 삭제할까요?`, '삭제')) return;
      const st = S.settings; st.providers = st.providers.filter(q => q.id !== pid);
      if (st.chatProviderId === pid) { st.chatProviderId = st.providers[0] ? st.providers[0].id : ''; st.chatModel = ''; }
      if (st.imgProviderId === pid) { st.imgProviderId = ''; st.imgModel = ''; }
      S.settings = st; renderSettings();
    });
  });
}
async function exportBackup(includeKey) {
  const chats = {}; for (const c of characters) chats[c.id] = await getChat(c.id);
  const settings = S.settings; if (!includeKey) settings.providers = settings.providers.map(p => ({ ...p, apiKey: '' }));
  const data = { app: 'seollem-talk', version: 1, exportedAt: new Date().toISOString(), profile: S.profile, settings, characters, chats };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const d = new Date(); const name = `seollem-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] }) && 'ontouchstart' in window) {
    try { await navigator.share({ files: [file], title: '설렘톡 백업' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000); toast('백업 파일을 저장했어요');
}
async function importBackup(f) {
  let data; try { data = JSON.parse(await f.text()); } catch { toast('백업 파일을 읽지 못했어요'); return; }
  if (data.app !== 'seollem-talk' || !Array.isArray(data.characters)) { toast('설렘톡 백업 파일이 아니에요'); return; }
  if (!await confirmSheet(`백업(캐릭터 ${data.characters.length}명)을 불러올까요? 같은 캐릭터는 백업 내용으로 덮어써요.`, '불러오기', false)) return;
  for (const c of data.characters) {
    const i = characters.findIndex(x => x.id === c.id); if (i >= 0) characters[i] = c; else characters.push(c);
    const chat = data.chats && data.chats[c.id]; if (chat) { chatCache.set(c.id, chat); await saveChat(c.id); }
  }
  await saveCharacters();
  if (data.profile) S.profile = { ...S.profile, ...data.profile };
  if (data.settings) {
    const cur = S.settings; const s = { ...cur, ...data.settings, contextByModel: { ...cur.contextByModel, ...(data.settings.contextByModel || {}) } };
    const merged = [...cur.providers];
    for (const p of data.settings.providers || []) {
      const i = merged.findIndex(q => q.id === p.id);
      if (i >= 0) merged[i] = { ...p, apiKey: p.apiKey || merged[i].apiKey }; else merged.push(p);
    }
    s.providers = merged; S.settings = s;
  }
  toast('불러왔어요 💾'); go('#/');
}

// ---------- boot ----------
(async function boot() {
  try { await loadCharacters(); } catch (e) { $('#app').innerHTML = `<div class="empty">저장소를 열 수 없어요 (사생활 보호 모드에서는 동작하지 않을 수 있어요)<br>${esc(e.message)}</div>`; return; }
  try {
    const raw = JSON.parse(localStorage.getItem('seollem.settings') || '{}');
    if (raw.apiKey && !Array.isArray(raw.providers)) {
      const preset = PRESETS[raw.provider] ? raw.provider : 'custom';
      const p = { id: uid(), preset, name: PRESETS[preset].label, baseUrl: raw.baseUrl || '', apiKey: raw.apiKey, model: raw.model || '', imageModel: raw.imgModel || PRESETS[preset].imageModel, reasoningEffort: raw.reasoningEffort || '' };
      S.settings = { ...DEFAULT_SETTINGS, temperature: raw.temperature ?? '0.9', maxTokens: raw.maxTokens || '600', imgEnabled: raw.imgEnabled !== false, providers: [p], chatProviderId: p.id, imgProviderId: p.id };
    }
  } catch {}
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();

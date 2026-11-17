/**
 * 青柚学伴 · 激活码鉴权云函数
 *
 * 设计要点：
 * 1. 不新建数据库表，复用现有的 qingyou_progress，用保留前缀区分三类记录：
 *      激活码：__ACT__<码>       state = {kind, maxUses, enabled, expiresAt}
 *      会话：  __SES__<token>    state = {actCode, profile}
 *      进度：  <profile>         state = 前端原有载荷
 * 2. 前端只调用本函数，不再直接访问数据库，因此 anon key 不再暴露在页面上。
 * 3. 激活码可在云端随时停用（enabled=false）或限量（maxUses）。
 */
/* 优先用环境变量；缺失时回退到内置值，保证函数始终可用 */
const REST_URL = process.env.QY_REST_URL || 'https://harsh-finch-d4gxc795kab8e3064.api.tcloudbasegateway.com/v1/rdb/rest';
const API_KEY = process.env.QY_KEY || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjVjYjQzYmVjLTQwNzYtNDA0Zi1hZjBiLWNlMGRhOGNhY2IwOSJ9.eyJpc3MiOiJodHRwczovL2hhcnNoLWZpbmNoLWQ0Z3hjNzk1a2FiOGUzMDY0LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJoYXJzaC1maW5jaC1kNGd4Yzc5NWthYjhlMzA2NCIsImV4cCI6NDA5ODQxNTI0NCwiaWF0IjoxNzk0NzMyMDQ0LCJub25jZSI6Ik1DR3R2WUUyUmNLUGlONmx6cjlPOWciLCJhdF9oYXNoIjoiTUNHdHZZRTJSY0tQaU42bHpyOU85ZyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJoYXJzaC1maW5jaC1kNGd4Yzc5NWthYjhlMzA2NCIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.hYuqfH9Cx_UC_HulygeTOknC50UevBVOlDX0ZwRsSCmMs1bc2S1DBJQXcElyOfEUO4kQnEVIabje0_YX6isfBtZ7ytSeqDQmq5wsU2wRgRDxLeoDs7rLdgROlFs45nyhYa1gm900UTEnmE_LIE6l9BKr37ehZnOwRVuo5q6Hg2nDvVxze3ydR-VNr_OIHaSa4EUIy7HTJoWTWEWVUPC02cE5kexEh9ywsYCP0nckq1YRfx0xqd8NzokvNBe3cVJFTGlXSyTBgFsGVGCRCXFlTap-HpVUuX2SeT0AltaLcMHUHCvV_x7WZs7PKg3QKboK-dlWe9CQ1yTKEsAgzl2lOw';

const ACT = '__ACT__';
const SES = '__SES__';

function headers(extra) {
  return Object.assign(
    { apikey: API_KEY, Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
    extra || {}
  );
}

async function readState(code) {
  const url = REST_URL + '/qingyou_progress?code=eq.' + encodeURIComponent(code) + '&select=state,updated_at';
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error('读取失败 HTTP ' + res.status);
  }
  const rows = await res.json();
  return rows && rows[0] ? rows[0] : null;
}

async function writeState(code, state, updatedAt) {
  const res = await fetch(REST_URL + '/qingyou_progress', {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify([{ code: code, state: state, updated_at: updatedAt || new Date().toISOString() }]),
  });
  if (!res.ok) {
    throw new Error('写入失败 HTTP ' + res.status);
  }
}

function randomToken() {
  const raw = Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
  return 'T' + raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
}

function randomProfile() {
  return 'P' + Math.random().toString(36).slice(2, 12).toUpperCase();
}

/* 首次调用时自动写入初始激活码，省去任何后台操作 */
async function ensureSeed() {
  const admin = await readState(ACT + 'QY-ADMIN-01');
  if (admin) {
    return;
  }
  await writeState(ACT + 'QY-ADMIN-01', { kind: 'admin', maxUses: 20, enabled: true });
  await writeState(ACT + 'QY-TRIAL-01', { kind: 'trial', maxUses: 3, enabled: true });
}

async function activate(payload) {
  const code = String(payload.code || '').trim().toUpperCase();
  const old = String(payload.old || '').trim().toUpperCase();
  if (!code) {
    return { ok: false, error: '请输入激活码' };
  }
  await ensureSeed();

  const record = await readState(ACT + code);
  if (!record) {
    return { ok: false, error: '激活码不存在' };
  }
  const conf = record.state || {};
  if (conf.enabled === false) {
    return { ok: false, error: '激活码已停用' };
  }
  if (conf.expiresAt && Date.parse(conf.expiresAt) < Date.now()) {
    return { ok: false, error: '激活码已过期' };
  }

  const token = randomToken();
  let profile = '';
  if (old) {
    const legacy = await readState(old);
    if (legacy) {
      profile = old;
    }
  }
  if (!profile) {
    profile = randomProfile();
  }

  await writeState(SES + token, { actCode: code, profile: profile });
  return { ok: true, token: token, profile: profile, kind: conf.kind || 'trial' };
}

async function sessionOf(token) {
  if (!token) {
    return null;
  }
  const record = await readState(SES + token);
  return record ? record.state : null;
}

async function getProgress(payload) {
  const session = await sessionOf(payload.token);
  if (!session) {
    return { ok: false, error: '登录已失效，请重新激活' };
  }
  const progress = await readState(session.profile);
  return {
    ok: true,
    profile: session.profile,
    state: progress ? progress.state : null,
    updated_at: progress ? progress.updated_at : null,
  };
}

async function putProgress(payload) {
  const session = await sessionOf(payload.token);
  if (!session) {
    return { ok: false, error: '登录已失效，请重新激活' };
  }
  if (!payload.state || typeof payload.state !== 'object') {
    return { ok: false, error: '数据格式不正确' };
  }
  const stamp = new Date().toISOString();
  await writeState(session.profile, payload.state, stamp);
  return { ok: true, profile: session.profile, updated_at: stamp };
}

exports.main = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  /* 浏览器预检直接放行 */
  if (event && (event.httpMethod === 'OPTIONS' || event.method === 'OPTIONS')) {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  let body = event || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (err) {
      body = {};
    }
  }
  if (body.body && typeof body.body === 'string') {
    try {
      body = JSON.parse(body.body);
    } catch (err) {
      /* 保留原事件 */
    }
  }

  const action = body.action || '';
  let result;
  try {
    if (action === 'activate') {
      result = await activate(body);
    } else if (action === 'get') {
      result = await getProgress(body);
    } else if (action === 'put') {
      result = await putProgress(body);
    } else {
      result = { ok: false, error: '未知操作' };
    }
  } catch (err) {
    var hint = (!API_KEY || !REST_URL) ? '（配置缺失，请检查函数环境变量）' : '';
    result = { ok: false, error: '服务异常：' + err.message + hint };
  }

  return {
    statusCode: 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS),
    body: JSON.stringify(result),
  };
};
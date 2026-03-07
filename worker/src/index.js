const TELEGRAM_CHAT_ID = '5399533539';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function esc(s) {
  if (!s) return '';
  return String(s).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function formatTelegram(data) {
  const { despacho, contacto, contactInfo, preguntas } = data;

  let msg = `📋 *Nuevo Discovery Brief*\n\n`;
  msg += `🏢 *Despacho:* ${esc(despacho)}\n`;
  msg += `👤 *Contacto:* ${esc(contacto)}\n`;
  msg += `📞 *Email/Tel:* ${esc(contactInfo)}\n`;
  msg += `\n─────────────────────\n\n`;

  if (Array.isArray(preguntas)) {
    for (const p of preguntas) {
      msg += `*${esc(p.tag)}*\n_${esc(p.pregunta)}_\n\n${esc(p.respuesta)}\n\n`;
    }
  } else if (typeof preguntas === 'object') {
    for (const [key, val] of Object.entries(preguntas)) {
      msg += `*${esc(key)}*\n${esc(val)}\n\n`;
    }
  }

  const numArchivos = data.archivos?.length || 0;
  if (numArchivos > 0) {
    msg += `\n📎 *${numArchivos} archivo${numArchivos > 1 ? 's' : ''} adjunto${numArchivos > 1 ? 's' : ''}* \\(enviados abajo\\)\n`;
  }

  return msg.trim();
}

async function sendTelegramMessage(token, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'MarkdownV2',
    }),
  });
  return res.json();
}

async function sendTelegramDocument(token, fileBuffer, filename, caption) {
  const form = new FormData();
  form.append('chat_id', TELEGRAM_CHAT_ID);
  form.append('document', new Blob([fileBuffer]), filename);
  if (caption) form.append('caption', caption);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const data = await request.json();
      const text = formatTelegram(data);

      // Send main message
      const result = await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, text);
      if (!result.ok) {
        console.error('Telegram error:', JSON.stringify(result));
        return new Response(JSON.stringify({ error: 'Failed to send', detail: result }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Send file attachments
      if (Array.isArray(data.archivos) && data.archivos.length > 0) {
        for (const archivo of data.archivos) {
          try {
            const buffer = base64ToArrayBuffer(archivo.data);
            const caption = `📎 ${archivo.name} (${(archivo.size / 1024).toFixed(0)} KB) — de ${data.despacho || 'Discovery'}`;
            await sendTelegramDocument(env.TELEGRAM_BOT_TOKEN, buffer, archivo.name, caption);
          } catch (e) {
            console.error('File send error:', archivo.name, e.message);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};

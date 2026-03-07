const TELEGRAM_CHAT_ID = '5399533539';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

  return msg.trim();
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
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

      const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const res = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'MarkdownV2',
        }),
      });

      const result = await res.json();
      if (!result.ok) {
        console.error('Telegram error:', JSON.stringify(result));
        return new Response(JSON.stringify({ error: 'Failed to send to Telegram', detail: result }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
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

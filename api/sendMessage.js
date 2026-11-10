export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const token = process.env.TELEGRAM_TOKEN;
  const chat_id = process.env.TELEGRAM_CHAT_ID;
  
  // Si envías el texto unificado desde tu interfaz, lo toma de req.body.text.
  // Si no, puedes estructurarlo aquí mismo para que siempre llegue completo.
  const textoMensaje = req.body.text || "⚠️ Faltan datos por consolidar.";

  const body = {
    chat_id,
    text: textoMensaje,
    parse_mode: 'Markdown', // Permite usar negritas y formato limpio
    reply_markup: req.body.reply_markup // Mantiene los botones interactivos abajo si los usas
  };
  
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await r.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}

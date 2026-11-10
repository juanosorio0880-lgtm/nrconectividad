export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const token = process.env.TELEGRAM_TOKEN;
  const chat_id = process.env.TELEGRAM_CHAT_ID;
  
  // Puedes unificar tu texto directamente aquí o recibirlo listo desde el cuerpo de la petición (req.body)
  const textoUnificado = req.body.text || 
    "🌟 *¡Bienvenido!* 🌟\n\n" +
    "Aquí tienes toda tu información organizada en un solo mensaje:\n\n" +
    "• Detalle 1: ...\n" +
    "• Detalle 2: ...\n" +
    "• Detalle 3: ...";

  const body = {
    chat_id,
    text: textoUnificado,
    parse_mode: 'Markdown', // Te permite usar negritas (*) y cursivas (_)
    reply_markup: req.body.reply_markup // Si manejas botones interactivos abajo
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

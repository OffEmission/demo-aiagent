// netlify/functions/gemini.js
// Server-side proxy for Gemini API. The API key never touches the browser.

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'GEMINI_API_KEY is not set on the server' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const model = body.model || 'gemini-2.5-flash';
  const contents = body.contents || [];
  const systemInstruction = body.system_instruction || null;

  const allowedModels = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];
  if (!allowedModels.includes(model)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid model' }) };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
  };
  if (systemInstruction) payload.system_instruction = systemInstruction;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Upstream error: ' + err.message })
    };
  }
};

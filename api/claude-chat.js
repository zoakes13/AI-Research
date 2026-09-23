// api/claude-chat.js
// Vercel serverless function. Deployed automatically at:
//   https://<your-project>.vercel.app/api/claude-chat
//
// Setup:
//   1. Put this file at api/claude-chat.js (alongside your existing api/chat.js).
//   2. In Vercel's dashboard: Settings > Environment Variables,
//      add ANTHROPIC_API_KEY = your real key (a separate variable
//      from OPENAI_API_KEY — both can coexist in the same project).
//   3. Push to GitHub. Vercel redeploys automatically.

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

export default async function handler(req, res) {

    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, system, model, max_tokens, temperature } = req.body || {};

    // Basic validation — don't blindly forward arbitrary client input.
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
    }
    if (messages.length > 50) {
        return res.status(400).json({ error: 'conversation too long' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error('Missing ANTHROPIC_API_KEY environment variable');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    try {
        const upstream = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                // Note: no "anthropic-dangerous-direct-browser-access" header here —
                // this call happens server-to-server, so it isn't needed or wanted.
            },
            body: JSON.stringify({
                model: model || 'claude-sonnet-4-5-20250929',
                max_tokens: max_tokens || 1024,
                temperature: temperature != null ? temperature : 0.5,
                system: system || undefined,
                messages,
            }),
        });

        const data = await upstream.json();

        if (!upstream.ok) {
            return res.status(upstream.status).json(data);
        }

        return res.status(200).json(data);

    } catch (err) {
        console.error('Proxy error:', err);
        return res.status(500).json({ error: 'Internal proxy error' });
    }
}

// api/chat.js
// Vercel serverless function. Deployed automatically at:
//   https://<your-project>.vercel.app/api/chat
//
// Setup:
//   1. Put this file at api/chat.js in your repo.
//   2. In Vercel's dashboard: Settings > Environment Variables,
//      add OPENAI_API_KEY = your real key.
//   3. Push to GitHub / import into Vercel. No other config needed.

// Restrict which origin can call this endpoint. Set this to your
// actual Qualtrics domain, e.g. https://yourorg.qualtrics.com
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

export default async function handler(req, res) {

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight request handling
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { messages, model, max_completion_tokens } = req.body || {};

    // Basic validation — don't blindly forward arbitrary client input.
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
    }
    if (messages.length > 50) {
        return res.status(400).json({ error: 'conversation too long' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('Missing OPENAI_API_KEY environment variable');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    try {
        const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model || 'gpt-5',
                messages,
                max_completion_tokens: max_completion_tokens || 1024,
                reasoning_effort: 'minimal',
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

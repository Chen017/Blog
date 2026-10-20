import http from 'node:http';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const cookieName = 'cms_oauth_state';
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function createOAuthHandler({ siteUrl, clientId, clientSecret, repo = 'Chen017/Blog', allowedUsers = ['Chen017'] }, request = fetch) {
    const site = new URL(siteUrl);
    if (site.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(site.hostname)) throw new Error('CMS_SITE_URL must use HTTPS.');
    const origin = site.origin;
    const callback = `${origin}/oauth/callback`;
    const pending = new Map();
    const ready = Boolean(clientId && clientSecret);
    const stateCookie = value => `${cookieName}=${value}; Path=/oauth; HttpOnly; SameSite=Lax; Max-Age=${value ? 600 : 0}${site.protocol === 'https:' ? '; Secure' : ''}`;

    function text(res, status, message) {
        res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(message);
    }
    async function github(url, options = {}) {
        const response = await request(url, { ...options, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('GitHub request failed');
        return response.json();
    }
    return async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        const url = new URL(req.url, origin);
        if (req.method !== 'GET') return text(res, 405, 'Method not allowed');
        if (['/health', '/oauth/health'].includes(url.pathname)) return text(res, 200, ready ? 'ready' : 'OAuth credentials not configured');
        if (!['/oauth', '/oauth/', '/oauth/callback'].includes(url.pathname)) return text(res, 404, 'Not found');
        if (!ready) return text(res, 503, 'GitHub login is not configured. Set OAUTH_GITHUB_CLIENT_ID and OAUTH_GITHUB_CLIENT_SECRET on the server.');

        if (url.pathname !== '/oauth/callback') {
            if (url.searchParams.get('provider') && url.searchParams.get('provider') !== 'github') return text(res, 400, 'Unsupported provider');
            for (const [key, value] of pending) if (value.expires < Date.now()) pending.delete(key);
            if (pending.size >= 500) return text(res, 429, 'Please try again later');
            const state = randomBytes(32).toString('base64url');
            const verifier = randomBytes(32).toString('base64url');
            pending.set(state, { verifier, expires: Date.now() + 600000 });
            const target = new URL('https://github.com/login/oauth/authorize');
            target.search = new URLSearchParams({ client_id: clientId, redirect_uri: callback, scope: 'public_repo', state,
                code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
            res.setHeader('Set-Cookie', stateCookie(state));
            res.writeHead(302, { Location: target.href });
            return res.end();
        }

        const state = url.searchParams.get('state');
        const stored = pending.get(state);
        const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
        res.setHeader('Set-Cookie', stateCookie(''));
        if (!stored || !same(state, cookie) || stored.expires < Date.now()) return text(res, 400, 'Login expired or invalid. Please start again from /admin/.');
        pending.delete(state);
        if (url.searchParams.has('error')) return text(res, 400, 'GitHub login was cancelled. You can close this window.');
        const code = url.searchParams.get('code');
        if (!code) return text(res, 400, 'Missing authorization code');
        try {
            const token = await github('https://github.com/login/oauth/access_token', {
                method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: callback, code_verifier: stored.verifier }).toString(),
            });
            if (!token.access_token || token.error) throw new Error('No token');
            const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'Etalib-Blog-CMS' };
            const user = await github('https://api.github.com/user', { headers });
            if (!allowedUsers.some(login => login.toLowerCase() === user.login?.toLowerCase())) return text(res, 403, 'This account is not allowed to edit this blog.');
            const repository = await github(`https://api.github.com/repos/${repo}`, { headers });
            if (!repository.permissions?.push) return text(res, 403, 'This account does not have write access to the blog repository.');
            const nonce = randomBytes(18).toString('base64');
            const payload = JSON.stringify(`authorization:github:success:${JSON.stringify({ token: token.access_token, provider: 'github' })}`).replaceAll('<', '\\u003c');
            res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!doctype html><meta charset="utf-8"><title>GitHub login</title><p>登录完成，正在返回文章管理页面。</p><script nonce="${nonce}">
const origin=${JSON.stringify(origin)};
const target=window.opener;
if(target){window.addEventListener('message',function receive(event){
 if(event.source!==target||event.origin!==origin||event.data!=='authorizing:github')return;
 window.removeEventListener('message',receive);target.postMessage(${payload},origin);window.close();
});target.postMessage('authorizing:github',origin);}
</script>`);
        } catch {
            text(res, 502, 'GitHub login failed. Please start again from /admin/.');
        }
    };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const handler = createOAuthHandler({ siteUrl: process.env.CMS_SITE_URL || 'https://www.etalib.space',
        clientId: process.env.OAUTH_GITHUB_CLIENT_ID, clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
        repo: process.env.CMS_GITHUB_REPO || 'Chen017/Blog', allowedUsers: (process.env.CMS_ALLOWED_USERS || 'Chen017').split(',').map(v => v.trim()).filter(Boolean) });
    http.createServer((req, res) => { handler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end('Authentication service error'); }); })
        .listen(Number(process.env.PORT || 8081), '0.0.0.0', () => console.log('CMS authentication service started'));
}

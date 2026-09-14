const value = process.env.VITE_API_URL;
let url;
try { url = new URL(value); } catch { /* Report a clear configuration error below. */ }
const hostname = url?.hostname.toLowerCase();
if (!url || url.protocol !== 'https:' || url.username || url.password ||
    hostname === 'localhost' || hostname?.endsWith('.localhost') ||
    hostname === '[::1]' || hostname === '0.0.0.0' ||
    /^127\./.test(hostname) || !url.pathname.endsWith('/api')) {
  console.error('Set VITE_API_URL in Vercel to the public HTTPS backend URL ending in /api. A laptop localhost URL cannot serve the hosted app.');
  process.exit(1);
}
console.log('Vercel API address configuration checked. Verify backend connectivity before release.');
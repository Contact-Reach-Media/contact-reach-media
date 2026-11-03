async function get(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  return await res.text();
}

async function run() {
  const html = await get('https://rw.kikuu.com/');
  console.log('HTML size:', html.length);

  // Look for window.__INITIAL_STATE__
  const initMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (initMatch) {
    console.log('Found __INITIAL_STATE__! Length:', initMatch[1].length);
    try {
      const state = JSON.parse(initMatch[1]);
      console.log('Keys in state:', Object.keys(state));
      for (const k of Object.keys(state)) {
        console.log(`Key ${k}:`, typeof state[k], Array.isArray(state[k]) ? `Array(${state[k].length})` : Object.keys(state[k] || {}));
      }
    } catch (e) {
      console.log('Parse error on state:', e.message);
    }
  } else {
    console.log('No __INITIAL_STATE__ found directly');
  }

  // Look for category links
  const catMatches = html.match(/\/category\/[a-zA-Z0-9_\-\/]+/g) || html.match(/\/search[^\s"']+/g) || [];
  console.log('Category or search links:', Array.from(new Set(catMatches)).slice(0, 15));

  // Look for image hosts
  const imgUrls = html.match(/https?:\/\/[a-zA-Z0-9.\-]+\.(?:kikuu\.com|kikuu\.cn)[^\s"']+\.(?:jpg|jpeg|png|webp)/gi) || [];
  console.log('Kikuu image URLs count:', imgUrls.length);
  console.log('Sample images:', imgUrls.slice(0, 5));

  // Look for API URLs mentioned in scripts
  const apiUrls = html.match(/https?:\/\/[a-zA-Z0-9.\-]+kikuu[a-zA-Z0-9.\-\/]+/gi) || [];
  console.log('API or kikuu URLs:', Array.from(new Set(apiUrls)).slice(0, 10));
}

run().catch(console.error);

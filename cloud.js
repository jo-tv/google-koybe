addEventListener("fetch", event => {
 event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
 let streamUrl = "http://sansat.cc:88/live/9RvsuC7ZSq6ACwX/AudandTDNw0oeIT/102206.ts";
 let cacheKey = new URL(event.request.url).pathname;
 let cache = caches.default;

 // البحث عن الرد في الكاش أولًا
 let cachedResponse = await cache.match(event.request);
 if (cachedResponse) {
  return cachedResponse;
 }

 try {
  let response = await fetch(streamUrl, {
   method: "GET",
   headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Referer": "http://sansat.cc:88/live/",
    "Origin": "http://sansat.cc:88/live",
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive"
   }
  });

  if (!response.ok) {
   return new Response(`Error fetching stream: ${response.status} - ${response.statusText}`, { status: response.status });
  }

  // ضبط الكاش لتخزين الرد وتقليل الطلبات
  let newHeaders = new Headers(response.headers);
  newHeaders.set("Cache-Control", "public, max-age=30"); // التخزين لمدة 30 ثانية

  let cachedResponse = new Response(response.body, {
   status: response.status,
   headers: newHeaders
  });

  // تخزين الرد في الكاش لمنع إرسال طلبات جديدة للسيرفر الأصلي
  event.waitUntil(cache.put(event.request, cachedResponse.clone()));

  return cachedResponse;

 } catch (error) {
  return new Response(`Worker Error: ${error.message}`, { status: 500 });
 }
}
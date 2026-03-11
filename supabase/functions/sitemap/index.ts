const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  
  <url>
    <loc>https://mohamie.com/</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/about</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/about"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/pricing</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/pricing"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/contact</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/contact"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/consultation</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/consultation"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/predictions</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/predictions"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/complaints</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/complaints"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/contracts</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/contracts"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/lawyers</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/lawyers"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/legal-search</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/legal-search"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/privacy</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/privacy"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/terms</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/terms"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/faq</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/faq"/>
  </url>
  
  <url>
    <loc>https://mohamie.com/auth</loc>
    <lastmod>2025-12-16</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://mohamie.com/auth"/>
  </url>

</urlset>`;

Deno.serve(async (req) => {
  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

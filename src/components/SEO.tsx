import { Helmet } from "react-helmet-async";

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "service" | "product";
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  faqItems?: Array<{ question: string; answer: string }>;
  serviceType?: string;
  priceRange?: string;
  rating?: { value: number; count: number };
  schema?: Record<string, unknown>;
}

const defaultMeta = {
  siteName: "محامي كوم",
  title: "محامي كوم | تطبيق استشارات قانونية بالذكاء الاصطناعي",
  description: "أول تطبيق قانوني ذكي يعمل بدون إنترنت. استشارات، تحليل عقود، تنبؤ بالأحكام، والمزيد.",
  keywords: "محامي, قانون, ذكاء اصطناعي, تطبيق قانوني, استشارة قانونية, السعودية",
  image: "/og-image.jpg",
  url: "",
  phone: "+966531099732",
  email: "info@app.local",
};

export const SEO = ({
  title,
  description = defaultMeta.description,
  keywords = defaultMeta.keywords,
  image = defaultMeta.image,
  url,
  type = "website",
  noindex = false,
  publishedTime,
  modifiedTime,
  author,
  faqItems,
  serviceType,
  priceRange,
  rating,
  schema,
}: SEOProps) => {
  const fullTitle = title
    ? `${title} | ${defaultMeta.siteName}`
    : defaultMeta.title;

  const fullUrl = url || "";
  const fullImage = image.startsWith("http") ? image : `${image}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullUrl} />

      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      )}

      <meta property="og:type" content={type === "article" ? "article" : "website"} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title || "محامي كوم"} />
      <meta property="og:locale" content="ar_SA" />

      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content={title || "محامي كوم"} />

      <meta name="language" content="ar-SA" />
      <meta httpEquiv="content-language" content="ar-SA" />
      <meta name="geo.region" content="SA" />
      <meta name="geo.placename" content="Saudi Arabia" />
      <meta name="author" content="محامي كوم" />
      <meta name="publisher" content="محامي كوم" />
      <meta name="copyright" content="محامي كوم" />
      <meta name="application-name" content="محامي كوم" />
      <meta name="apple-mobile-web-app-title" content="محامي كوم" />

      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};


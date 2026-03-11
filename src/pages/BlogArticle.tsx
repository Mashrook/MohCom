import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Eye, Tag, ArrowRight, Share2, Clock } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category: string | null;
  tags: string[] | null;
  published_at: string | null;
  views_count: number | null;
  created_at: string;
}

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Article not found");
      return data as BlogPost;
    },
    enabled: !!slug,
  });

  // Increment view count
  useEffect(() => {
    if (post?.id) {
      supabase
        .from("blog_posts")
        .update({ views_count: (post.views_count || 0) + 1 })
        .eq("id", post.id)
        .then(() => {});
    }
  }, [post?.id]);

  // Fetch related posts
  const { data: relatedPosts } = useQuery({
    queryKey: ["related-posts", post?.category, post?.id],
    queryFn: async () => {
      if (!post) return [];
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image, published_at")
        .eq("is_published", true)
        .eq("category", post.category)
        .neq("id", post.id)
        .limit(3);
      return data || [];
    },
    enabled: !!post?.category,
  });

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt || "",
          url,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: "تم نسخ الرابط",
        description: "تم نسخ رابط المقال إلى الحافظة",
      });
    }
  };

  const renderContent = (content: string) => {
    // Simple markdown-like rendering
    return content.split("\n").map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={index} className="text-3xl font-bold mt-8 mb-4">
            {line.slice(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={index} className="text-2xl font-bold mt-6 mb-3">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={index} className="text-xl font-bold mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={index} className="mr-4 mb-1 list-disc list-inside">
            {line.slice(2)}
          </li>
        );
      }
      if (line.match(/^\d+\. /)) {
        return (
          <li key={index} className="mr-4 mb-1 list-decimal list-inside">
            {line.replace(/^\d+\. /, "")}
          </li>
        );
      }
      if (line.trim() === "") {
        return <br key={index} />;
      }
      return (
        <p key={index} className="mb-4 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-background pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">المقال غير موجود</h1>
            <p className="text-muted-foreground mb-8">
              عذراً، لم نتمكن من العثور على المقال المطلوب
            </p>
            <Button onClick={() => navigate("/blog")}>
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للمدونة
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const articleSchema = post
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.excerpt || "",
        "image": post.featured_image || "",
        "datePublished": post.published_at,
        "dateModified": post.published_at,
        "author": {
          "@type": "Organization",
          "name": "محامي كوم",
        },
        "publisher": {
          "@type": "Organization",
          "name": "محامي كوم",
          "url": "https://mohamie.com",
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": `https://mohamie.com/blog/${post.slug}`,
        },
      }
    : undefined;

  return (
    <Layout>
      {post && (
        <SEO
          title={`${post.title} | المدونة القانونية - محامي كوم`}
          description={post.excerpt || post.title}
          keywords={post.tags?.join(", ") || ""}
          schema={articleSchema}
        />
      )}

      <div className="min-h-screen bg-background pt-20">
        {isLoading ? (
          <div className="container mx-auto px-4 py-12 max-w-4xl">
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-8" />
            <Skeleton className="h-64 w-full mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : post ? (
          <>
            {/* Article Header */}
            <article className="container mx-auto px-4 py-12 max-w-4xl">
              {/* Breadcrumb */}
              <nav className="mb-6">
                <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                  <li>
                    <Link to="/" className="hover:text-primary">
                      الرئيسية
                    </Link>
                  </li>
                  <li>/</li>
                  <li>
                    <Link to="/blog" className="hover:text-primary">
                      المدونة
                    </Link>
                  </li>
                  <li>/</li>
                  <li className="text-foreground line-clamp-1">{post.title}</li>
                </ol>
              </nav>

              {/* Category & Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {post.category && (
                  <Badge variant="default">{post.category}</Badge>
                )}
                {post.tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    <Tag className="w-3 h-3 ml-1" />
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                {post.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(post.published_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{calculateReadingTime(post.content)} دقائق للقراءة</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{post.views_count || 0} مشاهدة</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="mr-auto"
                >
                  <Share2 className="w-4 h-4 ml-2" />
                  مشاركة
                </Button>
              </div>

              {/* Featured Image */}
              {post.featured_image && (
                <div className="relative rounded-xl overflow-hidden mb-8 aspect-video">
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-lg text-muted-foreground border-r-4 border-primary pr-4 mb-8">
                  {post.excerpt}
                </p>
              )}

              {/* Content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                {renderContent(post.content)}
              </div>

              {/* Share Section */}
              <div className="border-t border-border mt-12 pt-8">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">هل وجدت هذا المقال مفيداً؟</p>
                  <Button onClick={handleShare}>
                    <Share2 className="w-4 h-4 ml-2" />
                    شارك المقال
                  </Button>
                </div>
              </div>

              {/* Back to Blog */}
              <div className="mt-8">
                <Link to="/blog">
                  <Button variant="outline">
                    <ArrowRight className="w-4 h-4 ml-2" />
                    العودة للمدونة
                  </Button>
                </Link>
              </div>
            </article>

            {/* Related Posts */}
            {relatedPosts && relatedPosts.length > 0 && (
              <section className="bg-muted/30 py-12">
                <div className="container mx-auto px-4 max-w-4xl">
                  <h2 className="text-2xl font-bold mb-6">مقالات ذات صلة</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {relatedPosts.map((related) => (
                      <Link key={related.id} to={`/blog/${related.slug}`}>
                        <Card className="h-full hover:shadow-lg transition-shadow">
                          {related.featured_image && (
                            <div className="h-32 overflow-hidden">
                              <img
                                src={related.featured_image}
                                alt={related.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardHeader className="pb-2">
                            <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors">
                              {related.title}
                            </h3>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(related.published_at)}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* CTA Section */}
            <section className="py-12">
              <div className="container mx-auto px-4 max-w-4xl text-center">
                <h2 className="text-2xl font-bold mb-4">
                  هل تحتاج استشارة قانونية؟
                </h2>
                <p className="text-muted-foreground mb-6">
                  تواصل مع محامينا المتخصصين للحصول على استشارة قانونية فورية
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/consultation">
                    <Button variant="golden" size="lg">
                      احصل على استشارة
                    </Button>
                  </Link>
                  <Link to="/lawyers">
                    <Button variant="outline" size="lg">
                      تواصل مع محامي
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </Layout>
  );
}

import { useState, useEffect, useRef } from "react";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LazyImage } from "@/components/ui/lazy-image";
import { supabase } from "@/integrations/supabase/client";

interface VideoStats {
  clients: string;
  clientsLabel: string;
  lawyers: string;
  lawyersLabel: string;
  support: string;
  supportLabel: string;
}

export const VideoSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isDirectVideo, setIsDirectVideo] = useState(false);
  const [title, setTitle] = useState("تعرف على محامي كوم");
  const [description, setDescription] = useState("شاهد كيف نُحدث ثورة في عالم الخدمات القانونية بالمملكة العربية السعودية");
  const [viewsCount, setViewsCount] = useState(0);
  const [contentId, setContentId] = useState<string | null>(null);
  const hasIncrementedView = useRef(false);
  const [stats, setStats] = useState<VideoStats>({
    clients: "+1000",
    clientsLabel: "عميل سعيد",
    lawyers: "+50",
    lawyersLabel: "محامي معتمد",
    support: "24/7",
    supportLabel: "دعم متواصل"
  });

  useEffect(() => {
    const fetchVideoContent = async () => {
      try {
        const { data } = await supabase
          .from("site_content")
          .select("*")
          .eq("page_key", "home_video")
          .maybeSingle();

        if (data) {
          setContentId(data.id);
          
          if (data.content && typeof data.content === 'object') {
            const content = data.content as { 
              video_url?: string; 
              thumbnail_url?: string; 
              is_direct_video?: boolean;
              title?: string;
              description?: string;
              stats?: VideoStats;
              views_count?: number;
            };
            if (content.video_url) {
              setVideoUrl(content.video_url);
              setIsDirectVideo(content.is_direct_video || false);
            }
            if (content.thumbnail_url) {
              setThumbnailUrl(content.thumbnail_url);
            }
            if (content.title) {
              setTitle(content.title);
            }
            if (content.description) {
              setDescription(content.description);
            }
            if (content.stats) {
              setStats(content.stats);
            }
            if (content.views_count !== undefined) {
              setViewsCount(content.views_count);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching video content:", error);
      }
    };

    fetchVideoContent();
  }, []);

  // Increment view count when video is opened
  const incrementViewCount = async () => {
    if (!contentId || hasIncrementedView.current) return;
    
    hasIncrementedView.current = true;
    const newCount = viewsCount + 1;
    setViewsCount(newCount);

    try {
      // Get current content to preserve other fields
      const { data: currentData } = await supabase
        .from("site_content")
        .select("content")
        .eq("id", contentId)
        .maybeSingle();

      if (currentData?.content) {
        const updatedContent = {
          ...(currentData.content as object),
          views_count: newCount
        };

        await supabase
          .from("site_content")
          .update({ content: updatedContent })
          .eq("id", contentId);
      }
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  };

  const handleOpenVideo = () => {
    setIsOpen(true);
    incrementViewCount();
  };

  const getEmbedUrl = (url: string) => {
    // Convert YouTube watch URLs to embed URLs
    if (url.includes("youtube.com/watch")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  // Parse title to highlight "محامي كوم"
  const renderTitle = () => {
    if (title.includes("محامي كوم")) {
      const parts = title.split("محامي كوم");
      return (
        <>
          {parts[0]}<span className="text-gradient-golden">محامي كوم</span>{parts[1] || ""}
        </>
      );
    }
    return title;
  };

  return (
    <section className="py-20 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-navy-900/50 to-background pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {renderTitle()}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        {/* Video Container */}
        <div className="max-w-4xl mx-auto">
          <div 
            className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group glass-card border border-golden/20"
            onClick={handleOpenVideo}
          >
            {/* Thumbnail or Placeholder */}
            {thumbnailUrl ? (
              <LazyImage 
                src={thumbnailUrl} 
                alt="فيديو تعريفي عن محامي كوم"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-navy-800 to-navy-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-golden/20 flex items-center justify-center">
                    <Play className="w-12 h-12 text-golden fill-golden" />
                  </div>
                  <p className="text-muted-foreground">انقر لمشاهدة الفيديو التعريفي</p>
                </div>
              </div>
            )}

            {/* Play Button Overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-20 h-20 rounded-full bg-golden/90 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-golden/30">
                <Play className="w-10 h-10 text-background fill-background mr-[-4px]" />
              </div>
            </div>

            {/* Decorative Border */}
            <div className="absolute inset-0 rounded-2xl border-2 border-golden/30 pointer-events-none" />
          </div>

          {/* Video Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center glass-card p-4 rounded-xl border border-golden/20">
              <p className="text-2xl font-bold text-golden">{stats.clients}</p>
              <p className="text-sm text-muted-foreground">{stats.clientsLabel}</p>
            </div>
            <div className="text-center glass-card p-4 rounded-xl border border-golden/20">
              <p className="text-2xl font-bold text-golden">{stats.lawyers}</p>
              <p className="text-sm text-muted-foreground">{stats.lawyersLabel}</p>
            </div>
            <div className="text-center glass-card p-4 rounded-xl border border-golden/20">
              <p className="text-2xl font-bold text-golden">{stats.support}</p>
              <p className="text-sm text-muted-foreground">{stats.supportLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black border-golden/30 overflow-hidden">
          <DialogTitle className="sr-only">فيديو تعريفي عن محامي كوم</DialogTitle>
          <div className="relative aspect-video">
            {videoUrl ? (
              isDirectVideo ? (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              ) : (
                <iframe
                  src={getEmbedUrl(videoUrl)}
                  title="فيديو تعريفي عن محامي كوم"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-navy-900 text-muted-foreground">
                <p>لا يوجد فيديو متاح</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
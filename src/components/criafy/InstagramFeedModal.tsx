import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Play,
  Layers,
  Grid3X3,
  List,
  Film,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { criafyService } from "@/services/criafy/criafyService";
import {
  CriafyInstagramAccount,
  InstagramAccountFeedResult,
  InstagramPost,
  InstagramComment,
} from "@/types/criafy";

interface InstagramFeedModalProps {
  account: CriafyInstagramAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstagramFeedModal({
  account,
  open,
  onOpenChange,
}: InstagramFeedModalProps) {
  const [loading, setLoading] = useState(false);
  const [feedData, setFeedData] = useState<InstagramAccountFeedResult | null>(null);
  const [activeTab, setActiveTab] = useState<"GRID" | "FEED" | "REELS">("GRID");

  // Post detail modal (when clicking an item in grid)
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);

  // Carousel slide indices for posts with multiple media
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});

  // Individual post comments state
  const [commentsMap, setCommentsMap] = useState<Record<string, InstagramComment[]>>({});
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (open && account) {
      loadFeed();
    } else {
      setSelectedPost(null);
    }
  }, [open, account?.id]);

  const loadFeed = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const data = await criafyService.getInstagramFeed(account.id);
      setFeedData(data);

      // Pre-populate commentsMap from posts that have comments
      const cMap: Record<string, InstagramComment[]> = {};
      data.posts.forEach((p) => {
        if (p.comments?.data) {
          cMap[p.id] = p.comments.data;
        }
      });
      setCommentsMap(cMap);
    } catch (err: any) {
      toast.error(`Erro ao carregar feed do Instagram: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = async (post: InstagramPost) => {
    setSelectedPost(post);
    // If post comments not loaded or empty, fetch them
    if (account && (!commentsMap[post.id] || commentsMap[post.id].length === 0)) {
      setLoadingCommentsPostId(post.id);
      try {
        const comments = await criafyService.getPostComments(account.id, post.id);
        setCommentsMap((prev) => ({ ...prev, [post.id]: comments }));
      } catch (err) {
        // Fallback to post.comments.data if already present
      } finally {
        setLoadingCommentsPostId(null);
      }
    }
  };

  const handlePrevSlide = (postId: string, total: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCarouselIndices((prev) => {
      const cur = prev[postId] || 0;
      return { ...prev, [postId]: cur === 0 ? total - 1 : cur - 1 };
    });
  };

  const handleNextSlide = (postId: string, total: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCarouselIndices((prev) => {
      const cur = prev[postId] || 0;
      return { ...prev, [postId]: cur === total - 1 ? 0 : cur + 1 };
    });
  };

  const handleAddComment = async (postId: string) => {
    if (!account || !newCommentText.trim()) return;
    setSubmittingComment(true);
    try {
      await criafyService.addPostComment(account.id, postId, newCommentText.trim());
      toast.success("Comentário publicado no Instagram!");

      // Optimistic update
      const newComment: InstagramComment = {
        id: `temp-${Date.now()}`,
        text: newCommentText.trim(),
        timestamp: new Date().toISOString(),
        username: account.username,
        like_count: 0,
      };

      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])],
      }));
      setNewCommentText("");
    } catch (err: any) {
      toast.error(`Falha ao publicar comentário: ${err.message}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  const profile = feedData?.profile || account;
  const posts = feedData?.posts || [];

  const filteredPosts = posts.filter((post) => {
    if (activeTab === "REELS") {
      return post.media_type === "VIDEO";
    }
    return true;
  });

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "agora";
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d`;
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks} sem`;
    } catch {
      return "";
    }
  };

  // Helper to render media element (Image, Video, Carousel)
  const renderPostMedia = (post: InstagramPost, inFeedTimeline = false) => {
    const isCarousel = post.media_type === "CAROUSEL_ALBUM" && post.children?.data && post.children.data.length > 0;
    const currentSlide = carouselIndices[post.id] || 0;

    if (isCarousel) {
      const children = post.children!.data;
      const activeChild = children[currentSlide] || children[0];

      return (
        <div className={`relative w-full overflow-hidden bg-black/95 flex items-center justify-center ${inFeedTimeline ? "aspect-square" : "h-full min-h-[300px]"}`}>
          {activeChild.media_type === "VIDEO" ? (
            <video
              src={activeChild.media_url}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={activeChild.media_url}
              alt=""
              className="w-full h-full object-contain"
            />
          )}

          {/* Carousel Arrows */}
          {children.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => handlePrevSlide(post.id, children.length, e)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all z-10 shadow-md cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => handleNextSlide(post.id, children.length, e)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all z-10 shadow-md cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                {children.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentSlide ? "w-4 bg-white" : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Counter Tag Top Right */}
          <div className="absolute top-2.5 right-2.5 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
            {currentSlide + 1}/{children.length}
          </div>
        </div>
      );
    }

    if (post.media_type === "VIDEO") {
      return (
        <div className={`relative w-full bg-black flex items-center justify-center ${inFeedTimeline ? "aspect-square" : "h-full min-h-[300px]"}`}>
          <video
            src={post.media_url}
            poster={post.thumbnail_url}
            controls
            playsInline
            className="w-full h-full object-contain"
          />
        </div>
      );
    }

    return (
      <div className={`relative w-full bg-black/5 flex items-center justify-center ${inFeedTimeline ? "aspect-square" : "h-full min-h-[300px]"}`}>
        <img
          src={post.media_url || post.thumbnail_url}
          alt={post.caption || "Post do Instagram"}
          className="w-full h-full object-contain"
        />
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[850px] max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border bg-background">
          {/* Top Bar with Instagram branding */}
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md px-5 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                <span className="text-[12px] font-black leading-none">IG</span>
              </div>
              <span className="font-extrabold text-sm tracking-tight">
                @{account?.username || "instagram"}
              </span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] py-0 px-1.5 font-semibold">
                Feed Oficial
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadFeed}
                disabled={loading}
                className="h-8 text-xs gap-1.5"
                title="Atualizar feed e comentários"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-pink-500" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {loading && !feedData ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
              <p className="text-xs text-muted-foreground font-medium">
                Carregando publicações e comentários de @{account?.username}...
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-8">
              {/* Instagram Profile Header */}
              <div className="px-6 pt-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar with Gradient Stories Ring */}
                  <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 shadow-md shrink-0">
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-background">
                      <AvatarImage
                        src={profile?.profile_picture_url || account?.profile_picture_url}
                        alt={account?.username}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-black text-xl">
                        @{account?.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Profile Info & Metrics */}
                  <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <h2 className="text-xl font-bold tracking-tight">@{account?.username}</h2>
                      <a
                        href={`https://instagram.com/${account?.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-pink-600 hover:text-pink-700 flex items-center gap-1 font-semibold hover:underline"
                        title="Abrir perfil externo no Instagram"
                      >
                        Abrir no Instagram <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Stats Counters */}
                    <div className="flex items-center justify-center sm:justify-start gap-6 text-xs sm:text-sm">
                      <div>
                        <span className="font-extrabold text-foreground">
                          {typeof (profile as any)?.media_count === "number"
                            ? (profile as any).media_count
                            : posts.length}
                        </span>{" "}
                        <span className="text-muted-foreground">publicações</span>
                      </div>
                      <div>
                        <span className="font-extrabold text-foreground">
                          {typeof (profile as any)?.followers_count === "number"
                            ? (profile as any).followers_count.toLocaleString("pt-BR")
                            : "—"}
                        </span>{" "}
                        <span className="text-muted-foreground">seguidores</span>
                      </div>
                      <div>
                        <span className="font-extrabold text-foreground">
                          {typeof (profile as any)?.follows_count === "number"
                            ? (profile as any).follows_count.toLocaleString("pt-BR")
                            : "—"}
                        </span>{" "}
                        <span className="text-muted-foreground">seguindo</span>
                      </div>
                    </div>

                    {/* Name & Bio */}
                    <div className="text-xs space-y-1">
                      {profile?.name && (
                        <p className="font-bold text-foreground">{profile.name}</p>
                      )}
                      {(profile as any)?.biography && (
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed max-w-lg">
                          {(profile as any).biography}
                        </p>
                      )}
                      {(profile as any)?.website && (
                        <a
                          href={(profile as any).website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-semibold block truncate max-w-sm"
                        >
                          {(profile as any).website}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs (Grade, Feed, Reels) */}
              <div className="border-t border-muted/80 px-6">
                <div className="flex items-center justify-center gap-8 text-xs font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setActiveTab("GRID")}
                    className={`py-3 flex items-center gap-1.5 border-t-2 transition-all cursor-pointer ${
                      activeTab === "GRID"
                        ? "border-foreground text-foreground font-black"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" /> Grade
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("FEED")}
                    className={`py-3 flex items-center gap-1.5 border-t-2 transition-all cursor-pointer ${
                      activeTab === "FEED"
                        ? "border-foreground text-foreground font-black"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> Feed Timeline
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("REELS")}
                    className={`py-3 flex items-center gap-1.5 border-t-2 transition-all cursor-pointer ${
                      activeTab === "REELS"
                        ? "border-foreground text-foreground font-black"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" /> Reels
                  </button>
                </div>
              </div>

              {/* Posts Display */}
              <div className="px-4 sm:px-6">
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-16 border border-dashed rounded-xl space-y-2">
                    <p className="text-sm font-semibold">Nenhuma publicação encontrada</p>
                    <p className="text-xs text-muted-foreground">
                      As postagens publicadas nesta conta aparecerão aqui.
                    </p>
                  </div>
                ) : activeTab === "GRID" || activeTab === "REELS" ? (
                  /* ======================================================== */
                  /* 1. GRID VIEW (GRADE CLÁSSICA 3x3 DO INSTAGRAM)            */
                  /* ======================================================== */
                  <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                    {filteredPosts.map((post) => {
                      const isVid = post.media_type === "VIDEO";
                      const isCar = post.media_type === "CAROUSEL_ALBUM";
                      const thumb = post.thumbnail_url || post.media_url;
                      const postComments = commentsMap[post.id] || post.comments?.data || [];

                      return (
                        <div
                          key={post.id}
                          onClick={() => handlePostClick(post)}
                          className="group relative aspect-square bg-muted/20 overflow-hidden cursor-pointer rounded-sm sm:rounded-md transition-all hover:opacity-95"
                        >
                          {/* Image or Video Thumbnail */}
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
                              Post
                            </div>
                          )}

                          {/* Media Type Icon Top Right */}
                          <div className="absolute top-2 right-2 z-10 drop-shadow-md">
                            {isCar ? (
                              <Layers className="w-4 h-4 text-white" />
                            ) : isVid ? (
                              <Play className="w-4 h-4 text-white fill-white" />
                            ) : null}
                          </div>

                          {/* Hover Overlay with Likes & Comments Count */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs sm:text-sm font-bold z-20">
                            <span className="flex items-center gap-1.5">
                              <Heart className="w-4 h-4 fill-white" />
                              {post.like_count ?? 0}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MessageCircle className="w-4 h-4 fill-white" />
                              {post.comments_count ?? postComments.length}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ======================================================== */
                  /* 2. TIMELINE FEED VIEW (FEED CONTÍNUO ROLÁVEL DO APP)      */
                  /* ======================================================== */
                  <div className="max-w-xl mx-auto space-y-8">
                    {filteredPosts.map((post) => {
                      const postComments = commentsMap[post.id] || post.comments?.data || [];

                      return (
                        <div
                          key={`feed-card-${post.id}`}
                          className="border border-muted rounded-2xl bg-card overflow-hidden shadow-xs space-y-3"
                        >
                          {/* Post Header */}
                          <div className="p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-8 h-8 border">
                                <AvatarImage
                                  src={profile?.profile_picture_url || account?.profile_picture_url}
                                  alt={account?.username}
                                />
                                <AvatarFallback className="text-xs font-bold">
                                  @{account?.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-bold text-xs">@{account?.username}</span>
                                <span className="text-muted-foreground text-[10px] block">
                                  {formatRelativeTime(post.timestamp)}
                                </span>
                              </div>
                            </div>

                            {post.permalink && (
                              <a
                                href={post.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-pink-600 transition-colors"
                                title="Abrir no Instagram"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>

                          {/* Post Media */}
                          {renderPostMedia(post, true)}

                          {/* Post Actions Bar */}
                          <div className="px-4 space-y-2">
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  className="text-foreground hover:text-rose-500 transition-colors cursor-pointer"
                                  title="Curtir"
                                >
                                  <Heart className="w-5 h-5 hover:scale-110 transition-transform" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePostClick(post)}
                                  className="text-foreground hover:text-pink-500 transition-colors cursor-pointer"
                                  title="Comentar"
                                >
                                  <MessageCircle className="w-5 h-5 hover:scale-110 transition-transform" />
                                </button>
                                <button
                                  type="button"
                                  className="text-foreground hover:text-sky-500 transition-colors cursor-pointer"
                                  title="Compartilhar"
                                >
                                  <Share2 className="w-5 h-5" />
                                </button>
                              </div>
                              <button
                                type="button"
                                className="text-foreground hover:text-amber-500 transition-colors cursor-pointer"
                                title="Salvar"
                              >
                                <Bookmark className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Likes Count */}
                            <div className="font-bold text-xs">
                              {post.like_count ?? 0} curtidas
                            </div>

                            {/* Caption */}
                            {post.caption && (
                              <div className="text-xs leading-relaxed">
                                <span className="font-bold mr-1.5">@{account?.username}</span>
                                <span className="whitespace-pre-wrap">{post.caption}</span>
                              </div>
                            )}

                            {/* Comments Count Button */}
                            {postComments.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handlePostClick(post)}
                                className="text-xs text-muted-foreground hover:text-foreground font-medium block pt-1 cursor-pointer"
                              >
                                Ver todos os {post.comments_count || postComments.length} comentários
                              </button>
                            )}

                            {/* Preview top 2 comments */}
                            <div className="space-y-1 pt-1">
                              {postComments.slice(0, 2).map((c) => (
                                <div key={c.id} className="text-xs">
                                  <span className="font-bold mr-1.5">@{c.username}</span>
                                  <span>{c.text}</span>
                                </div>
                              ))}
                            </div>

                            {/* Timestamp */}
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider pb-3 pt-1">
                              {formatTimestamp(post.timestamp)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 3. EXPANDED POST DETAIL MODAL (MODAL WEB DO INSTAGRAM)     */}
      {/* ======================================================== */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden rounded-2xl max-h-[90vh] bg-background border">
          {selectedPost && (
            <div className="flex flex-col md:flex-row h-full max-h-[85vh]">
              {/* Left Column: Media (Image, Carousel or Video) */}
              <div className="md:w-3/5 bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px]">
                {renderPostMedia(selectedPost, false)}
              </div>

              {/* Right Column: Author, Caption & Comments Section */}
              <div className="md:w-2/5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-muted bg-card">
                {/* Header: Author */}
                <div className="p-3.5 border-b border-muted flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-8 h-8 border">
                      <AvatarImage
                        src={profile?.profile_picture_url || account?.profile_picture_url}
                        alt={account?.username}
                      />
                      <AvatarFallback className="text-xs font-bold">
                        @{account?.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-bold text-xs">@{account?.username}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        {formatTimestamp(selectedPost.timestamp)}
                      </span>
                    </div>
                  </div>

                  {selectedPost.permalink && (
                    <a
                      href={selectedPost.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700 text-xs font-semibold flex items-center gap-1"
                      title="Abrir no Instagram"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Middle: Caption + Full Comments Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[360px] md:max-h-[420px]">
                  {/* Author Caption */}
                  {selectedPost.caption && (
                    <div className="flex items-start gap-2.5 text-xs pb-3 border-b border-muted/60">
                      <Avatar className="w-7 h-7 shrink-0 border mt-0.5">
                        <AvatarImage
                          src={profile?.profile_picture_url || account?.profile_picture_url}
                          alt=""
                        />
                        <AvatarFallback className="text-[9px] font-bold">
                          @{account?.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 min-w-0">
                        <p className="leading-relaxed">
                          <span className="font-bold mr-1.5">@{account?.username}</span>
                          <span className="whitespace-pre-wrap">{selectedPost.caption}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(selectedPost.timestamp)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Comments List */}
                  <div className="space-y-3">
                    {loadingCommentsPostId === selectedPost.id ? (
                      <div className="py-6 flex justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                      </div>
                    ) : (commentsMap[selectedPost.id] || selectedPost.comments?.data || []).length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
                        <MessageCircle className="w-6 h-6 mx-auto text-muted-foreground/40" />
                        <p className="font-semibold">Nenhum comentário ainda.</p>
                        <p className="text-[11px]">Seja o primeiro a interagir!</p>
                      </div>
                    ) : (
                      (commentsMap[selectedPost.id] || selectedPost.comments?.data || []).map((c) => (
                        <div key={c.id} className="space-y-2">
                          <div className="flex items-start gap-2.5 text-xs">
                            <Avatar className="w-7 h-7 shrink-0 border mt-0.5">
                              <AvatarFallback className="text-[9px] bg-muted font-bold">
                                {c.username ? c.username.charAt(0).toUpperCase() : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-0.5 min-w-0">
                              <p className="leading-relaxed">
                                <span className="font-bold mr-1.5">@{c.username}</span>
                                <span>{c.text}</span>
                              </p>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>{formatRelativeTime(c.timestamp)}</span>
                                {c.like_count && c.like_count > 0 ? (
                                  <span>{c.like_count} curtida(s)</span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Replies if any */}
                          {c.replies?.data && c.replies.data.length > 0 && (
                            <div className="pl-9 space-y-2">
                              {c.replies.data.map((r) => (
                                <div key={r.id} className="flex items-start gap-2 text-xs">
                                  <Avatar className="w-5 h-5 shrink-0 border">
                                    <AvatarFallback className="text-[8px] font-bold">
                                      {r.username ? r.username.charAt(0).toUpperCase() : "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="space-y-0.5">
                                    <p className="leading-relaxed">
                                      <span className="font-bold mr-1">@{r.username}</span>
                                      <span>{r.text}</span>
                                    </p>
                                    <span className="text-[9px] text-muted-foreground block">
                                      {formatRelativeTime(r.timestamp)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bottom: Action bar & Add comment */}
                <div className="p-3.5 border-t border-muted bg-background space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5 cursor-pointer hover:text-rose-500 transition-colors" />
                      <MessageCircle className="w-5 h-5 cursor-pointer hover:text-pink-500 transition-colors" />
                      <Share2 className="w-5 h-5 cursor-pointer hover:text-sky-500 transition-colors" />
                    </div>
                    <Bookmark className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
                  </div>

                  <div className="text-xs font-bold">
                    {selectedPost.like_count ?? 0} curtidas
                  </div>

                  <div className="text-[10px] text-muted-foreground uppercase">
                    {formatTimestamp(selectedPost.timestamp)}
                  </div>

                  {/* Add Comment Input */}
                  <div className="pt-1 flex items-center gap-1.5 border-t border-muted/60">
                    <Input
                      placeholder="Adicione um comentário no Instagram..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(selectedPost.id);
                        }
                      }}
                      className="h-8 text-xs border-0 focus-visible:ring-0 px-1 bg-transparent shadow-none"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddComment(selectedPost.id)}
                      disabled={submittingComment || !newCommentText.trim()}
                      className="h-7 text-xs px-2.5 font-bold text-pink-600 hover:text-pink-700 bg-transparent hover:bg-pink-500/10 shadow-none"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Publicar"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

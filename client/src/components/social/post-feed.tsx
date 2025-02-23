import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MoreVertical,
  Pencil,
  Trash2,
  MessageCircle,
  ThumbsUp,
  Star,
  Heart,
  Lightbulb,
  Send,
  CornerDownRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CreatePostDialog } from "./create-post-dialog";
import { ImageViewerModal } from "./image-viewer-modal";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  parentCommentId?: number;
  userId: number;
  user: {
    id: number;
    profile: any;
    businessName: string;
    email: string;
  };
  replies?: Comment[];
}

interface Reaction {
  id: number;
  type: 'like' | 'celebrate' | 'support' | 'insightful';
  userId: number;
}

interface Post {
  id: number;
  content: string;
  mediaUrls?: string[];
  type: string;
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  user: {
    id: number;
    businessName: string;
    email: string;
  };
  createdAt: string;
  reactions?: Reaction[];
  comments?: Comment[];
}

export function PostFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ postId: number; commentId?: number } | null>(null);
  const [expandedComments, setExpandedComments] = useState<number[]>([]);
  const [expandedReplies, setExpandedReplies] = useState<number[]>([]);

  // Reactions configuration
  const reactionTypes = {
    like: { icon: ThumbsUp, label: 'Like' },
    celebrate: { icon: Star, label: 'Celebrate' },
    support: { icon: Heart, label: 'Support' },
    insightful: { icon: Lightbulb, label: 'Insightful' }
  };

  const { data: postsData, isLoading, error } = useQuery({
    queryKey: ['/api/social/posts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/social/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      return response.json();
    }
  });

  // Comment mutations
  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content, parentCommentId }: { postId: number; content: string; parentCommentId?: number }) => {
      const response = await apiRequest('POST', `/api/social/posts/${postId}/comments`, { content, parentCommentId });
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
      setCommentText(0,'',0); //Added to clear input after successful comment
      setReplyingTo(null);
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    }
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: number; content: string }) => {
      const response = await apiRequest('PATCH', `/api/social/comments/${commentId}`, { content });
      if (!response.ok) {
        throw new Error('Failed to edit comment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
      setEditingComment(null);
      toast({
        title: "Success",
        description: "Comment updated successfully",
      });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await apiRequest('DELETE', `/api/social/comments/${commentId}`);
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    }
  });

  // Reaction mutations
  const reactionMutation = useMutation({
    mutationFn: async ({ postId, type }: { postId: number; type: string }) => {
      const response = await apiRequest('POST', `/api/social/posts/${postId}/reactions`, { type });
      if (!response.ok) {
        throw new Error('Failed to update reaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    }
  });

  const removeReactionMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest('DELETE', `/api/social/posts/${postId}/reactions`);
      if (!response.ok) {
        throw new Error('Failed to remove reaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    }
  });

  const handleReaction = (postId: number, type: 'like' | 'celebrate' | 'support' | 'insightful') => {
    const post = postsData?.data.find(p => p.id === postId);
    const hasReacted = post?.reactions?.some(r => r.type === type && r.userId === user?.id);

    if (hasReacted) {
      removeReactionMutation.mutate(postId);
    } else {
      reactionMutation.mutate({ postId, type });
    }
  };

  const getCommentText = (postId: number, commentId?: number) => {
    const key = commentId ? `${postId}-${commentId}` : `${postId}`;
    return commentInputs[key] || '';
  };

  const setCommentText = (postId: number, text: string, commentId?: number) => {
    const key = commentId ? `${postId}-${commentId}` : `${postId}`;
    setCommentInputs(prev => ({ ...prev, [key]: text }));
  };

  const handleAddComment = (postId: number, parentCommentId?: number) => {
    const text = getCommentText(postId, parentCommentId);
    if (!text.trim()) return;

    addCommentMutation.mutate(
      { postId, content: text.trim(), parentCommentId },
      {
        onSuccess: () => {
          setCommentText(postId, '', parentCommentId);
          setReplyingTo(null);
          queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
        }
      }
    );
  };

  const handleEditComment = (commentId: number, content: string) => {
    editCommentMutation.mutate(
      { commentId, content },
      {
        onSuccess: () => {
          setEditingComment(null);
          queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
        }
      }
    );
  };

  const handleDeleteComment = (commentId: number) => {
    deleteCommentMutation.mutate(commentId);
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies(prev =>
      prev.includes(commentId) ? prev.filter(id => id !== commentId) : [...prev, commentId]
    );
  };

  const toggleComments = (postId: number) => {
    setExpandedComments(prev =>
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  const canModifyComment = (comment: Comment) => {
    if (!user) return false;
    if (user.userType === 'admin') return true;
    return user.id === comment.userId;
  };

  // Comment component
  const CommentComponent = ({ comment, postId, level = 0 }: { comment: Comment; postId: number; level?: number }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content);
    const showReplies = expandedReplies.includes(comment.id);
    const isReplying = replyingTo?.commentId === comment.id;
    const replyText = getCommentText(postId, comment.id);

    return (
      <div className={`ml-${level * 4} mb-2`}>
        <div className="flex items-start gap-2 p-2 rounded-md bg-secondary/10">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {comment.user.businessName?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">
                {comment.user.businessName}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(parseISO(comment.createdAt), { addSuffix: true })}
              </span>
            </div>

            {isEditing ? (
              <div className="flex gap-2 mt-1">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    handleEditComment(comment.id, editText);
                    setIsEditing(false);
                  }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="text-sm">{comment.content}</p>
            )}

            <div className="flex gap-2 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setReplyingTo({ postId, commentId: comment.id })}
              >
                Reply
              </Button>
              {canModifyComment(comment) && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setIsEditing(true);
                      setEditText(comment.content);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-destructive"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    Delete
                  </Button>
                </>
              )}
              {comment.replies && comment.replies.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => toggleReplies(comment.id)}
                >
                  {showReplies ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Hide Replies
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show Replies ({comment.replies.length})
                    </>
                  )}
                </Button>
              )}
            </div>

            {isReplying && (
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setCommentText(postId, e.target.value, comment.id)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => handleAddComment(postId, comment.id)}
                  disabled={!replyText.trim()}
                >
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
              </div>
            )}

            {showReplies && comment.replies && (
              <div className="ml-4 mt-2">
                {comment.replies.map((reply) => (
                  <CommentComponent
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    level={level + 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[140px]" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          Error loading posts. Please try again later.
        </CardContent>
      </Card>
    );
  }

  if (!postsData?.data || postsData.data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No posts available yet. Be the first to post!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {postsData.data.map((post: Post) => (
        <Card key={post.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>
                  {post.user?.businessName?.[0] || post.user?.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">
                  {post.user?.businessName || post.user?.email || 'Anonymous'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(parseISO(post.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <p className="whitespace-pre-wrap">{post.content}</p>

            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className={`grid gap-2 mt-4 ${
                post.mediaUrls.length === 1 ? 'grid-cols-1' :
                  post.mediaUrls.length === 2 ? 'grid-cols-2' :
                    'grid-cols-2'
              }`}>
                {post.mediaUrls.map((image, index) => (
                  <div
                    key={`${post.id}-${index}`}
                    className="relative cursor-pointer overflow-hidden rounded-md group"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={image}
                      alt={`Post image ${index + 1}`}
                      className="w-full h-48 object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <div className="flex gap-2 w-full">
              {Object.entries(reactionTypes).map(([type, { icon: Icon, label }]) => {
                const hasReacted = post.reactions?.some(r => r.type === type && r.userId === user?.id);
                return (
                  <Button
                    key={type}
                    variant={hasReacted ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleReaction(post.id, type as 'like' | 'celebrate' | 'support' | 'insightful')}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {label}
                  </Button>
                );
              })}
            </div>

            <div className="w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleComments(post.id)}
                className="mb-2"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Comments ({post.comments?.length || 0})
              </Button>

              {expandedComments.includes(post.id) && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={getCommentText(post.id)}
                      onChange={(e) => setCommentText(post.id, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(post.id);
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={() => handleAddComment(post.id)}
                      disabled={!getCommentText(post.id).trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {post.comments?.map((comment) => (
                      <CommentComponent
                        key={comment.id}
                        comment={comment}
                        postId={post.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}

      <ImageViewerModal
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
        imageUrl={selectedImage || ''}
      />
    </div>
  );
}
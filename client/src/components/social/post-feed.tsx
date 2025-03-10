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
  MessageCircle,
  ThumbsUp,
  Star,
  Heart,
  Lightbulb,
  Send,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ImageViewerModal } from "./image-viewer-modal";

// Match the exact reaction types from the schema
type ReactionType = "like" | "celebrate" | "support" | "insightful";

interface Reaction {
  id: number;
  type: ReactionType;
  userId: number;
}

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

// Helper function to count reactions by type
const getReactionCount = (reactions: Reaction[] = [], type: ReactionType) => {
  return reactions.filter(r => r.type === type).length;
};

export function PostFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<number[]>([]);
  const [expandedReplies, setExpandedReplies] = useState<number[]>([]);

  const reactionTypes = {
    "like": { icon: ThumbsUp, label: 'Like' },
    "celebrate": { icon: Star, label: 'Celebrate' },
    "support": { icon: Heart, label: 'Support' },
    "insightful": { icon: Lightbulb, label: 'Insightful' }
  } satisfies Record<ReactionType, { icon: any; label: string }>;

  const addReactionMutation = useMutation({
    mutationFn: async ({ postId, type }: { postId: number; type: ReactionType }) => {
      console.log('Adding reaction:', { postId, type });
      const response = await apiRequest('POST', `/api/social/posts/${postId}/reactions`, {
        type: type.toLowerCase().trim()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add reaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    },
    onError: (error: Error) => {
      console.error('Add reaction error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const removeReactionMutation = useMutation({
    mutationFn: async ({ postId, type }: { postId: number; type: ReactionType }) => {
      console.log('Removing reaction:', { postId, type });
      const response = await apiRequest('DELETE', `/api/social/posts/${postId}/reactions/${type.toLowerCase().trim()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to remove reaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    },
    onError: (error: Error) => {
      console.error('Remove reaction error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleReaction = (postId: number, type: ReactionType) => {
    if (!user) return;

    const post = postsData?.data.find((p: Post) => p.id === postId);
    const hasReacted = post?.reactions?.some(r => r.type === type && r.userId === user.id);

    console.log('Handling reaction:', { 
      postId, 
      type,
      hasReacted,
      currentUserReactions: post?.reactions?.filter(r => r.userId === user.id)
    });

    if (hasReacted) {
      removeReactionMutation.mutate({ postId, type });
    } else {
      addReactionMutation.mutate({ postId, type });
    }
  };

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
      toast({
        title: "Success",
        description: "Comment added successfully",
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

  const CommentComponent = ({ comment, postId, level = 0 }: { comment: Comment; postId: number; level?: number }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content);
    const [replyText, setReplyText] = useState('');
    const showReplies = expandedReplies.includes(comment.id);
    const [isReplying, setIsReplying] = useState(false);

    const handleAddReply = () => {
      if (!replyText.trim()) return;

      addCommentMutation.mutate(
        { postId, content: replyText.trim(), parentCommentId: comment.id },
        {
          onSuccess: () => {
            setReplyText('');
            setIsReplying(false);
          }
        }
      );
    };

    const handleEditComment = (commentId: number, content: string) => {
      editCommentMutation.mutate({ commentId, content });
    };

    return (
      <div className={`ml-${level * 4} mb-2`}>
        <div className="flex items-start gap-2 p-2 rounded-md bg-secondary/10">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {comment.user.businessName?.[0] || comment.user.email?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">
                {comment.user.businessName || comment.user.email}
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
                onClick={() => setIsReplying(!isReplying)}
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
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
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
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddReply}
                  disabled={!replyText.trim()}
                >
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsReplying(false)}
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

  const NewCommentInput = ({ postId }: { postId: number }) => {
    const [commentText, setCommentText] = useState('');

    const handleAddComment = () => {
      if (!commentText.trim()) return;

      addCommentMutation.mutate(
        { postId, content: commentText.trim() },
        {
          onSuccess: () => {
            setCommentText('');
          }
        }
      );
    };

    return (
      <div className="flex gap-2">
        <Input
          placeholder="Write a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddComment();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleAddComment}
          disabled={!commentText.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
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

  const countTotalComments = (comments: Comment[] | undefined) => {
    if(!comments) return 0;
    let count = comments.length;
    comments.forEach(comment => {
      if(comment.replies){
        count += comment.replies.length;
      }
    });
    return count;
  }

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
          {error instanceof Error ? error.message : 'Error loading posts. Please try again later.'}
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
      {postsData?.data.map((post: Post) => (
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
              {(Object.entries(reactionTypes) as [ReactionType, typeof reactionTypes[ReactionType]][]).map(([type, { icon: Icon, label }]) => {
                const hasReacted = post.reactions?.some(r => r.type === type && r.userId === user?.id);
                const reactionCount = getReactionCount(post.reactions, type);
                return (
                  <Button
                    key={type}
                    variant={hasReacted ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleReaction(post.id, type)}
                    disabled={addReactionMutation.isPending || removeReactionMutation.isPending}
                    className="flex items-center gap-1"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    {reactionCount > 0 && (
                      <span className="ml-1 text-xs bg-secondary/20 px-1.5 py-0.5 rounded-full">
                        {reactionCount}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Comment section */}
            <div className="w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleComments(post.id)}
                className="mb-2"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Comments ({countTotalComments(post.comments)})
              </Button>

              {expandedComments.includes(post.id) && (
                <div className="space-y-4">
                  <NewCommentInput postId={post.id} />

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
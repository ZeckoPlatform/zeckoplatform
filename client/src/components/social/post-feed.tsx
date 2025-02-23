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
  Shield, 
  MessageCircle,
  ThumbsUp,
  Star, // Replace Party with Star
  Heart,
  Lightbulb,
  Send
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
import type { Post, PostsResponse, PostResponse, PostMutationResponse } from "@/types/posts";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    profile: any;
    businessName: string;
  };
}

interface Reaction {
  id: number;
  type: 'like' | 'celebrate' | 'support' | 'insightful';
  userId: number;
}

interface ExtendedPost extends Post {
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
  const [commentText, setCommentText] = useState<string>('');
  const [expandedComments, setExpandedComments] = useState<number[]>([]);

  // Reactions configuration
  const reactionTypes = {
    like: { icon: ThumbsUp, label: 'Like' },
    celebrate: { icon: Star, label: 'Celebrate' }, // Using Star instead of Party
    support: { icon: Heart, label: 'Support' },
    insightful: { icon: Lightbulb, label: 'Insightful' }
  };

  const { data: postsData, isLoading, error } = useQuery<PostsResponse>({
    queryKey: ['/api/social/posts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/social/posts');
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      return response.json();
    }
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest('DELETE', `/api/social/posts/${postId}`);
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      return postId;
    },
    onSuccess: (deletedPostId) => {
      queryClient.setQueryData<PostsResponse>(['/api/social/posts'], (old) => {
        if (!old) return { success: true, data: [] };
        return {
          ...old,
          data: old.data.filter(post => post.id !== deletedPostId)
        };
      });
      setIsDeleteDialogOpen(false);
      setPostToDelete(null);
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    }
  });

  // Fetch comments for a post
  const fetchComments = async (postId: number) => {
    const response = await apiRequest('GET', `/api/posts/${postId}/comments`);
    if (!response.ok) {
      throw new Error('Failed to fetch comments');
    }
    return response.json();
  };

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      const response = await apiRequest('POST', `/api/posts/${postId}/comments`, { content });
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', variables.postId, 'comments'] });
      setCommentText('');
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

  // Add/update reaction mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ postId, type }: { postId: number; type: string }) => {
      const response = await apiRequest('POST', `/api/posts/${postId}/reactions`, { type });
      if (!response.ok) {
        throw new Error('Failed to update reaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reaction",
        variant: "destructive",
      });
    }
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest('DELETE', `/api/posts/${postId}/reactions`);
      if (!response.ok) {
        throw new Error('Failed to remove reaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    }
  });

  const toggleComments = async (postId: number) => {
    if (expandedComments.includes(postId)) {
      setExpandedComments(expandedComments.filter(id => id !== postId));
    } else {
      setExpandedComments([...expandedComments, postId]);
      // Fetch comments when expanding
      try {
        await queryClient.prefetchQuery({
          queryKey: ['/api/posts', postId, 'comments'],
          queryFn: () => fetchComments(postId)
        });
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    }
  };

  const handleReaction = (postId: number, type: 'like' | 'celebrate' | 'support' | 'insightful') => {
    reactionMutation.mutate({ postId, type });
  };

  const handleAddComment = (postId: number) => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate({ postId, content: commentText.trim() });
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

  const canModifyPost = (post: Post) => {
    if (!user) return false;
    if (user.userType === 'admin') return true;
    return user.id === post.user?.id;
  };

  const isAdmin = user?.userType === 'admin';

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Card className="bg-primary/10">
          <CardContent className="p-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Admin Moderation Mode - You can edit or delete any post</span>
          </CardContent>
        </Card>
      )}

      {postsData.data.map((post: ExtendedPost) => (
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

            {canModifyPost(post) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingPost(post)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setPostToDelete(post);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{post.content}</p>

            {/* Media Gallery */}
            {((post.mediaUrls && post.mediaUrls.length > 0) || (post.images && post.images.length > 0)) && (
              <div className={`grid gap-2 mt-4 ${
                ((post.mediaUrls?.length || post.images?.length) || 0) === 1 ? 'grid-cols-1' :
                ((post.mediaUrls?.length || post.images?.length) || 0) === 2 ? 'grid-cols-2' :
                'grid-cols-2'
              }`}>
                {(post.mediaUrls || post.images || []).map((image, index) => (
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

          {/* Reactions and Comments Section */}
          <CardFooter className="flex flex-col gap-4">
            {/* Reaction Buttons */}
            <div className="flex gap-2 w-full">
              {Object.entries(reactionTypes).map(([type, { icon: Icon, label }]) => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction(post.id, type as 'like' | 'celebrate' | 'support' | 'insightful')}
                  className={post.reactions?.some(r => r.type === type && r.userId === user?.id) ? 'bg-primary/10' : ''}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {label}
                </Button>
              ))}
            </div>

            {/* Comments Section */}
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
                  {/* Comment Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
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
                      disabled={!commentText.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-2">
                    {post.comments?.map((comment: Comment) => (
                      <div key={comment.id} className="flex items-start gap-2 p-2 rounded-md bg-secondary/10">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {comment.user.businessName?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium">
                              {comment.user.businessName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(parseISO(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}

      {editingPost && (
        <CreatePostDialog
          open={!!editingPost}
          onOpenChange={(open) => {
            if (!open) setEditingPost(null);
          }}
          editPost={editingPost}
        />
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
              {isAdmin && postToDelete && postToDelete.user?.id !== user?.id && (
                <p className="mt-2 text-destructive">
                  You are deleting this post as an administrator.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => postToDelete && deletePostMutation.mutate(postToDelete.id)}
              disabled={deletePostMutation.isPending}
            >
              {deletePostMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageViewerModal
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
        imageUrl={selectedImage || ''}
      />
    </div>
  );
}
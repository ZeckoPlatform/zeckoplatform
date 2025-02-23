import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, Shield } from "lucide-react";
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

interface Post {
  id: number;
  content: string;
  type: string;
  createdAt: string;
  images?: string[];
  user: {
    id: number;
    businessName: string | null;
    email: string;
    userType: string;
  } | null;
}

interface PostsResponse {
  data: Post[];
}

export function PostFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);

  const { data: postsData, isLoading, error } = useQuery<PostsResponse>({
    queryKey: ['/api/social/posts'],
    queryFn: async () => {
      try {
        console.log('Fetching posts...');
        const response = await apiRequest('GET', '/api/social/posts');

        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }

        const data = await response.json();
        console.log('Parsed posts data:', data);
        return data;
      } catch (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
    },
    enabled: !!user // Only fetch when user is authenticated
  });

  const editPostMutation = useMutation({
    mutationFn: async ({ id, content, type }: { id: number; content: string; type: string }) => {
      const response = await apiRequest('PATCH', `/api/social/posts/${id}`, { content, type });
      if (!response.ok) {
        throw new Error('Failed to update post');
      }
      // Return the updated post data
      return { id, content, type };
    },
    onMutate: async ({ id, content, type }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/social/posts'] });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData<PostsResponse>(['/api/social/posts']);

      // Optimistically update to the new value
      if (previousPosts) {
        const updatedPosts = {
          ...previousPosts,
          data: previousPosts.data.map(post =>
            post.id === id 
              ? { ...post, content, type }
              : post
          )
        };
        queryClient.setQueryData(['/api/social/posts'], updatedPosts);
      }

      return { previousPosts };
    },
    onError: (err, newPost, context) => {
      // Revert back to the previous state if there's an error
      if (context?.previousPosts) {
        queryClient.setQueryData(['/api/social/posts'], context.previousPosts);
      }
      toast({
        title: "Error",
        description: err.message || "Failed to update post",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post updated successfully",
      });
      setEditingPost(null);
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest('DELETE', `/api/social/posts/${postId}`);
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      return postId;
    },
    onMutate: async (postId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/social/posts'] });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData<PostsResponse>(['/api/social/posts']);

      // Optimistically update to the new value
      if (previousPosts) {
        const updatedPosts = {
          ...previousPosts,
          data: previousPosts.data.filter(post => post.id !== postId)
        };
        queryClient.setQueryData(['/api/social/posts'], updatedPosts);
      }

      return { previousPosts };
    },
    onError: (err, postId, context) => {
      // Revert back to the previous state if there's an error
      if (context?.previousPosts) {
        queryClient.setQueryData(['/api/social/posts'], context.previousPosts);
      }
      toast({
        title: "Error",
        description: err.message || "Failed to delete post",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  });

  // Helper function to check if user can edit/delete a post
  const canModifyPost = (post: Post) => {
    if (!user) return false;

    // Super admin can modify all posts
    if (user.userType === 'admin') return true;

    // Post creator can modify their own posts
    return user.id === post.user?.id;
  };

  // Check if current user is admin for showing moderation indicators
  const isAdmin = user?.userType === 'admin';

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
    console.error('PostFeed error:', error);
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
      {/* Admin Moderation Banner */}
      {isAdmin && (
        <Card className="bg-primary/10">
          <CardContent className="p-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Admin Moderation Mode - You can edit or delete any post</span>
          </CardContent>
        </Card>
      )}

      {postsData.data.map((post) => (
        <Card key={post.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>
                  {post.user?.businessName?.[0] || post.user?.email[0].toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">
                  {post.user?.businessName || post.user?.email || 'Anonymous'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
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

            {/* Image Gallery */}
            {post.images && post.images.length > 0 && (
              <div className={`grid gap-2 mt-4 ${
                post.images.length === 1 ? 'grid-cols-1' :
                  post.images.length === 2 ? 'grid-cols-2' :
                    'grid-cols-2'
              }`}>
                {post.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Post image ${index + 1}`}
                    className="rounded-md w-full h-48 object-cover"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Edit Post Dialog */}
      {editingPost && (
        <CreatePostDialog
          open={!!editingPost}
          onOpenChange={(open) => {
            if (!open) setEditingPost(null);
          }}
          editPost={editingPost}
          onEdit={(content, type) => {
            editPostMutation.mutate({
              id: editingPost.id,
              content,
              type
            });
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
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
    </div>
  );
}
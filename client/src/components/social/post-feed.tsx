import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow, parseISO } from "date-fns";
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
import { ImageViewerModal } from "./image-viewer-modal";
import type { Post, PostsResponse, PostResponse, PostMutationResponse } from "@/types/posts";

export function PostFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      setPostToDelete(null);

      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    }
  });

  const canModifyPost = (post: Post) => {
    if (!user) return false;
    if (user.userType === 'admin') return true;
    return user.id === post.user?.id;
  };

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

            {/* Handle both mediaUrls and images */}
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
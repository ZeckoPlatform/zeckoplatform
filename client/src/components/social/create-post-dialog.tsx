import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Post, PostResponse, PostMutationResponse } from "@/types/posts";

const createPostSchema = z.object({
  content: z.string().min(1, "Please write something to share"),
  type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"]).default("update"),
  images: z.array(z.string()).optional()
});

type CreatePostSchema = z.infer<typeof createPostSchema>;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPost?: Post;
  onEdit?: (post: CreatePostSchema) => void;
}

export function CreatePostDialog({ open, onOpenChange, editPost, onEdit }: CreatePostDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const form = useForm<CreatePostSchema>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: editPost?.content || "",
      type: editPost?.type || "update",
      images: editPost?.mediaUrls || editPost?.images || []
    }
  });

  useEffect(() => {
    if (editPost) {
      const currentImages = editPost?.mediaUrls || editPost?.images || [];
      setExistingImages(currentImages);
      form.reset({
        content: editPost.content,
        type: editPost.type,
        images: currentImages
      });
    } else {
      setExistingImages([]);
      form.reset({
        content: "",
        type: "update",
        images: []
      });
    }
  }, [editPost, form]);

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload image');
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    const newImages: { file: File; preview: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newImages.push({ file, preview });
      }
    }

    setImages([...images, ...newImages]);
  };

  const removeNewImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const removeExistingImage = (index: number) => {
    const newExistingImages = [...existingImages];
    newExistingImages.splice(index, 1);
    setExistingImages(newExistingImages);
    form.setValue('images', newExistingImages);
  };

  const createPost = useMutation({
    mutationFn: async (data: CreatePostSchema) => {
      try {
        setIsUploading(true);
        let uploadedUrls: string[] = [];

        if (images.length > 0) {
          uploadedUrls = await Promise.all(
            images.map(img => handleImageUpload(img.file))
          );
        }

        const postData = {
          content: data.content,
          type: data.type,
          images: [...existingImages, ...uploadedUrls]
        };

        const response = await apiRequest("POST", "/api/social/posts", postData);
        if (!response.ok) {
          throw new Error('Failed to create post');
        }

        const result: PostMutationResponse = await response.json();
        return result.data;
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to create post');
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (newPost) => {
      queryClient.setQueryData<PostResponse>(['/api/social/posts'], (old: any) => {
        if (!old) return { success: true, data: [newPost] };
        return {
          ...old,
          data: [newPost, ...old.data]
        };
      });

      toast({
        title: "Success",
        description: "Your update has been shared"
      });

      form.reset();
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);
      setExistingImages([]);
      onOpenChange(false);

      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const editPostMutation = useMutation({
    mutationFn: async (data: CreatePostSchema) => {
      try {
        setIsUploading(true);
        let uploadedUrls: string[] = [];

        if (images.length > 0) {
          uploadedUrls = await Promise.all(
            images.map(img => handleImageUpload(img.file))
          );
        }

        if (!editPost?.id) throw new Error('Post ID is required for editing');

        const postData = {
          content: data.content,
          type: data.type,
          images: [...existingImages, ...uploadedUrls]
        };

        const response = await apiRequest("PATCH", `/api/social/posts/${editPost?.id}`, postData);
        if (!response.ok) {
          throw new Error('Failed to update post');
        }

        const result: PostMutationResponse = await response.json();
        return result.data;
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to update post');
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (updatedPost) => {
      queryClient.setQueryData<PostResponse>(['/api/social/posts'], (old: any) => {
        if (!old) return { success: true, data: [updatedPost] };
        return {
          ...old,
          data: old.data.map((post: Post) =>
            post.id === updatedPost.id ? updatedPost : post
          )
        };
      });

      toast({
        title: "Success",
        description: "Your post has been updated"
      });

      form.reset();
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);
      setExistingImages([]);
      onOpenChange(false);

      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (data: CreatePostSchema) => {
    try {
      if (editPost) {
        await editPostMutation.mutateAsync(data);
      } else {
        await createPost.mutateAsync(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };

  const totalImages = existingImages.length + images.length;
  const isSubmitting = createPost.isPending || editPostMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{editPost ? "Edit post" : "Create a post"}</DialogTitle>
          <DialogDescription>
            {editPost ? "Update your post" : "Share updates with your professional network"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="What do you want to share?"
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-4">
              {existingImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {existingImages.map((url, index) => (
                    <div key={`existing-${index}`} className="relative">
                      <img
                        src={url}
                        alt={`Existing image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeExistingImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img.preview}
                        alt={`Upload preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeNewImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={isSubmitting || totalImages >= 4}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {totalImages >= 4 ? 'Max images reached' : 'Add Images'}
                </Button>

                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={totalImages >= 4}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting || (!form.formState.isDirty && images.length === 0 && existingImages.length === existingImages.length)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isUploading ? 'Uploading...' : editPost ? 'Updating...' : 'Posting...'}
                    </>
                  ) : (
                    editPost ? 'Update' : 'Post'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
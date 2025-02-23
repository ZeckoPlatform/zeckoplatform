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
import type { Post, PostResponse, PostsResponse } from "@/types/posts";

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
  onEdit?: (content: string, type: Post['type']) => void;
}

export function CreatePostDialog({ open, onOpenChange, editPost, onEdit }: CreatePostDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<CreatePostSchema>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: editPost?.content || "",
      type: editPost?.type || "update",
      images: editPost?.images || []
    }
  });

  useEffect(() => {
    if (editPost) {
      form.reset({
        content: editPost.content,
        type: editPost.type,
        images: editPost.images || []
      });
    }
  }, [editPost, form]);

  const handleImageUpload = async (file: File) => {
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
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('No URL in upload response');
      }

      return data.url;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
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

  const removeImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setImages(newImages);
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
          images: uploadedUrls
        };

        const response = await apiRequest("POST", "/api/social/posts", postData);
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || 'Failed to create post');
        }

        const newPost: PostResponse = await response.json();
        return newPost.data;
      } catch (error) {
        console.error('Post creation error:', error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (newPost) => {
      queryClient.setQueryData<PostsResponse>(['/api/social/posts'], (old) => {
        if (!old) return { success: true, data: [newPost] };
        return {
          ...old,
          data: [newPost, ...old.data]
        };
      });

      toast({
        title: "Posted!",
        description: "Your update has been shared"
      });

      form.reset();
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (data: CreatePostSchema) => {
    try {
      if (editPost && onEdit) {
        onEdit(data.content, data.type);
      } else {
        await createPost.mutateAsync(data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };

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
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
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
              {editPost?.images && editPost.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {editPost.images.map((image, index) => (
                    <div key={`existing-${index}`} className="relative">
                      <img
                        src={image}
                        alt={`Existing image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
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
                        onClick={() => removeImage(index)}
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
                  disabled={createPost.isPending || images.length >= 4}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {images.length >= 4 ? 'Max images reached' : 'Add Images'}
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={images.length >= 4}
                />

                <Button
                  type="submit"
                  disabled={createPost.isPending || (!form.formState.isDirty && images.length === 0)}
                >
                  {createPost.isPending ? (
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
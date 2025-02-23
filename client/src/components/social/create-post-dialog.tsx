import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { MessageSquarePlus, Bug, Loader2, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createPostSchema = z.object({
  content: z.string().min(1, "Please write something to share"),
  type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"]).default("update"),
  images: z.array(z.string()).optional()
});

type CreatePostSchema = z.infer<typeof createPostSchema>;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPost?: {
    id: number;
    content: string;
    type: string;
    images?: string[];
  };
  onEdit?: (content: string, type: string) => void;
}

export function CreatePostDialog({ open, onOpenChange, editPost, onEdit }: CreatePostDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form with edit values if they exist
  const form = useForm<CreatePostSchema>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: editPost?.content || "",
      type: (editPost?.type as CreatePostSchema["type"]) || "update",
      images: editPost?.images || []
    }
  });

  // Effect to reset form when editPost changes
  useEffect(() => {
    if (editPost) {
      form.reset({
        content: editPost.content,
        type: editPost.type as CreatePostSchema["type"],
        images: editPost.images || []
      });
    }
  }, [editPost, form]);

  const resizeImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Target dimensions (max width/height of 1200px while maintaining aspect ratio)
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob from canvas'));
              }
            },
            'image/jpeg',
            0.8
          );
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  };

  const handleImageUpload = async (file: File) => {
    try {
      const resizedBlob = await resizeImage(file);
      const formData = new FormData();
      formData.append('file', resizedBlob, file.name);

      // Use fetch directly for FormData upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include', // Include cookies
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload error response:', errorText);
        throw new Error('Failed to upload image');
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
    // Mark form as dirty when new images are added
    form.setValue("images", [...(form.getValues("images") || []), ...Array(newImages.length).fill("")], {
      shouldDirty: true
    });
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setImages(newImages);
    // Mark form as dirty when images are removed
    form.setValue("images", form.getValues("images")?.filter((_, i) => i !== index) || [], {
      shouldDirty: true
    });
  };

  const createPost = useMutation({
    mutationFn: async (data: CreatePostSchema) => {
      try {
        setIsUploading(true);
        console.log('Uploading images and creating post...');

        // Upload all images first
        const uploadedUrls = await Promise.all(
          images.map(img => handleImageUpload(img.file))
        );

        // Add uploaded URLs to the post data
        const postData = {
          ...data,
          images: editPost
            ? [...(editPost.images || []), ...uploadedUrls] // Keep existing images when editing
            : uploadedUrls // Only new images for new posts
        };

        console.log('Sending post data:', postData);

        // If editing, use PATCH request
        if (editPost) {
          const response = await apiRequest("PATCH", `/api/social/posts/${editPost.id}`, postData);
          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Failed to update post');
          }
          return await response.json();
        }

        // Otherwise create new post
        const response = await apiRequest("POST", "/api/social/posts", postData);
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || 'Failed to create post');
        }

        return await response.json();
      } catch (error) {
        console.error('Post creation error:', error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      toast({ 
        title: editPost ? "Updated!" : "Posted!", 
        description: editPost ? "Your post has been updated" : "Your update has been shared"
      });
      form.reset();
      // Clean up image previews
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    },
    onError: (error: Error) => {
      console.error('Post creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = async (data: CreatePostSchema) => {
    try {
      if (editPost && onEdit) {
        // If editing, call onEdit callback
        onEdit(data.content, data.type);
      } else {
        // Otherwise create new post
        createPost.mutate(data);
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

            {/* Image upload section */}
            <div className="space-y-4">
              {/* Show existing images from editPost */}
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

              {/* Show new images being uploaded */}
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
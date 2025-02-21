import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Image, Link, Loader2, X } from "lucide-react";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const createPostSchema = z.object({
  content: z.string().min(1, "Post content is required"),
  type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"]),
  mediaUrls: z.array(z.string()).optional(),
  linkUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type CreatePostSchema = z.infer<typeof createPostSchema>;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePostDialog({ open, onOpenChange }: CreatePostDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploadType, setUploadType] = useState<'url' | 'file' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const form = useForm<CreatePostSchema>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: "",
      type: "update",
      mediaUrls: [],
      linkUrl: "",
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error("You must be logged in to upload images");
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        console.log("Uploading file:", file.name);
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        const contentType = response.headers.get("content-type");
        if (!response.ok) {
          const errorData = contentType?.includes("application/json") 
            ? await response.json()
            : { error: "Failed to upload image" };
          throw new Error(errorData.error || "Failed to upload image");
        }

        const data = await response.json();
        console.log("Upload successful:", data);
        return data.url;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    },
    onSuccess: (url) => {
      const currentUrls = form.getValues("mediaUrls") || [];
      form.setValue("mediaUrls", [...currentUrls, url]);
      setSelectedImages([...selectedImages, url]);
      setShowMediaInput(false);
      setUploadType(null);
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Upload mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      setUploadType(null);
    },
  });

  const createPost = useMutation({
    mutationFn: async (data: CreatePostSchema) => {
      const response = await apiRequest("POST", "/api/social/posts", {
        content: data.content,
        type: data.type,
        mediaUrls: data.mediaUrls || [],
        ...(data.linkUrl ? { linkUrl: data.linkUrl } : {})
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create post");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your post has been shared successfully.",
      });
      form.reset();
      setSelectedImages([]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    const file = files[0];

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Error",
        description: "File size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Error",
        description: "Only .jpg, .jpeg, .png and .webp files are accepted",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadImageMutation.mutateAsync(file);
    } catch (error) {
      console.error('File upload error:', error);
      setUploadType(null);
    }
  };

  const handleMediaAdd = (url: string) => {
    if (!url) return;

    try {
      new URL(url);
      const currentUrls = form.getValues("mediaUrls") || [];
      form.setValue("mediaUrls", [...currentUrls, url]);
      setSelectedImages([...selectedImages, url]);
      setShowMediaInput(false);
      setUploadType(null);
    } catch (e) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
    }
  };

  const removeImage = (index: number) => {
    const currentUrls = form.getValues("mediaUrls") || [];
    const newUrls = currentUrls.filter((_, i) => i !== index);
    form.setValue("mediaUrls", newUrls);
    setSelectedImages(newUrls);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Share your thoughts, insights, or opportunities with the community.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createPost.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Share your thoughts, insights or opportunities..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selectedImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt={`Upload ${index + 1}`} className="w-full h-32 object-cover rounded" />
                    <Button
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

            {showMediaInput && (
              <div className="space-y-4">
                {!uploadType ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setUploadType('url')}
                      className="flex-1"
                    >
                      Add Image URL
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setUploadType('file');
                        fileInputRef.current?.click();
                      }}
                      className="flex-1"
                    >
                      Upload Image
                    </Button>
                  </div>
                ) : uploadType === 'url' ? (
                  <FormField
                    control={form.control}
                    name="mediaUrls"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="url"
                              placeholder="Enter image URL"
                              onChange={(e) => handleMediaAdd(e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowMediaInput(false);
                                setUploadType(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>
            )}

            {showLinkInput && (
              <FormField
                control={form.control}
                name="linkUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          placeholder="Enter link URL"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowLinkInput(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowMediaInput(true);
                  setShowLinkInput(false);
                }}
              >
                <Image className="h-4 w-4 mr-2" />
                Add Image
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowLinkInput(true);
                  setShowMediaInput(false);
                }}
              >
                <Link className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPost.isPending || uploadImageMutation.isPending}
              >
                {createPost.isPending || uploadImageMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadImageMutation.isPending ? 'Uploading...' : 'Posting...'}
                  </>
                ) : (
                  'Post'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
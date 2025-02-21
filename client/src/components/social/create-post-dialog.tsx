import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Image, Link, Loader2 } from "lucide-react";
import { useState } from "react";

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
  const queryClient = useQueryClient();
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);

  const form = useForm<CreatePostSchema>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: "",
      type: "update",
      mediaUrls: [],
      linkUrl: "",
    },
  });

  const createPost = useMutation({
    mutationFn: async (data: CreatePostSchema) => {
      const response = await apiRequest("POST", "/api/social/posts", data);
      if (!response.ok) {
        throw new Error("Failed to create post");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      toast({
        title: "Post created",
        description: "Your post has been shared successfully.",
      });
      form.reset();
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

  const handleMediaAdd = (url: string) => {
    const currentUrls = form.getValues("mediaUrls") || [];
    form.setValue("mediaUrls", [...currentUrls, url]);
    setShowMediaInput(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
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

            {showMediaInput && (
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
                          onClick={() => setShowMediaInput(false)}
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
                onClick={() => setShowMediaInput(true)}
              >
                <Image className="h-4 w-4 mr-2" />
                Add Image
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLinkInput(true)}
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
              <Button type="submit" disabled={createPost.isPending}>
                {createPost.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
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
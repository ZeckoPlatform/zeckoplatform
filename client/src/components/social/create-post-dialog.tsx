import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const createPostSchema = z.object({
  content: z.string().min(1, "Please write something to share")
});

type CreatePostSchema = z.infer<typeof createPostSchema>;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePostDialog({ open, onOpenChange }: CreatePostDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreatePostSchema>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: ""
    }
  });

  const createPost = useMutation({
    mutationFn: async (data: CreatePostSchema) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Not authenticated");

      console.log('Sending post data:', { ...data, type: "update" }); // Debug log

      const response = await fetch('/api/social/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: data.content,
          type: "update"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      const responseData = await response.json();
      console.log('Response data:', responseData); // Debug log
      return responseData;
    },
    onSuccess: () => {
      toast({ title: "Posted!", description: "Your update has been shared" });
      form.reset();
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['/api/social/posts'] });
    },
    onError: (error: Error) => {
      console.error('Post creation error:', error); // Debug log
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create a post</DialogTitle>
          <DialogDescription>
            Share updates with your professional network
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
                      placeholder="What do you want to share?"
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
                disabled={createPost.isPending}
              >
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
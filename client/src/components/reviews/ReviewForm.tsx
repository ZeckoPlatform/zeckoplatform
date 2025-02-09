import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ReviewFormProps {
  targetId: number;
  onSuccess?: () => void;
}

export function ReviewForm({ targetId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const submitReview = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetId,
          rating,
          content,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", targetId] });
      toast({
        title: "Review submitted",
        description: "Your review has been submitted successfully.",
      });
      setRating(0);
      setContent("");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i + 1)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 ${
                i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your review..."
        className="min-h-[100px]"
      />
      <Button
        onClick={() => submitReview.mutate()}
        disabled={!rating || !content.trim() || submitReview.isPending}
      >
        {submitReview.isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </div>
  );
}

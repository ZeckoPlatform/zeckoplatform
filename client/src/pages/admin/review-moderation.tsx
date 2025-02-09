import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";

export default function ReviewModerationPage() {
  const { toast } = useToast();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["/api/reviews/pending"],
    queryFn: async () => {
      const response = await fetch("/api/reviews/pending");
      if (!response.ok) throw new Error("Failed to fetch pending reviews");
      return response.json();
    },
  });

  const moderateReview = useMutation({
    mutationFn: async ({ reviewId, status, notes }: { reviewId: number; status: string; notes?: string }) => {
      const response = await fetch(`/api/reviews/${reviewId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, moderationNotes: notes }),
      });
      if (!response.ok) throw new Error("Failed to moderate review");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/pending"] });
      toast({
        title: "Review moderated",
        description: "The review has been successfully moderated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Review Moderation</h1>
      <div className="grid gap-6">
        {reviews?.map((review: any) => (
          <Card key={review.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    Review by {review.author.username}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(review.createdAt), "PPP")}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{review.content}</p>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  className="border-green-500 hover:bg-green-50"
                  onClick={() =>
                    moderateReview.mutate({
                      reviewId: review.id,
                      status: "approved",
                    })
                  }
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500 hover:bg-red-50"
                  onClick={() =>
                    moderateReview.mutate({
                      reviewId: review.id,
                      status: "rejected",
                    })
                  }
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Badge variant="secondary">
                  {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

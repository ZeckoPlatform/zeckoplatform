import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";

export function ReviewsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["/api/reviews", user?.id],
    enabled: !!user?.id,
  });

  const replyToReview = useMutation({
    mutationFn: async ({ reviewId, reply }: { reviewId: number; reply: string }) => {
      const response = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      if (!response.ok) throw new Error("Failed to reply to review");
      return response.json();
    },
    onSuccess: (_, variables) => {
      setReplyText({ ...replyText, [variables.reviewId]: "" });
      toast({
        title: "Reply sent",
        description: "Your reply has been posted successfully.",
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reviews</h2>
          <p className="text-muted-foreground">
            Manage and respond to your customer reviews
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">Average Rating</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= (reviews?.[0]?.averageRating || 0)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Total Reviews</p>
            <p className="text-2xl font-bold">{reviews?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {reviews?.map((review: any) => (
          <Card key={review.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {review.author?.username}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(review.createdAt), "PPP")}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= review.rating
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

              {/* Show existing reply if any */}
              {review.reply && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-semibold">Your Reply</span>
                  </div>
                  <p>{review.reply}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {format(new Date(review.repliedAt), "PPP")}
                  </p>
                </div>
              )}

              {/* Reply form if no reply exists */}
              {!review.reply && (
                <div className="mt-4">
                  <Textarea
                    placeholder="Write your reply..."
                    value={replyText[review.id] || ""}
                    onChange={(e) =>
                      setReplyText({ ...replyText, [review.id]: e.target.value })
                    }
                    className="mb-2"
                  />
                  <Button
                    onClick={() =>
                      replyToReview.mutate({
                        reviewId: review.id,
                        reply: replyText[review.id],
                      })
                    }
                    disabled={!replyText[review.id]?.trim()}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  Helpful ({review.helpfulVotes || 0})
                </Button>
                <Button variant="outline" size="sm">
                  <ThumbsDown className="w-4 h-4 mr-1" />
                  Not Helpful ({review.unhelpfulVotes || 0})
                </Button>
                <Badge variant="secondary">
                  {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {reviews?.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No reviews yet. Reviews will appear here once customers leave them.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

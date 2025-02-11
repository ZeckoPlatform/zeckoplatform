import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

export default function ReviewModerationPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});

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
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/pending"] });
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

  const canReplyToReview = (review: any) => {
    if (!user) return false;
    return (
      (user.userType === "business" || user.userType === "vendor") &&
      review.targetId === user.id &&
      !review.reply
    );
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Review Management</h1>
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

              {/* Show existing reply if any */}
              {review.reply && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-semibold">Reply from {review.replyAuthor?.username}</span>
                  </div>
                  <p>{review.reply}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {format(new Date(review.repliedAt), "PPP")}
                  </p>
                </div>
              )}

              {/* Reply form for businesses/vendors */}
              {canReplyToReview(review) && (
                <div className="mt-4">
                  <Textarea
                    placeholder="Write your reply..."
                    value={replyText[review.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                    className="mb-2"
                  />
                  <Button
                    onClick={() => replyToReview.mutate({
                      reviewId: review.id,
                      reply: replyText[review.id]
                    })}
                    disabled={!replyText[review.id]?.trim()}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              )}

              {/* Moderation buttons for admins */}
              {user?.userType === "admin" && (
                <div className="flex items-center gap-4 mt-4">
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
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
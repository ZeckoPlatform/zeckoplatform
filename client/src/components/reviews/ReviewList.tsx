import { useQuery } from "@tanstack/react-query";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface ReviewListProps {
  userId: number;
}

export function ReviewList({ userId }: ReviewListProps) {
  const { user } = useAuth();
  
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["/api/reviews", userId],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch reviews");
      return response.json();
    },
  });

  if (isLoading) {
    return <ReviewListSkeleton />;
  }

  return (
    <div className="space-y-4">
      {reviews?.map((review: any) => (
        <Card key={review.id}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-sm font-medium">
                  {review.author.username}
                </CardTitle>
                <CardDescription>
                  {format(new Date(review.createdAt), "PPP")}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{review.content}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  Helpful
                </Button>
                <Button variant="outline" size="sm">
                  <ThumbsDown className="w-4 h-4 mr-1" />
                  Not Helpful
                </Button>
              </div>
              {user?.userType === "admin" && (
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      review.status === "approved"
                        ? "success"
                        : review.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {review.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    Moderate
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReviewListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32 mt-1" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

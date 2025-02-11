import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ReviewList } from "@/components/reviews/ReviewList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, User, Building2, Package } from "lucide-react";

export default function ReviewsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get reputation score
  const { data: reputation } = useQuery({
    queryKey: ["/api/reputation", user?.id],
    enabled: !!user?.id,
  });

  // Get reviews written by the user
  const { data: writtenReviews } = useQuery({
    queryKey: ["/api/reviews/written", user?.id],
    enabled: !!user?.id,
  });

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Reviews Dashboard</h1>

      {user?.userType === "free" && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Reputation</CardTitle>
            <CardDescription>
              Your reputation score is based on the quality of leads you provide
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Overall Score</p>
                <p className="text-2xl font-bold">
                  {((reputation?.overallScore || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Average Rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= (reputation?.averageRating || 0)
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Response Rate</p>
                <p className="text-2xl font-bold">
                  {((reputation?.responseRate || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {((reputation?.completionRate || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="write">
        <TabsList>
          <TabsTrigger value="write" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Write Reviews
          </TabsTrigger>
          <TabsTrigger value="my-reviews" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            My Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Write Reviews</CardTitle>
              <CardDescription>
                Share your experience with businesses, vendors, and products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="businesses">
                <TabsList>
                  <TabsTrigger
                    value="businesses"
                    className="flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    Businesses
                  </TabsTrigger>
                  <TabsTrigger value="vendors" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Vendors
                  </TabsTrigger>
                  <TabsTrigger
                    value="products"
                    className="flex items-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Products
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="businesses" className="mt-6">
                  <ReviewForm targetType="business" />
                </TabsContent>
                <TabsContent value="vendors" className="mt-6">
                  <ReviewForm targetType="vendor" />
                </TabsContent>
                <TabsContent value="products" className="mt-6">
                  <ReviewForm targetType="product" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>My Reviews</CardTitle>
              <CardDescription>Reviews you've written</CardDescription>
            </CardHeader>
            <CardContent>
              {writtenReviews?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  You haven't written any reviews yet
                </p>
              ) : (
                <div className="space-y-6">
                  {writtenReviews?.map((review: any) => (
                    <Card key={review.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-sm font-medium">
                              Review for {review.targetType}:{" "}
                              {review.target?.username ||
                                review.target?.name ||
                                "Unknown"}
                            </CardTitle>
                            <CardDescription>
                              {new Date(review.createdAt).toLocaleDateString()}
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
                        <p>{review.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { MessageCircle, ThumbsUp, Share2, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CreatePostDialog } from "@/components/social/create-post-dialog";
import { useState } from "react";

interface Post {
  id: number;
  content: string;
  mediaUrls: string[];
  type: "update" | "article" | "success_story" | "market_insight" | "opportunity";
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  author: {
    id: number;
    businessName: string;
    email: string;
  };
  createdAt: string;
}

export default function SocialFeedPage() {
  const { user } = useAuth();
  const [showCreatePost, setShowCreatePost] = useState(false);

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/social/posts"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-24 bg-muted rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Business Network</h1>
        <Button onClick={() => setShowCreatePost(true)}>Share Update</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Main Feed */}
        <div className="col-span-3 space-y-4">
          {posts?.map((post) => (
            <Card key={post.id} className="p-6">
              <div className="flex items-start space-x-4">
                <Avatar>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {post.author.businessName?.[0] || post.author.email[0]}
                  </div>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{post.author.businessName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <p className="mt-4">{post.content}</p>

              {post.mediaUrls?.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {post.mediaUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="rounded-lg object-cover w-full h-48"
                    />
                  ))}
                </div>
              )}

              <Separator className="my-4" />

              <div className="flex justify-between text-sm text-muted-foreground">
                <Button variant="ghost" size="sm">
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  {post.engagement.likes}
                </Button>
                <Button variant="ghost" size="sm">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {post.engagement.comments}
                </Button>
                <Button variant="ghost" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  {post.engagement.shares}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trending Topics
            </h3>
            <div className="mt-4 space-y-2">
              <Button variant="ghost" className="w-full justify-start text-sm">
                #InternationalTrade
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sm">
                #BusinessGrowth
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sm">
                #MarketExpansion
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <CreatePostDialog open={showCreatePost} onOpenChange={setShowCreatePost} />
    </div>
  );
}

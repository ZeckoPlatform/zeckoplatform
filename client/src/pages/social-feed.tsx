import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { TrendingUp } from "lucide-react";
import { CreatePostDialog } from "@/components/social/create-post-dialog";
import { PostFeed } from "@/components/social/post-feed";

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

interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export default function SocialFeedPage() {
  const { user } = useAuth();
  const [showCreatePost, setShowCreatePost] = useState(false);

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Card className="p-6 text-center">
          Please log in to view the business network feed.
        </Card>
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
        <div className="col-span-3">
          <PostFeed />
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
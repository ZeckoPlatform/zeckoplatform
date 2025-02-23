import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

interface Post {
  id: number;
  content: string;
  type: string;
  createdAt: string;
  user: {
    id: number;
    businessName: string | null;
    email: string;
    userType: string;
  } | null;
}

interface PostsResponse {
  success: boolean;
  data: Post[];
}

export function PostFeed() {
  const { data: postsData, isLoading, error } = useQuery<PostsResponse>({
    queryKey: ['/api/social/posts'],
    queryFn: async () => {
      try {
        console.log('Fetching posts...');
        const response = await apiRequest('GET', '/api/social/posts');

        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }

        const data = await response.json();
        console.log('Parsed posts data:', data);
        return data;
      } catch (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
    }
  });

  console.log('PostFeed render - data:', postsData);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[140px]" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    console.error('PostFeed error:', error);
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          Error loading posts. Please try again later.
        </CardContent>
      </Card>
    );
  }

  if (!postsData?.success || !postsData.data || postsData.data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No posts available yet. Be the first to post!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {postsData.data.map((post) => (
        <Card key={post.id}>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar>
              <AvatarFallback>
                {post.user?.businessName?.[0] || post.user?.email[0].toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">
                {post.user?.businessName || post.user?.email || 'Anonymous'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{post.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
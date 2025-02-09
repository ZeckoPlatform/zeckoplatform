import { ReviewForm } from "./ReviewForm";
import { ReviewList } from "./ReviewList";
import { useAuth } from "@/hooks/use-auth";

interface UserReviewsProps {
  userId: number;
  showForm?: boolean;
}

export function UserReviews({ userId, showForm = true }: UserReviewsProps) {
  const { user } = useAuth();
  
  // Don't show review form if viewing own profile
  const canReview = user && user.id !== userId;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Reviews</h2>
      {showForm && canReview && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Leave a Review</h3>
          <ReviewForm targetId={userId} />
        </div>
      )}
      <ReviewList userId={userId} />
    </div>
  );
}

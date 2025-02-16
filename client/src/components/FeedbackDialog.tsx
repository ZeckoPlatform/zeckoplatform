import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { MessageSquarePlus, Bug, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function FeedbackDialog() {
  const [feedbackType, setFeedbackType] = useState<"bug" | "feedback" | null>(null);
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [location] = useLocation();

  // Capture screenshot using html2canvas
  const captureScreenshot = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(document.body);
      setScreenshot(canvas.toDataURL());
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      toast({
        title: "Error",
        description: "Failed to capture screenshot",
        variant: "destructive",
      });
    }
  };

  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      const technicalContext = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userType: user?.userType,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        userEmail: user?.email || 'Anonymous'
      };

      const response = await apiRequest("POST", "/api/feedback", {
        type: feedbackType,
        description,
        screenshot,
        technicalContext,
        path: location,
        // Add notification targets
        notifyEmail: "zeckoinfo@gmail.com",
        notifyAdmins: true
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully and sent to our team.",
      });
      setFeedbackType(null);
      setDescription("");
      setScreenshot(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      toast({
        title: "Error",
        description: "Please provide a description",
        variant: "destructive",
      });
      return;
    }
    submitFeedbackMutation.mutate();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
        >
          <MessageSquarePlus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {!feedbackType
              ? "Send Feedback"
              : feedbackType === "bug"
              ? "Report a Bug"
              : "Share Feedback"}
          </DialogTitle>
          <DialogDescription>
            {!feedbackType
              ? "Choose the type of feedback you'd like to share"
              : feedbackType === "bug"
              ? "Help us improve by reporting any issues you encounter"
              : "Share your thoughts and suggestions with us"}
          </DialogDescription>
        </DialogHeader>

        {!feedbackType ? (
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center"
              onClick={() => setFeedbackType("bug")}
            >
              <Bug className="h-8 w-8 mb-2" />
              Report a Bug
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center"
              onClick={() => setFeedbackType("feedback")}
            >
              <MessageSquarePlus className="h-8 w-8 mb-2" />
              Share Feedback
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder={
                feedbackType === "bug"
                  ? "Please describe the bug and steps to reproduce it..."
                  : "Share your thoughts, suggestions, or feedback..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
              required
            />
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={captureScreenshot}
                disabled={submitFeedbackMutation.isPending}
              >
                {screenshot ? "Retake Screenshot" : "Include Screenshot"}
              </Button>
              <Button
                type="submit"
                disabled={submitFeedbackMutation.isPending}
              >
                {submitFeedbackMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
            {screenshot && (
              <div className="mt-4">
                <img
                  src={screenshot}
                  alt="Screenshot Preview"
                  className="max-h-[200px] w-full object-contain border rounded-lg"
                />
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
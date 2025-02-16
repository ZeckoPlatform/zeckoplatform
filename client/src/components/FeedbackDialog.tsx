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

type FeedbackType = "bug" | "feedback" | null;

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [location] = useLocation();

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
      const sanitizedDescription = description.trim();
      if (!sanitizedDescription) {
        throw new Error("Please provide a description");
      }
      if (!feedbackType) {
        throw new Error("Please select a feedback type");
      }

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

      const payload = {
        type: feedbackType,
        description: sanitizedDescription,
        screenshot,
        technicalContext,
        path: location,
        notifyEmail: "zeckoinfo@gmail.com",
        notifyAdmins: true
      };

      try {
        const response = await apiRequest("POST", "/api/feedback", payload);

        let responseData;
        try {
          responseData = await response.json();
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error('Invalid server response');
        }

        if (!response.ok || !responseData.success) {
          throw new Error(responseData.message || 'Failed to submit feedback');
        }

        return responseData.data;
      } catch (error) {
        console.error('API request error:', error);
        throw error instanceof Error ? error : new Error('Failed to submit feedback');
      }
    },
    onSuccess: () => {
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await submitFeedbackMutation.mutateAsync();
    } catch (error) {
      // Error already handled in mutation callbacks
      console.error('Form submission error:', error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFeedbackType(null);
    setDescription("");
    setScreenshot(null);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        } else {
          setOpen(true);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
          onClick={() => setOpen(true)}
        >
          <MessageSquarePlus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
              className="min-h-[100px] resize-none"
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
                disabled={submitFeedbackMutation.isPending || !description.trim()}
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
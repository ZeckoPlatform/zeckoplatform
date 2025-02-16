import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function FeedbackManagementPage() {
  const { toast } = useToast();
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [response, setResponse] = useState("");

  const { data: feedbackList = [] } = useQuery({
    queryKey: ["/api/admin/feedback"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/feedback");
      if (!response.ok) throw new Error("Failed to fetch feedback");
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/admin/feedback/${id}/status`,
        { status }
      );
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({
        title: "Success",
        description: "Feedback status updated",
      });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const response = await apiRequest(
        "POST",
        `/api/admin/feedback/${id}/respond`,
        { content }
      );
      if (!response.ok) throw new Error("Failed to send response");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      setResponse("");
      toast({
        title: "Success",
        description: "Response sent successfully",
      });
    },
  });

  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleRespond = (id: number) => {
    if (!response.trim()) {
      toast({
        title: "Error",
        description: "Response cannot be empty",
        variant: "destructive",
      });
      return;
    }
    respondMutation.mutate({ id, content: response });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Feedback Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="h-[600px] overflow-auto">
          <CardHeader>
            <CardTitle>Feedback List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feedbackList.map((feedback: any) => (
                <div
                  key={feedback.id}
                  className={`p-4 rounded-lg border cursor-pointer ${
                    selectedFeedback?.id === feedback.id
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => setSelectedFeedback(feedback)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-semibold">
                        {feedback.type.toUpperCase()}
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {feedback.description}
                      </p>
                    </div>
                    <Select
                      value={feedback.status}
                      onValueChange={(value) =>
                        handleStatusChange(feedback.id, value)
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {format(new Date(feedback.created_at), "PPp")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="h-[600px]">
          <CardHeader>
            <CardTitle>Response Management</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFeedback ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Details</h3>
                  <p className="text-sm mt-2">{selectedFeedback.description}</p>
                  {selectedFeedback.technical_context && (
                    <div className="mt-4 text-sm">
                      <h4 className="font-semibold">Technical Context</h4>
                      <pre className="mt-2 p-2 bg-muted rounded-md overflow-auto">
                        {JSON.stringify(
                          selectedFeedback.technical_context,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Previous Responses</h3>
                  <div className="space-y-2 max-h-[200px] overflow-auto">
                    {selectedFeedback.responses?.map((response: any) => (
                      <div
                        key={response.id}
                        className="p-2 rounded-md bg-muted text-sm"
                      >
                        <div className="flex justify-between items-start">
                          <p>{response.content}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(response.created_at), "PPp")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Send Response</h3>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type your response..."
                    className="min-h-[100px]"
                  />
                  <Button
                    className="mt-2"
                    onClick={() => handleRespond(selectedFeedback.id)}
                    disabled={respondMutation.isPending}
                  >
                    Send Response
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a feedback item to manage responses
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Send } from "lucide-react";
import { format } from "date-fns";

export default function VendorMessages() {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [selectedThread, setSelectedThread] = useState(null);

  const { data: threads, isLoading } = useQuery({
    queryKey: ["/api/vendor/messages"],
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ threadId, message }) => {
      const response = await apiRequest("POST", `/api/vendor/messages/${threadId}/reply`, {
        message,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/messages"] });
      setReplyText("");
      toast({ title: "Success", description: "Reply sent successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendReply = (threadId) => {
    if (!replyText.trim()) return;
    sendReplyMutation.mutate({ threadId, message: replyText });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Message Threads List */}
      <div className="col-span-4 space-y-4">
        {threads?.map((thread) => (
          <Card
            key={thread.id}
            className={`cursor-pointer transition-colors hover:bg-accent ${
              selectedThread?.id === thread.id ? "bg-accent" : ""
            }`}
            onClick={() => setSelectedThread(thread)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Order #{thread.orderId}</p>
                  <p className="text-sm text-muted-foreground">
                    {thread.customerName}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(thread.lastMessageAt), "PP")}
                </div>
              </div>
              <p className="text-sm mt-2 truncate">
                {thread.lastMessage}
              </p>
              {thread.unreadCount > 0 && (
                <div className="mt-2">
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    {thread.unreadCount} new
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message Thread View */}
      <div className="col-span-8">
        {selectedThread ? (
          <div className="space-y-4">
            <div className="space-y-4 max-h-[600px] overflow-y-auto p-4 border rounded-lg">
              {selectedThread.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isVendor ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.isVendor
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent"
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {format(new Date(message.createdAt), "PP p")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1"
              />
              <Button
                onClick={() => handleSendReply(selectedThread.id)}
                disabled={!replyText.trim() || sendReplyMutation.isPending}
              >
                {sendReplyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}

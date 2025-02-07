import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender: {
    username: string;
  };
}

interface MessageDialogProps {
  leadId: number;
  receiverId: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MessageDialog({ leadId, receiverId, isOpen, onOpenChange }: MessageDialogProps) {
  const [newMessage, setNewMessage] = useState("");
  const { user } = useAuth();

  const { data: messages, refetch } = useQuery<Message[]>({
    queryKey: ["/api/leads", leadId, "messages"],
    enabled: isOpen,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/leads/${leadId}/messages`, {
        receiverId,
        content,
      });
    },
    onSuccess: () => {
      setNewMessage("");
      refetch();
    },
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await sendMessageMutation.mutateAsync(newMessage);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-[400px]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages?.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.sender.username === user?.username
                      ? "items-end"
                      : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender.username === user?.username
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {message.sender.username} • {format(new Date(message.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <form onSubmit={handleSend} className="flex gap-2 p-4 border-t">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={sendMessageMutation.isPending}
            >
              Send
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

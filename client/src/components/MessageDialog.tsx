import { useState, useEffect, useRef } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useNotificationSound } from "@/lib/useNotificationSound";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  content: string;
  sender_id: number;
  receiver_id: number;
  lead_id: number;
  read: boolean;
  created_at: string;
}

interface MessageDialogProps {
  leadId: number;
  receiverId: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMessagesRead?: () => void;
}

export function MessageDialog({
  leadId,
  receiverId,
  isOpen,
  onOpenChange,
  onMessagesRead
}: MessageDialogProps) {
  const [newMessage, setNewMessage] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number | null>(null);
  const playNotification = useNotificationSound();
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: [`/api/leads/${leadId}/messages`],
    enabled: isOpen && !!user?.id && !!receiverId,
    refetchInterval: isOpen ? 3000 : false,
  });

  useEffect(() => {
    if (!isOpen || !messages.length) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.id !== lastMessageIdRef.current) {
      if (lastMessage.sender_id !== user?.id) {
        playNotification('receive');
      }
      lastMessageIdRef.current = lastMessage.id;
      scrollToBottom();
    }

    const hasUnreadMessages = messages.some(m => !m.read && m.sender_id !== user?.id);
    if (hasUnreadMessages) {
      markAsReadMutation.mutate();
    }
  }, [messages, isOpen, user?.id]);

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiRequest("POST", `/api/leads/${leadId}/messages/read`);
        if (!response.ok) throw new Error("Failed to mark messages as read");
        return response.json();
      } catch (error) {
        console.error("Mark as read error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData<Message[]>([`/api/leads/${leadId}/messages`],
        oldMessages => oldMessages?.map(m => ({
          ...m,
          read: m.sender_id !== user?.id ? true : m.read
        }))
      );

      if (onMessagesRead) onMessagesRead();
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      try {
        if (!content.trim()) {
          throw new Error("Message cannot be empty");
        }

        if (!receiverId) {
          throw new Error("Invalid recipient");
        }

        const response = await apiRequest("POST", `/api/leads/${leadId}/messages`, {
          receiverId,
          content: content.trim(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to send message");
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Send message error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to send message";
        toast({
          title: "Error sending message",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      }
    },
    onSuccess: (newMessage) => {
      setNewMessage("");
      playNotification('send');

      queryClient.setQueryData<Message[]>([`/api/leads/${leadId}/messages`],
        old => old ? [...old, newMessage] : [newMessage]
      );

      scrollToBottom();
    },
    onError: (error: Error) => {
      console.error("Message mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      toast({
        title: "Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }
    try {
      await sendMessageMutation.mutateAsync(newMessage);
    } catch (error) {
      // Error is already handled in mutation
      console.error("Handle send error:", error);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Message Thread</DialogTitle>
        <DialogDescription>
          Send and receive messages about this lead
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col h-[400px]">
        <div
          ref={messageContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.sender_id === user?.id
                      ? "items-end"
                      : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender_id === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {format(new Date(message.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <form onSubmit={handleSend} className="flex gap-2 p-4 border-t">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={sendMessageMutation.isPending || !newMessage.trim()}
          >
            {sendMessageMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send'
            )}
          </Button>
        </form>
      </div>
    </DialogContent>
  );
}
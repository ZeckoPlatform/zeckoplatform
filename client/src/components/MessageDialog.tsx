import { useState, useEffect, useRef } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useNotificationSound } from "@/lib/useNotificationSound";

interface Message {
  id: number;
  content: string;
  created_at: string;
  sender: {
    id: number;
    username: string;
  };
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
  const playNotification = useNotificationSound();
  const previousMessagesLengthRef = useRef(0);

  // Use a consistent query key format
  const messagesQueryKey = [`/api/leads/${leadId}/messages`];

  const { data: messages = [], isLoading, error } = useQuery<Message[]>({
    queryKey: messagesQueryKey,
    enabled: isOpen,
    refetchInterval: 5000, // Poll every 5 seconds when dialog is open
  });

  // Play notification sound when new messages arrive
  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current && isOpen) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.sender?.id !== user?.id) {
        playNotification();
      }
    }
    previousMessagesLengthRef.current = messages.length;
  }, [messages.length, isOpen, user?.id, playNotification]);

  // Mark messages as read when dialog opens
  useEffect(() => {
    if (isOpen && messages.length > 0 && onMessagesRead) {
      onMessagesRead();
    }
  }, [isOpen, messages.length, onMessagesRead]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/messages`, {
        receiverId,
        content,
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (newMessage) => {
      setNewMessage("");
      // Optimistically update the messages list
      queryClient.setQueryData(messagesQueryKey, (old: Message[] = []) => {
        return [...old, {
          ...newMessage,
          sender: {
            id: user?.id || 0,
            username: user?.username || 'You'
          }
        }];
      });
      // Also invalidate to ensure we get the latest from the server
      queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    },
    onError: (error: Error) => {
      console.error("Failed to send message:", error);
    },
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await sendMessageMutation.mutateAsync(newMessage);
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Messages</DialogTitle>
        <DialogDescription>
          Send and receive messages about this lead
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col h-[400px]">
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive p-4">
              Failed to load messages. Please try again.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.sender?.id === user?.id
                      ? "items-end"
                      : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender?.id === user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {message.sender?.username || 'Unknown'} • {format(new Date(message.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          )}
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
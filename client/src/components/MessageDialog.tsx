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

interface Message {
  id: number;
  content: string;
  created_at: string;
  read: boolean;
  sender: {
    id: number;
    username: string;
  };
  receiver: {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);
  const previousMessagesLengthRef = useRef(0);

  const messagesQueryKey = [`/api/leads/${leadId}/messages`];

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: messagesQueryKey,
    enabled: isOpen,
    refetchInterval: isOpen ? 3000 : false,
  });

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Effect for handling new messages and notifications
  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current && !isFirstLoadRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.sender?.id !== user?.id) {
        playNotification('receive');
      }
      scrollToBottom();
    }
    previousMessagesLengthRef.current = messages.length;
  }, [messages, user?.id, playNotification]);

  // Effect for initial load and dialog open
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      // Force scroll after a delay to ensure DOM is ready
      const timer = setTimeout(scrollToBottom, 100);
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
      }
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages]);

  // Mark messages as read when dialog opens
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (isOpen && messages.length > 0) {
        const hasUnreadMessages = messages.some(m => 
          m.sender.id !== user?.id && !m.read
        );

        if (hasUnreadMessages) {
          try {
            const res = await apiRequest("POST", `/api/leads/${leadId}/messages/read`, {});
            if (res.ok) {
              await queryClient.invalidateQueries({ queryKey: messagesQueryKey });
              await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
              if (onMessagesRead) {
                onMessagesRead();
              }
            }
          } catch (error) {
            console.error("Error marking messages as read:", error);
          }
        }
      }
    };

    if (isOpen) {
      markMessagesAsRead();
    }
  }, [isOpen, messages, leadId, user?.id, queryClient, onMessagesRead]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/messages`, {
        receiverId,
        content,
      });
      return response.json();
    },
    onSuccess: (newMessage) => {
      setNewMessage("");
      playNotification('send');
      queryClient.setQueryData(messagesQueryKey, (old: Message[] = []) => {
        return [...old, newMessage];
      });
      queryClient.invalidateQueries({ queryKey: messagesQueryKey });
      setTimeout(scrollToBottom, 100);
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
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.sender.id === user?.id
                      ? "items-end"
                      : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender.id === user?.id
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
              <div ref={messagesEndRef} />
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
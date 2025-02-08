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
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);
  const previousMessagesLengthRef = useRef(0);

  const messagesQueryKey = [`/api/leads/${leadId}/messages`];

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: messagesQueryKey,
    enabled: isOpen,
    refetchInterval: isOpen ? 3000 : false,
    staleTime: 0,
    gcTime: Infinity,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !leadId) {
        throw new Error("Missing required parameters");
      }

      const response = await apiRequest("POST", `/api/leads/${leadId}/messages/read`, {
        receiver_id: user.id
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to mark messages as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData<Message[]>(messagesQueryKey, oldMessages => 
        oldMessages?.map(m => ({
          ...m,
          read: m.sender.id !== user?.id ? true : m.read
        }))
      );
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (onMessagesRead) {
        onMessagesRead();
      }
    },
    onError: (error: Error) => {
      console.error("Error marking messages as read:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark messages as read",
        variant: "destructive"
      });
    }
  });

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const scrollHeight = container.scrollHeight;
      const height = container.clientHeight;
      const maxScrollTop = scrollHeight - height;
      container.style.scrollBehavior = 'smooth';
      container.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  };

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.style.scrollBehavior = 'auto';
          scrollToBottom();
          messagesContainerRef.current.style.scrollBehavior = 'smooth';
        }
        isFirstLoadRef.current = false;
      }, 100);

      const hasUnreadMessages = messages.some(m => 
        m.sender.id !== user?.id && !m.read
      );

      if (hasUnreadMessages && user?.id) {
        markAsReadMutation.mutate();
      }

      return () => clearTimeout(timer);
    }
  }, [isOpen, messages, user?.id]);

  useEffect(() => {
    const unreadMessages = messages.filter(m => !m.read && m.sender.id !== user?.id);

    if (unreadMessages.length > 0 && !isOpen) {
      toast({
        title: "New Messages",
        description: `You have ${unreadMessages.length} new unread message${unreadMessages.length > 1 ? 's' : ''}`,
        variant: "default",
        duration: 5000,
      });
      playNotification('receive');
    }

    if (messages.length > previousMessagesLengthRef.current && !isFirstLoadRef.current) {
      scrollToBottom();
      if (messages[messages.length - 1]?.sender?.id !== user?.id) {
        playNotification('receive');
      }
    }
    previousMessagesLengthRef.current = messages.length;
  }, [messages, isOpen, user?.id]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/messages`, {
        receiverId,
        content,
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to send message");
      }
      return response.json();
    },
    onSuccess: (newMessage) => {
      setNewMessage("");
      playNotification('send');
      queryClient.setQueryData<Message[]>(messagesQueryKey, (old = []) => [...old, newMessage]);
      queryClient.invalidateQueries({ queryKey: messagesQueryKey });
      setTimeout(scrollToBottom, 100);
    },
    onError: (error: Error) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
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
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
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
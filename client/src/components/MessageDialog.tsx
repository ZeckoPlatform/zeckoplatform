import { useState, useEffect, useRef } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Loader2, MessageCircle } from "lucide-react";
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
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);
  const previousMessagesCount = useRef(0);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const messagesQueryKey = [`/api/leads/${leadId}/messages`];

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: messagesQueryKey,
    enabled: !!user?.id && isOpen,
    refetchInterval: isOpen ? 3000 : false,
  });

  // Scroll to bottom when new messages arrive or dialog opens
  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  // Initial scroll and mark as read when dialog opens
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (messages.length > 0) {
        const hasUnread = messages.some(m => !m.read && m.sender.id !== user?.id);
        if (hasUnread) {
          markAsReadMutation.mutate();
        }
      }
    }
  }, [isOpen, messages]);

  // Handle new message notifications and scroll
  useEffect(() => {
    if (!isFirstMount.current && messages.length > previousMessagesCount.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.sender.id !== user?.id) {
        playNotification('receive');
      }
      scrollToBottom();
    }
    previousMessagesCount.current = messages.length;
    isFirstMount.current = false;
  }, [messages, user?.id, playNotification]);

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/messages/read`);
      if (!response.ok) throw new Error("Failed to mark messages as read");
      return response.json();
    },
    onSuccess: () => {
      // Update the messages in the cache to mark them as read
      queryClient.setQueryData<Message[]>(messagesQueryKey, oldMessages => 
        oldMessages?.map(m => ({
          ...m,
          read: m.sender.id !== user?.id ? true : m.read
        }))
      );

      // Invalidate both the messages and leads queries
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: messagesQueryKey });

      if (onMessagesRead) onMessagesRead();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to mark messages as read",
        variant: "destructive"
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/messages`, {
        receiverId,
        content,
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: (newMessage) => {
      setNewMessage("");
      playNotification('send');
      queryClient.setQueryData<Message[]>(messagesQueryKey, old => [...(old || []), newMessage]);
      scrollToBottom();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
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
          ref={messageContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  ref={index === messages.length - 1 ? lastMessageRef : null}
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
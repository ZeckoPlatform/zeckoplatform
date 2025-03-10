import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageDialog } from "@/components/MessageDialog";
import { Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SelectLead, SelectUser } from '@/types/leads';
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface BusinessLeadsViewProps {
  leads: SelectLead[];
  user: SelectUser;
}

export function BusinessLeadsView({ leads, user }: BusinessLeadsViewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedMessageThread, setSelectedMessageThread] = useState<{ leadId: number; businessId: number } | null>(null);
  const [proposalText, setProposalText] = useState<string>("");
  const [isMessageOpen, setIsMessageOpen] = useState(false);

  const submitProposalMutation = useMutation({
    mutationFn: async ({ leadId, proposal }: { leadId: number; proposal: string }) => {
      const response = await apiRequest('POST', `/api/leads/${leadId}/responses`, { proposal });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit proposal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      setProposalText("");
      toast({
        title: "Success",
        description: "Proposal submitted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit proposal",
        variant: "destructive",
      });
    },
  });

  const getUnreadCount = (messages: any[] = [], userId: number) => {
    return messages?.filter(m => !m.read && m.receiver_id === userId).length || 0;
  };

  const hasExistingProposal = (lead: SelectLead) => {
    return lead.responses?.some(r => r.business_id === user.id && r.status !== 'rejected');
  };

  return (
    <>
      <div className="space-y-8">
        <div className="grid gap-4">
          {leads && leads.length > 0 ? (
            leads.map((lead) => {
              const existingResponse = lead.responses?.find(r => r.business_id === user.id);
              const unreadCount = getUnreadCount(lead.messages, user.id);

              return (
                <Card key={lead.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{lead.title}</CardTitle>
                      <div className="flex gap-2">
                        {existingResponse && existingResponse.status !== 'rejected' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="relative"
                            onClick={() => {
                              setSelectedMessageThread({ 
                                leadId: lead.id, 
                                businessId: user.id 
                              });
                              setIsMessageOpen(true);
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Messages
                            {unreadCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full"
                              >
                                {unreadCount}
                              </Badge>
                            )}
                          </Button>
                        )}
                        <Badge variant="secondary">
                          Budget: £{lead.budget}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{lead.description}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Category:</span> {lead.category}
                        {lead.subcategory && ` - ${lead.subcategory}`}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {lead.location}
                      </div>
                    </div>

                    {existingResponse ? (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold">Your Proposal</h3>
                          <Badge variant={
                            existingResponse.status === "accepted" ? "success" :
                              existingResponse.status === "rejected" ? "destructive" :
                                "secondary"
                          }>
                            {existingResponse.status.charAt(0).toUpperCase() + existingResponse.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{existingResponse.proposal}</p>
                      </div>
                    ) : (
                      <div className="mt-4 border-t pt-4">
                        <h3 className="font-semibold mb-2">Submit a Proposal</h3>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Write your proposal here..."
                            value={proposalText}
                            onChange={(e) => setProposalText(e.target.value)}
                            className="min-h-[100px]"
                          />
                          <Button
                            onClick={() => submitProposalMutation.mutate({
                              leadId: lead.id,
                              proposal: proposalText
                            })}
                            disabled={submitProposalMutation.isPending || !proposalText.trim()}
                          >
                            Submit Proposal
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground">
              No leads found matching your business profile.
            </div>
          )}
        </div>
      </div>

      {/* Message Dialog */}
      {selectedMessageThread && (
        <Dialog 
          open={isMessageOpen} 
          onOpenChange={setIsMessageOpen}
        >
          <MessageDialog
            leadId={selectedMessageThread.leadId}
            receiverId={leads.find(l => l.id === selectedMessageThread.leadId)?.user_id || 0}
            isOpen={isMessageOpen}
            onOpenChange={(open) => {
              setIsMessageOpen(open);
              if (!open) {
                setSelectedMessageThread(null);
                queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
              }
            }}
            onMessagesRead={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
            }}
          />
        </Dialog>
      )}
    </>
  );
}
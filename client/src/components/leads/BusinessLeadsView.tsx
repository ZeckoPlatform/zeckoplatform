import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageDialog } from "@/components/MessageDialog";
import { Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SelectLead, SelectUser, getUnreadCount } from '@/types/leads';
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
  const [selectedLead, setSelectedLead] = useState<SelectLead | null>(null);
  const [proposalText, setProposalText] = useState<string>("");

  const submitProposalMutation = useMutation({
    mutationFn: async ({ leadId, proposal }: { leadId: number; proposal: string }) => {
      const response = await apiRequest('POST', `/api/leads/${leadId}/responses`, { proposal });
      if (!response.ok) {
        throw new Error('Failed to submit proposal');
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

  return (
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
                    <Badge variant="secondary">
                      Budget: £{lead.budget}
                    </Badge>
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
                    <div>
                      <span className="font-medium">Posted:</span>{' '}
                      {new Date(lead.created_at).toLocaleDateString()}
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

                      {existingResponse.status === "accepted" && (
                        <div className="mt-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="relative">
                                <Send className="h-4 w-4 mr-2"/>
                                Open Messages
                                {unreadCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full"
                                  >
                                    {unreadCount}
                                  </Badge>
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Message Thread</DialogTitle>
                                <DialogDescription>
                                  View and send messages for this lead
                                </DialogDescription>
                              </DialogHeader>
                              <MessageDialog
                                leadId={lead.id}
                                receiverId={lead.user_id}
                                isOpen={true}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
                                  }
                                }}
                                onMessagesRead={() => {
                                  queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
                                }}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
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
  );
}
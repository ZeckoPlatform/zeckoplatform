import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Send } from "lucide-react";
import { MessageDialog } from "@/components/MessageDialog";
import { useToast } from "@/hooks/use-toast";
import { SelectLead, SelectUser, getUnreadCount } from '@/types/leads';
import { useQueryClient } from "@tanstack/react-query";

interface FreeUserLeadsViewProps {
  leads: SelectLead[];
  createLeadMutation: any;
  updateLeadMutation: any;
  editingLead: SelectLead | null;
  setEditingLead: (lead: SelectLead | null) => void;
  deleteLeadMutation: any;
  user: SelectUser;
  acceptProposalMutation: any;
  rejectProposalMutation: any;
}

interface MessageThread {
  leadId: number;
  businessId: number;
}

export function FreeUserLeadsView({
  leads,
  createLeadMutation,
  updateLeadMutation,
  editingLead,
  setEditingLead,
  deleteLeadMutation,
  user,
  acceptProposalMutation,
  rejectProposalMutation,
}: FreeUserLeadsViewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeMessageThreads, setActiveMessageThreads] = useState<MessageThread[]>([]);

  const handleOpenMessage = (leadId: number, businessId: number) => {
    setActiveMessageThreads(prev => [...prev, { leadId, businessId }]);
  };

  const handleCloseMessage = (leadId: number, businessId: number) => {
    setActiveMessageThreads(prev => 
      prev.filter(thread => !(thread.leadId === leadId && thread.businessId === businessId))
    );
    queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
  };

  return (
    <>
      <div className="space-y-8">
        <div className="grid gap-4">
          {leads && leads.length > 0 ? (
            leads.map((lead) => {
              const unreadCount = getUnreadCount(lead.messages, user.id);
              const hasResponses = lead.responses && lead.responses.length > 0;

              return (
                <Card key={lead.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{lead.title}</CardTitle>
                      <div className="flex gap-2">
                        {lead.user_id === user?.id && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingLead(lead)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {deleteLeadMutation && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteLeadMutation.mutate(lead.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{lead.description}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Category:</span> {lead.category}
                      </div>
                      <div>
                        <span className="font-medium">Budget:</span> £{lead.budget}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {lead.location}
                      </div>
                    </div>

                    {hasResponses && (
                      <div className="space-y-4 mt-6">
                        <h3 className="font-semibold">Proposals</h3>
                        {lead.responses.map((response) => {
                          const threadUnreadCount = getUnreadCount(
                            lead.messages?.filter(m => 
                              (m.sender_id === response.business_id && m.receiver_id === user.id) ||
                              (m.sender_id === user.id && m.receiver_id === response.business_id)
                            ) || [],
                            user.id
                          );

                          return (
                            <div
                              key={response.id}
                              className="border rounded-lg p-4"
                            >
                              <div className="flex justify-between items-center">
                                <p className="font-medium">
                                  {response.business?.profile?.name || "Business"}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      response.status === "accepted" ? "success" :
                                        response.status === "rejected" ? "destructive" :
                                          "secondary"
                                    }
                                  >
                                    {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                                  </Badge>
                                  {response.business_id && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="relative"
                                      onClick={() => handleOpenMessage(lead.id, response.business_id)}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Messages
                                      {threadUnreadCount > 0 && (
                                        <Badge
                                          variant="destructive"
                                          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full"
                                        >
                                          {threadUnreadCount}
                                        </Badge>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <p className="text-sm mt-2">{response.proposal}</p>

                              {response.status === "pending" && acceptProposalMutation && rejectProposalMutation && (
                                <div className="mt-4 flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => acceptProposalMutation.mutate({
                                      leadId: lead.id,
                                      responseId: response.id
                                    })}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => rejectProposalMutation.mutate({
                                      leadId: lead.id,
                                      responseId: response.id
                                    })}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground">
              No leads found. Create your first lead to get started!
            </div>
          )}
        </div>
      </div>

      {/* Multiple Message Dialogs */}
      {activeMessageThreads.map(thread => (
        <Dialog 
          key={`${thread.leadId}-${thread.businessId}`}
          open={true}
          onOpenChange={(open) => {
            if (!open) handleCloseMessage(thread.leadId, thread.businessId);
          }}
        >
          <MessageDialog
            leadId={thread.leadId}
            receiverId={thread.businessId}
            isOpen={true}
            onOpenChange={(open) => {
              if (!open) handleCloseMessage(thread.leadId, thread.businessId);
            }}
            onMessagesRead={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
            }}
          />
        </Dialog>
      ))}
    </>
  );
}
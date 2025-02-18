import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Send } from "lucide-react";
import { MessageDialog } from "@/components/MessageDialog";
import { useToast } from "@/hooks/use-toast";
import { SelectLead, SelectUser, getUnreadCount } from '@/pages/leads-page';
import { CreateLeadForm } from './CreateLeadForm';

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCreateSubmit = async (data: any) => {
    try {
      await createLeadMutation.mutateAsync({
        ...data,
        budget: parseInt(data.budget),
      });
      setCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Lead created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create lead",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Leads</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              Create New Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Fill out the form below to create a new business lead
              </DialogDescription>
            </DialogHeader>
            <CreateLeadForm
              onSubmit={handleCreateSubmit}
              isSubmitting={createLeadMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {leads.map((lead) => {
          const unreadCount = getUnreadCount(lead.messages, user.id);

          return (
            <Card key={lead.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{lead.title}</CardTitle>
                  {lead.user_id === user?.id && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingLead(lead)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteLeadMutation.mutate(lead.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
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

                {lead.responses && lead.responses.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <h3 className="font-semibold">Proposals</h3>
                    {lead.responses.map((response) => (
                      <div
                        key={response.id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-medium">
                            {response.business?.profile?.name || "Business"}
                          </p>
                          <Badge 
                            variant={
                              response.status === "accepted" ? "success" :
                              response.status === "rejected" ? "destructive" :
                              "secondary"
                            }
                          >
                            {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                          </Badge>
                        </div>

                        <p className="text-sm mt-2">{response.proposal}</p>

                        {response.status === "accepted" && (
                          <div className="mt-4 flex items-center gap2">
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
                                  receiverId={response.business_id}
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

                        {response.status === "pending" && (
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
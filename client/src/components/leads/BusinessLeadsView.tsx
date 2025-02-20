import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageDialog } from "@/components/MessageDialog";
import { Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { SelectLead, SelectUser } from '@/types/leads';

interface BusinessLeadsViewProps {
  leads: SelectLead[];
  user: SelectUser;
}

export function BusinessLeadsView({ leads, user }: BusinessLeadsViewProps) {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<SelectLead | null>(null);

  return (
    <div className="space-y-8">
      <div className="grid gap-4">
        {leads && leads.length > 0 ? (
          leads.map((lead) => (
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
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {lead.location}
                  </div>
                  <div>
                    <span className="font-medium">Posted:</span>{' '}
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="mt-4">
                  <Dialog>
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
                        isOpen={selectedLead?.id === lead.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setSelectedLead(null);
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
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center text-muted-foreground">
            No leads found matching your business profile.
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { SelectLead, BUSINESS_CATEGORIES } from "@/types/leads";
import { CreateLeadForm } from "@/components/leads/CreateLeadForm";

// Re-export BUSINESS_CATEGORIES for backward compatibility
export { BUSINESS_CATEGORIES } from '@/types/leads';

const LeadsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<SelectLead | null>(null);

  const { data: leads = [] } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/leads');
      return response.json();
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/leads', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Success",
        description: "Lead created successfully",
      });
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Fill out the form below to create a new business lead
              </DialogDescription>
            </DialogHeader>
            <CreateLeadForm
              onSubmit={(data) => createLeadMutation.mutate(data)}
              isSubmitting={createLeadMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {leads.map((lead: SelectLead) => (
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LeadsPage;
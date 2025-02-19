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
import { CreateLeadForm, LeadFormData } from "@/components/leads/CreateLeadForm";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
    mutationFn: async (formData: LeadFormData) => {
      // Log the incoming form data
      console.log('Creating lead with form data:', formData);

      // Prepare the data for submission
      const data = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subcategory: formData.subcategory,
        budget: parseInt(formData.budget, 10),
        location: formData.location.trim(),
        phoneNumber: formData.phoneNumber?.trim() || null
      };

      // Log the processed data
      console.log('Processed data for submission:', data);

      try {
        const response = await apiRequest('POST', '/api/leads', data);

        // Log the full response
        console.log('Server response:', {
          status: response.status,
          statusText: response.statusText,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          throw new Error(errorText || 'Failed to create lead');
        }

        const result = await response.json();
        console.log('Successfully created lead:', result);
        return result;
      } catch (error) {
        console.error('Lead creation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      setCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Lead created successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Lead creation mutation error:', error);
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
          <DialogContent className="max-w-2xl">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Fill out the form below to create a new business lead
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-4 overflow-y-auto">
              <ErrorBoundary>
                <CreateLeadForm
                  onSubmit={(data) => {
                    console.log('Form submitted with data:', data);
                    createLeadMutation.mutate(data);
                  }}
                  isSubmitting={createLeadMutation.isPending}
                />
              </ErrorBoundary>
            </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingLead(lead)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
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
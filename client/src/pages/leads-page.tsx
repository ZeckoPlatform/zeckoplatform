import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SelectLead } from "@/types/leads";
import { CreateLeadForm, LeadFormData } from "@/components/leads/CreateLeadForm";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FreeUserLeadsView } from "@/components/leads/FreeUserLeadsView";

const LeadsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<SelectLead | null>(null);

  const { data: leads = [], isLoading, error } = useQuery<SelectLead[]>({
    queryKey: ['/api/leads'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/leads');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid leads data format');
        }
        return data;
      } catch (err) {
        throw err;
      }
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: async (formData: LeadFormData) => {
      const data = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subcategory: formData.subcategory,
        budget: parseInt(formData.budget, 10),
        location: formData.location.trim(),
        phone_number: formData.phone_number?.trim() || null
      };

      const response = await apiRequest('POST', '/api/leads', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create lead');
      }

      return await response.json();
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
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    }
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: number) => {
      const response = await apiRequest('DELETE', `/api/leads/${leadId}`);
      if (!response.ok) {
        throw new Error('Failed to delete lead');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
    },
  });

  const acceptProposalMutation = useMutation({
    mutationFn: async ({ leadId, responseId }: { leadId: number; responseId: number }) => {
      const response = await apiRequest('POST', `/api/leads/${leadId}/responses/${responseId}/accept`);
      if (!response.ok) {
        throw new Error('Failed to accept proposal');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Success",
        description: "Proposal accepted successfully",
      });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: async ({ leadId, responseId }: { leadId: number; responseId: number }) => {
      const response = await apiRequest('POST', `/api/leads/${leadId}/responses/${responseId}/reject`);
      if (!response.ok) {
        throw new Error('Failed to reject proposal');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Success",
        description: "Proposal rejected successfully",
      });
    },
  });

  if (!user) {
    return <div>Please log in to view leads.</div>;
  }

  // Ensure countryCode is always a valid value for components
  const userWithValidCountry = {
    ...user,
    countryCode: user.countryCode || "GB" // Default to GB if countryCode is null
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Lead</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
            <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Fill out the form below to create a new business lead
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <ErrorBoundary>
                <CreateLeadForm
                  onSubmit={(data) => createLeadMutation.mutate(data)}
                  isSubmitting={createLeadMutation.isPending}
                />
              </ErrorBoundary>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ErrorBoundary>
        {isLoading ? (
          <div>Loading leads...</div>
        ) : error ? (
          <div className="text-red-500">Error loading leads. Please try again.</div>
        ) : (
          <FreeUserLeadsView
            leads={leads}
            createLeadMutation={createLeadMutation}
            updateLeadMutation={undefined}
            editingLead={editingLead}
            setEditingLead={setEditingLead}
            deleteLeadMutation={deleteLeadMutation}
            user={userWithValidCountry}
            acceptProposalMutation={acceptProposalMutation}
            rejectProposalMutation={rejectProposalMutation}
          />
        )}
      </ErrorBoundary>
    </div>
  );
};

export default LeadsPage;
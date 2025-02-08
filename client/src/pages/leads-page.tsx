import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings, Edit, Trash2, Send, AlertTriangle, Info } from "lucide-react";
import type { SelectLead, SelectUser, SelectMessage } from "@db/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useNotificationSound } from "@/lib/useNotificationSound";
import { MessageDialog } from "@/components/MessageDialog";


// Add necessary interfaces
interface LeadFormData {
  title: string;
  description: string;
  category: string;
  budget: string;
  location: string;
}

interface ProfileFormData {
  name?: string;
  description?: string;
  categories?: string;
  location?: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UsernameFormData {
  username: string;
}

interface ProposalFormData {
  proposal: string;
}

interface MessageFormData {
  content: string;
}

// Add calculateMatchScore function
const calculateMatchScore = (lead: SelectLead, user: SelectUser | null): {
  totalScore: number;
  categoryScore: number;
  locationScore: number;
  budgetScore: number;
  industryScore: number;
} => {
  let totalScore = 0;
  let categoryScore = 0;
  let locationScore = 0;
  let budgetScore = 0;
  let industryScore = 0;

  if (user?.profile?.categories?.includes(lead.category)) {
    categoryScore = 25;
  }
  if (user?.profile?.location === lead.location) {
    locationScore = 25;
  }
  if (user?.profile?.budget && lead.budget &&
    Math.abs(lead.budget - user.profile.budget) < 1000) {
    budgetScore = 25;
  }
  if (user?.profile?.industries?.includes(lead.industry)) {
    industryScore = 25;
  }

  totalScore = categoryScore + locationScore + budgetScore + industryScore;
  return { totalScore, categoryScore, locationScore, budgetScore, industryScore };
};

// Update MessageDialogContent
function MessageDialogContent({
  leadId,
  receiverId,
  onClose,
}: {
  leadId: number;
  receiverId: number;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(true); // Start with dialog open

  // Handle dialog state changes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  return (
    <MessageDialog
      leadId={leadId}
      receiverId={receiverId}
      isOpen={open}
      onOpenChange={handleOpenChange}
      onMessagesRead={onClose}
    />
  );
}


interface AcceptProposalData {
  contactDetails: string;
}

interface LeadWithUnreadCount extends SelectLead {
  unreadMessages: number;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingLead, setEditingLead] = useState<LeadWithUnreadCount | null>(null);
  const playNotification = useNotificationSound();
  const initialLoadRef = useRef(true);


  const form = useForm<LeadFormData>({
    defaultValues: {
      title: "",
      description: "",
      category: "",
      budget: "",
      location: "",
    },
  });

  const editForm = useForm<LeadFormData>({
    defaultValues: {
      title: editingLead?.title || "",
      description: editingLead?.description || "",
      category: editingLead?.category || "",
      budget: editingLead?.budget?.toString() || "",
      location: editingLead?.location || "",
    },
  });

  useEffect(() => {
    if (editingLead) {
      editForm.reset({
        title: editingLead.title,
        description: editingLead.description,
        category: editingLead.category,
        budget: editingLead.budget?.toString(),
        location: editingLead.location || "",
      });
    }
  }, [editingLead, editForm]);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.profile?.name || "",
      description: user?.profile?.description || "",
      categories: user?.profile?.categories?.join(", ") || "",
      location: user?.profile?.location || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PATCH", "/api/user/profile", {
        profile: {
          ...user?.profile,
          name: data.name?.trim(),
          description: data.description?.trim(),
          categories: data.categories?.split(",").map(c => c.trim()).filter(Boolean),
          location: data.location?.trim(),
        },
      });
      const updatedUser = await res.json();
      return updatedUser;
    },
    onSuccess: (updatedUser: SelectUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      profileForm.reset({
        name: updatedUser.profile?.name || "",
        description: updatedUser.profile?.description || "",
        categories: updatedUser.profile?.categories?.join(", ") || "",
        location: updatedUser.profile?.location || "",
      });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("New passwords do not match");
      }
      const res = await apiRequest("PATCH", "/api/user/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  const updateUsernameMutation = useMutation({
    mutationFn: async (data: UsernameFormData) => {
      const res = await apiRequest("PATCH", "/api/user/username", {
        username: data.username,
      });
      return res.json();
    },
    onSuccess: (updatedUser: SelectUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Success",
        description: "Your username has been updated successfully.",
      });
      usernameForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update username",
        variant: "destructive",
      });
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const usernameForm = useForm<UsernameFormData>({
    defaultValues: {
      username: user?.username || "",
    },
  });

  // Update the leads query to handle notifications properly
  const {
    data: leads = [],
    isLoading: isLoadingLeads,
  } = useQuery<LeadWithUnreadCount[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/leads");
      if (!response.ok) {
        throw new Error("Failed to fetch leads");
      }
      const data = await response.json();
      return data as LeadWithUnreadCount[];
    },
    enabled: !!user,
    onSuccess: (data) => {
      const totalUnreadCount = data.reduce((sum, lead) => sum + (lead.unreadMessages || 0), 0);

      // Only show notification and play sound if there are unread messages and it's not the initial load
      if (totalUnreadCount > 0 && !initialLoadRef.current) {
        toast({
          title: "New Message",
          description: `You have ${totalUnreadCount} new message${totalUnreadCount === 1 ? '' : 's'}`,
          duration: 5000,
        });
        playNotification('receive');
      } else if (totalUnreadCount > 0 && initialLoadRef.current) {
        // Show welcome back message with unread count only on initial load
        toast({
          title: "Welcome back!",
          description: `You have ${totalUnreadCount} unread message${totalUnreadCount === 1 ? '' : 's'}`,
          duration: 5000,
        });
      }

      initialLoadRef.current = false;
    },
    refetchInterval: 5000, // Poll every 5 seconds for new messages
    staleTime: 0,
    gcTime: Infinity, // Keep messages in cache indefinitely
  });


  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      if (!user) {
        throw new Error("You must be logged in to create a lead");
      }

      if (user.userType !== "free") {
        throw new Error("Only free users can create leads");
      }

      const res = await apiRequest("POST", "/api/leads", {
        ...data,
        budget: parseInt(data.budget),
      });

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Your lead has been posted successfully.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LeadFormData }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, {
        ...data,
        budget: parseInt(data.budget),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead updated successfully.",
      });
      setEditingLead(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead",
        variant: "destructive",
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lead",
        variant: "destructive",
      });
    },
  });

  const sendProposalMutation = useMutation({
    mutationFn: async ({ leadId, proposal }: { leadId: number; proposal: string }) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/responses`, {
        proposal,
        price: null,
        status: "pending"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Your proposal has been sent successfully.",
      });
      proposalForm.reset();
      setSelectedLead(null);
      setProposalDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send proposal",
        variant: "destructive",
      });
    },
  });

  const [selectedLead, setSelectedLead] = useState<SelectLead | null>(null);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const proposalForm = useForm<ProposalFormData>({
    defaultValues: {
      proposal: "",
    },
  });

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  const acceptProposalForm = useForm<AcceptProposalData>({
    defaultValues: {
      contactDetails: "",
    },
  });

  const acceptProposalMutation = useMutation({
    mutationFn: async ({ responseId, contactDetails }: { responseId: number; contactDetails: string }) => {
      const res = await apiRequest("PATCH", `/api/leads/${selectedLead?.id}/responses/${responseId}`, {
        status: "accepted",
        contactDetails
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Proposal accepted successfully.",
      });
      setAcceptDialogOpen(false);
      acceptProposalForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept proposal",
        variant: "destructive",
      });
    },
  });


  if (isLoadingLeads) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userLeadsFiltered = user?.userType === "business"
    ? leads
    : leads.filter(lead => lead.user_id === user?.id);

  const BusinessLeadsView = () => {
    const isFirstLoadRef = useRef(true);
    const previousMessagesLengthRef = useRef(0);

    const scrollToBottom = () => {
      const messageContainer = document.getElementById('message-container');
      if (messageContainer) {
        messageContainer.scrollTop = messageContainer.scrollHeight;
      }
    };

    const { data: messages = [] } = useQuery({
      queryKey: ['/api/messages', selectedLead?.id],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/leads/${selectedLead?.id}/messages`);
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        return response.json();
      },
      enabled: !!selectedLead
    });

    useEffect(() => {
      if (messages.length > previousMessagesLengthRef.current && !isFirstLoadRef.current) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.sender?.id !== user?.id) {
          playNotification('receive');
        }
        scrollToBottom();
      }
      previousMessagesLengthRef.current = messages.length;
      isFirstLoadRef.current = false;
    }, [messages, user?.id, playNotification]);


    if (isLoadingLeads) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!user?.subscriptionActive) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <AlertTriangle className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">No Active Subscription</p>
                <p className="text-sm text-muted-foreground">
                  An active business subscription is required to:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside mt-2">
                  <li>View and access leads</li>
                  <li>Get matched with relevant opportunities</li>
                  <li>Send proposals to potential clients</li>
                </ul>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="/subscription">Subscribe Now</a>
            </Button>
          </CardContent>
        </Card>
      );
    }

    const myResponses = leads.reduce((acc, lead) => {
      const response = lead.responses?.find(r => r.business?.id === user.id);
      if (response) {
        acc[lead.id] = response;
      }
      return acc;
    }, {} as Record<number, any>);

    const hasUnreadMessages = leads.some(lead =>
      lead.messages?.some(m =>
        m.sender_id !== user?.id &&
        !m.read
      )
    );

    return (
      <div className="space-y-8">
        {hasUnreadMessages && (
          <div className="bg-muted/50 p-4 rounded-lg flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-primary" />
            <p className="text-sm">You have unread messages in your leads</p>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Your Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(myResponses).map(([leadId, response]) => {
                const lead = leads.find(l => l.id === parseInt(leadId));
                return (
                  <div key={leadId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{lead?.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Sent: {response.created_at ? format(new Date(response.created_at), 'PPp') : 'Recently'}
                        </p>
                      </div>
                      <Badge variant={
                        response.status === "accepted" ? "success" :
                          response.status === "rejected" ? "destructive" :
                            "secondary"
                      }>
                        {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm mt-2">{response.proposal}</p>
                    {response.status === "accepted" && (
                      <div className="mt-4 space-y-4">
                        <div className="p-4 bg-background rounded-lg border">
                          <h4 className="font-medium mb-2">Contact Information</h4>
                          <p className="text-sm whitespace-pre-wrap">
                            {response.contactDetails || "No contact details provided yet."}
                          </p>
                        </div>

                        <div className="p-4 bg-background rounded-lg border">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-medium">Messages</h4>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="relative">
                                  <Send className="h-4 w-4 mr-2" />
                                  Open Messages
                                  {lead.unreadMessages > 0 && (
                                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" />
                                  )}
                                </Button>
                              </DialogTrigger>
                              <MessageDialogContent
                                leadId={lead.id}
                                receiverId={user?.id === lead.user_id ? response.business_id : lead.user_id}
                                onClose={() => queryClient.invalidateQueries({ queryKey: ["/api/leads"] })}
                              />
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <h2 className="text-2xl font-bold">Available Leads</h2>
          {leads.map((lead) => {
            const matchScore = calculateMatchScore(lead, user);
            const existingResponse = myResponses[lead.id];

            return (
              <Card key={lead.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{lead.title}</CardTitle>
                    {!existingResponse && (
                      <Dialog
                        open={proposalDialogOpen}
                        onOpenChange={(open) => {
                          setProposalDialogOpen(open);
                          if (!open) {
                            proposalForm.reset();
                            setSelectedLead(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedLead(lead);
                              proposalForm.reset();
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Proposal
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Send Proposal for "{selectedLead?.title}"</DialogTitle>
                            <DialogDescription>
                              Write your proposal message to the lead owner. Be specific about how you can help.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={proposalForm.handleSubmit((data) => {
                            if (selectedLead) {
                              sendProposalMutation.mutate({
                                leadId: selectedLead.id,
                                proposal: data.proposal
                              });
                            }
                          })}>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="proposal">Your Proposal</Label>
                                <Textarea
                                  id="proposal"
                                  placeholder="Describe how you can help with this project..."
                                  {...proposalForm.register("proposal")}
                                  className="min-h-[150px]"
                                  required
                                />
                              </div>
                              <Button
                                type="submit"
                                className="w-full"
                                disabled={sendProposalMutation.isPending}
                              >
                                {sendProposalMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  'Send Proposal'
                                )}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                    {existingResponse && (
                      <Badge variant={
                        existingResponse.status === "accepted" ? "success" :
                          existingResponse.status === "rejected" ? "destructive" :
                            "secondary"
                      }>
                        Proposal {existingResponse.status.charAt(0).toUpperCase() + existingResponse.status.slice(1)}
                      </Badge>
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
                <CardFooter className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Posted {lead.created_at ? format(new Date(lead.created_at), 'PPp') : 'Recently'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={matchScore.totalScore}
                      className="w-[100px]"
                    />
                    <span className="text-sm text-muted-foreground">
                      {Math.round(matchScore.totalScore)}% Match
                    </span>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
          {(!leads || leads.length === 0) && (
            <p className="text-muted-foreground text-center py-8">
              No matching leads found. Update your business profile to see more relevant leads.
            </p>
          )}
        </div>
      </div>
    );
  };

  const FreeUserLeadsView = () => (
    <Tabs defaultValue="my-leads">
      <TabsList>
        <TabsTrigger value="my-leads">My Posted Leads</TabsTrigger>
        <TabsTrigger value="post">Post New Lead</TabsTrigger>
      </TabsList>
      <TabsContent value="my-leads" className="mt-4">
        <div className="grid gap-6">
          {userLeadsFiltered?.map((lead) => (
            <Card key={lead.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{lead.title}</CardTitle>
                  {lead.user_id === user?.id && (
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingLead(lead)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Lead</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={editForm.handleSubmit((data) =>
                              updateLeadMutation.mutate({ id: lead.id, data })
                            )}
                            className="space-y-4"
                          >
                            <div>
                              <Label htmlFor="edit-title">Title</Label>
                              <Input
                                id="edit-title"
                                {...editForm.register("title")}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-description">Description</Label>
                              <Textarea
                                id="edit-description"
                                {...editForm.register("description")}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-category">Category</Label>
                              <Input
                                id="edit-category"
                                {...editForm.register("category")}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-budget">Budget (£)</Label>
                              <Input
                                id="edit-budget"
                                type="number"
                                {...editForm.register("budget")}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-location">Location</Label>
                              <Input
                                id="edit-location"
                                {...editForm.register("location")}
                                required
                              />
                            </div>
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={updateLeadMutation.isPending}
                            >
                              {updateLeadMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save Changes'
                              )}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this lead?')) {
                            deleteLeadMutation.mutate(lead.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{lead.description}</p>
                <div className="grid grid-cols-3 gap-4 text-sm mb-6">
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

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Received Proposals</h3>
                  {lead.responses && lead.responses.length > 0 ? (
                    <div className="space-y-4">
                      {lead.responses.map((response) => (
                        <div key={response.id} className="bg-muted p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">
                                From: {response.business?.profile?.name || response.business?.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Sent: {response.created_at ? format(new Date(response.created_at), 'PPp') : 'Recently'}
                              </p>
                            </div>
                            <Badge variant={
                              response.status === "accepted" ? "success" :
                                response.status === "rejected" ? "destructive" :
                                  "secondary"
                            }>
                              {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm mt-2">{response.proposal}</p>

                          {response.status === "accepted" && (
                            <div className="mt-4">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="relative">
                                    <Send className="h-4 w-4 mr-2" />
                                    Open Messages
                                    {lead.unreadMessages > 0 && (
                                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" />
                                    )}
                                  </Button>
                                </DialogTrigger>
                                <MessageDialogContent
                                  leadId={lead.id}
                                  receiverId={response.business_id}
                                  onClose={() => queryClient.invalidateQueries({ queryKey: ["/api/leads"] })}
                                />
                              </Dialog>
                            </div>
                          )}

                          {response.status === "pending" && (
                            <div className="flex gap-2 mt-4">
                              <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedResponse(response);
                                      setSelectedLead(lead);
                                    }}
                                  >
                                    Accept
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Accept Proposal</DialogTitle>
                                    <DialogDescription>
                                      Please provide your contact details. This will be shared with the business when you accept their proposal.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <form onSubmit={acceptProposalForm.handleSubmit((data) => {
                                    if (selectedResponse && selectedLead) {
                                      acceptProposalMutation.mutate({
                                        responseId: selectedResponse.id,
                                        contactDetails: data.contactDetails
                                      });
                                    } else {
                                      toast({
                                        title: "Error",
                                        description: "Missing lead or response information",
                                        variant: "destructive",
                                      });                                    }
                                  })}>
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="contactDetails">Contact Details</Label>
                                        <Textarea
                                          id="contactDetails"
                                          placeholder="Please provide your preferred contact method (email, phone) and any additional information for the business to reach you."
                                          {...acceptProposalForm.register("contactDetails")}
                                          className="min-h-[100px]"
                                          required
                                        />
                                      </div>
                                      <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={acceptProposalMutation.isPending}
                                      >
                                        {acceptProposalMutation.isPending ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Accepting...
                                          </>
                                        ) : (
                                          'Accept Proposal'
                                        )}
                                      </Button>
                                    </div>
                                  </form>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  console.log('Reject proposal:', response.id);
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No proposals received yet.</p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Posted {lead.created_at ? format(new Date(lead.created_at), 'PPp') : 'Recently'}
                </p>
              </CardFooter>
            </Card>
          ))}
          {(!userLeadsFiltered || userLeadsFiltered.length === 0) && (
            <p className="text-muted-foreground text-center py-8">
              You haven't postedany leads yet. Create your first lead to get started!
            </p>
          )}
        </div>
      </TabsContent>
      <TabsContent value="post" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Post a New Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateLeadForm />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  const CreateLeadForm = () => (
    <form
      onSubmit={form.handleSubmit((data) => createLeadMutation.mutate(data))}
      className="space-y-4 max-w-md mx-auto"
    >
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...form.register("title")} required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          required
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Input id="category" {...form.register("category")} required />
      </div>
      <div>
        <Label htmlFor="budget">Budget (£)</Label>
        <Input
          id="budget"
          type="number"
          {...form.register("budget")}
          required
        />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" {...form.register("location")} required />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={createLeadMutation.isPending}
      >
        {createLeadMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Posting...
          </>
        ) : (
          'Post Lead'
        )}
      </Button>
    </form>);

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            {user?.profile?.name && (
              <p className="text-muted-foreground">
                Welcome back, {user.profile.name}
              </p>
            )}
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Account Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Account Settings</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="profile">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="username">Username</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Display Name</Label>
                      <Input id="name" {...profileForm.register("name")} />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" {...profileForm.register("description")} />
                    </div>
                    <div>
                      <Label htmlFor="categories">Categories (comma-separated)</Label>
                      <Input id="categories" {...profileForm.register("categories")} />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" {...profileForm.register("location")} />
                    </div>
                    <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Profile'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="username">
                  <form onSubmit={usernameForm.handleSubmit((data) => updateUsernameMutation.mutate(data))} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" {...usernameForm.register("username")} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={updateUsernameMutation.isPending}>
                      {updateUsernameMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Username'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="password">
                  <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        {...passwordForm.register("currentPassword")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        {...passwordForm.register("newPassword")}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...passwordForm.register("confirmPassword")}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={updatePasswordMutation.isPending}>
                      {updatePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader><CardTitle className="text-lg">
                {user?.userType === "business" ? "Available Leads" : "Total Leads"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{userLeadsFiltered?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {user?.userType === "business" ? "Matching Leads" : "Active Leads"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {userLeadsFiltered?.filter(lead => lead.status === "open")?.length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {user?.userType === "business" ? "Proposals Sent" : "Total Responses"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
            </CardContent>
          </Card>
        </div>

        {user?.userType === "business" ? <BusinessLeadsView /> : <FreeUserLeadsView />}
      </div>
    </div>
  );
}
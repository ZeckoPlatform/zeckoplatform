import { useState, useEffect } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings, Edit, Trash2, Send, AlertTriangle } from "lucide-react";
import type { SelectLead, SelectUser } from "@db/schema";
import { format } from "date-fns";

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

export default function LeadsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingLead, setEditingLead] = useState<SelectLead | null>(null);

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

  const { data: leads = [], isLoading: isLoadingLeads } = useQuery<SelectLead[]>({
    queryKey: ["/api/leads"],
    enabled: !!user,
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

  if (isLoadingLeads) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userLeads = user?.userType === "business"
    ? leads 
    : leads.filter(lead => lead.user_id === user?.id); 

  const BusinessLeadsView = () => {
    // Check for subscription requirement error in the leads query
    if (isLoadingLeads) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    // If no subscription, show subscription requirement message
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

    // Show leads for subscribed users
    return (
      <div className="grid gap-6">
        {leads.map((lead) => (
          <Card key={lead.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{lead.title}</CardTitle>
                <Button variant="outline" size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Send Proposal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{lead.description}</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Category:</span> {lead.category}
                </div>
                <div>
                  <span className="font-medium">Budget:</span> ${lead.budget}
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
                <Progress value={75} className="w-[100px]" />
                <span className="text-sm text-muted-foreground">75% Match</span>
              </div>
            </CardFooter>
          </Card>
        ))}
        {(!leads || leads.length === 0) && (
          <p className="text-muted-foreground text-center py-8">
            No matching leads found. Update your business profile to see more relevant leads.
          </p>
        )}
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
          {userLeads?.map((lead) => (
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
                              <Label htmlFor="edit-budget">Budget ($)</Label>
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
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Category:</span> {lead.category}
                  </div>
                  <div>
                    <span className="font-medium">Budget:</span> ${lead.budget}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {lead.location}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Posted {lead.created_at ? format(new Date(lead.created_at), 'PPp') : 'Recently'}
                </p>
              </CardFooter>
            </Card>
          ))}
          {(!userLeads || userLeads.length === 0) && (
            <p className="text-muted-foreground text-center py-8">
              You haven't posted any leads yet. Create your first lead to get started!
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
        <Label htmlFor="budget">Budget ($)</Label>
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
    </form>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            {user?.profile?.name && (
              <p className="text-muted-foreground">Welcome, {user.profile.name}</p>
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
            <CardHeader>
              <CardTitle className="text-lg">
                {user?.userType === "business" ? "Available Leads" : "Total Leads"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{userLeads?.length || 0}</p>
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
                {userLeads?.filter(lead => lead.status === "open")?.length || 0}
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
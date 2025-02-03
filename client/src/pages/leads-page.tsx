import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function LeadsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      category: "",
      budget: "",
      location: "",
    },
  });

  const { data: leads, isLoading: isLoadingLeads } = useQuery<any[]>({
    queryKey: ["/api/leads"],
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user) {
        throw new Error("You must be logged in to create a lead");
      }

      if (user.userType !== "free") {
        throw new Error("Only free users can create leads");
      }

      console.log("Creating lead with user:", user.id);

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        credentials: "include",
        mode: "cors",
        cache: "no-cache",
        body: JSON.stringify({
          ...data,
          budget: parseInt(data.budget),
        }),
      });

      console.log("Lead creation response status:", res.status);

      if (!res.ok) {
        const error = await res.text();
        console.error("Lead creation error response:", error);
        throw new Error(error);
      }

      const result = await res.json();
      console.log("Lead creation successful:", result);
      return result;
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
      console.error("Lead mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const respondToLeadMutation = useMutation({
    mutationFn: async ({ leadId, data }: { leadId: number; data: any }) => {
      const res = await fetch(`/api/leads/${leadId}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
        mode: "cors",
        cache: "no-cache",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Response Submitted",
        description: "Your response has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit response. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter leads based on user type
  const userLeads = leads?.filter(lead => 
    user?.userType === "free" 
      ? lead.userId === user.id 
      : true
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

  if (isLoadingLeads) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.userType === "free") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">My Leads Dashboard</h1>
          <Tabs defaultValue="post">
            <TabsList>
              <TabsTrigger value="post">Post New Lead</TabsTrigger>
              <TabsTrigger value="my-leads">My Posted Leads</TabsTrigger>
            </TabsList>
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
            <TabsContent value="my-leads" className="mt-4">
              <div className="grid gap-6">
                {userLeads?.map((lead) => (
                  <Card key={lead.id}>
                    <CardHeader>
                      <CardTitle>{lead.title}</CardTitle>
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
                      {lead.responses?.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Responses ({lead.responses.length})</h4>
                          {lead.responses.map((response: any) => (
                            <Card key={response.id} className="mb-2">
                              <CardContent className="py-4">
                                <p className="font-medium">From: {response.business.username}</p>
                                <p className="text-muted-foreground">{response.proposal}</p>
                                <p className="font-medium mt-2">Offered Price: ${response.price}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(!userLeads || userLeads.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">
                    You haven't posted any leads yet. Create your first lead to get started!
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Business user view
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Available Leads</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Match Preferences</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Matching Preferences</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const preferences = {
                  preferredCategories: formData.get("categories")?.toString().split(",").map(c => c.trim()),
                  locationPreference: formData.get("locations")?.toString().split(",").map(l => l.trim()),
                  budgetRange: {
                    min: parseInt(formData.get("minBudget") as string),
                    max: parseInt(formData.get("maxBudget") as string),
                  },
                };
                fetch("/api/users/matching-preferences", {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      "Accept": "application/json",
                    },
                    body: JSON.stringify(preferences),
                    credentials: "include",
                    mode: "cors",
                    cache: "no-cache",
                  });
              }}
              className="space-y-4"
            >
              <div>
                <Label>Preferred Categories (comma-separated)</Label>
                <Input name="categories" placeholder="IT, Marketing, Design" />
              </div>
              <div>
                <Label>Preferred Locations (comma-separated)</Label>
                <Input name="locations" placeholder="New York, Remote, London" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Budget ($)</Label>
                  <Input type="number" name="minBudget" />
                </div>
                <div>
                  <Label>Max Budget ($)</Label>
                  <Input type="number" name="maxBudget" />
                </div>
              </div>
              <Button type="submit" className="w-full">Save Preferences</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {userLeads?.map((lead) => (
          <Card key={lead.id} className={lead.matchScore?.totalScore > 0.7 ? "border-primary" : undefined}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{lead.title}</CardTitle>
                {lead.matchScore && (
                  <div className="text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-muted-foreground">Match Score:</span>
                      <Progress value={lead.matchScore.totalScore * 100} className="w-24" />
                      <span className="font-medium">{Math.round(lead.matchScore.totalScore * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{lead.description}</p>
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
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
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Respond to Lead</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit Proposal</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      respondToLeadMutation.mutate({
                        leadId: lead.id,
                        data: {
                          proposal: formData.get("proposal"),
                          price: parseInt(formData.get("price") as string),
                        },
                      });
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="proposal">Proposal</Label>
                      <Textarea
                        id="proposal"
                        name="proposal"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Submit Proposal
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
        {(!userLeads || userLeads.length === 0) && (
          <p className="text-muted-foreground text-center py-8">
            No leads available at the moment. Check back later or update your matching preferences.
          </p>
        )}
      </div>
    </div>
  );
}
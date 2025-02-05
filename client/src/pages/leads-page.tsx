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
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";  
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings } from "lucide-react";
import type { SelectLead } from "@db/schema";

interface LeadFormData {
  title: string;
  description: string;
  category: string;
  budget: string;
  location: string;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const form = useForm<LeadFormData>({
    defaultValues: {
      title: "",
      description: "",
      category: "",
      budget: "",
      location: "",
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

  if (isLoadingLeads) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userLeads = user?.userType === "free"
    ? leads.filter(lead => lead.user_id === user.id)
    : leads;

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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Account Settings
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{userLeads?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {userLeads?.filter(lead => lead.status === "open")?.length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
            </CardContent>
          </Card>
        </div>

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
      </div>
    </div>
  );
}
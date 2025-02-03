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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";

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

  const { data: leads } = useQuery<any[]>({
    queryKey: ["/api/leads"],
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead Created",
        description: "Your lead has been posted successfully.",
      });
    },
  });

  const respondToLeadMutation = useMutation({
    mutationFn: async ({ leadId, data }: { leadId: number; data: any }) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/responses`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Response Submitted",
        description: "Your response has been submitted successfully.",
      });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Leads</h1>
        {user?.userType === "business" && (
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
                    preferredCategories: formData.getAll("categories"),
                    locationPreference: formData.getAll("locations"),
                    budgetRange: {
                      min: parseInt(formData.get("minBudget") as string),
                      max: parseInt(formData.get("maxBudget") as string),
                    },
                  };
                  fetch("/api/users/matching-preferences", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(preferences),
                    credentials: "include",
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Preferred Categories</Label>
                  <Input name="categories" placeholder="Enter categories" />
                </div>
                <div>
                  <Label>Preferred Locations</Label>
                  <Input name="locations" placeholder="Enter locations" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min Budget</Label>
                    <Input type="number" name="minBudget" />
                  </div>
                  <div>
                    <Label>Max Budget</Label>
                    <Input type="number" name="maxBudget" />
                  </div>
                </div>
                <Button type="submit" className="w-full">Save Preferences</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
        {user?.userType === "free" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>Post Lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post a New Lead</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit((data) =>
                  createLeadMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" {...form.register("title")} />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" {...form.register("category")} />
                </div>
                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    {...form.register("budget")}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" {...form.register("location")} />
                </div>
                <Button type="submit" className="w-full">
                  Post Lead
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6">
        {leads?.map((lead) => (
          <Card key={lead.id} className={lead.matchScore?.totalScore > 0.7 ? "border-primary" : undefined}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{lead.title}</CardTitle>
                 {user?.userType === "business" && lead.matchScore && (
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
              {user?.userType === "business" && (
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
                        <Label htmlFor="price">Price</Label>
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
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
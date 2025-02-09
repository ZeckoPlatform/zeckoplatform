import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

export default function NewsletterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();

  // Templates
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/email-templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/email-templates");
      if (!response.ok) throw new Error("Failed to fetch email templates");
      return response.json();
    },
  });

  // Newsletters
  const { data: newsletters = [] } = useQuery({
    queryKey: ["/api/newsletters"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/newsletters");
      if (!response.ok) throw new Error("Failed to fetch newsletters");
      return response.json();
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/email-templates", data);
      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Success",
        description: "Email template created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createNewsletterMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/newsletters", data);
      if (!response.ok) throw new Error("Failed to create/send newsletter");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/newsletters"] });
      toast({
        title: "Success",
        description: "Newsletter created/sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTemplateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTemplateMutation.mutate({
      name: formData.get("name"),
      subject: formData.get("subject"),
      htmlContent: formData.get("htmlContent"),
      textContent: formData.get("textContent"),
    });
    e.currentTarget.reset();
  };

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const templateId = formData.get("templateId");
    const data: any = {
      subject: formData.get("subject"),
      htmlContent: formData.get("htmlContent"),
      textContent: formData.get("textContent"),
      sendNow: formData.get("sendNow") === "true",
    };

    if (templateId) {
      data.templateId = parseInt(templateId as string);
    }

    if (selectedDate) {
      data.scheduledFor = selectedDate;
    }

    createNewsletterMutation.mutate(data);
    e.currentTarget.reset();
    setSelectedDate(undefined);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Newsletter Management</h1>
      </div>

      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create">Create Newsletter</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="history">Newsletter History</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Newsletter</CardTitle>
              <CardDescription>
                Create and send a newsletter to all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNewsletterSubmit} className="space-y-4">
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="templateId">Use Template (Optional)</Label>
                    <select
                      id="templateId"
                      name="templateId"
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Select a template</option>
                      {templates.map((template: any) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Newsletter subject"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="htmlContent">HTML Content</Label>
                  <Textarea
                    id="htmlContent"
                    name="htmlContent"
                    placeholder="HTML content of the newsletter"
                    required
                    className="min-h-[200px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textContent">Text Content</Label>
                  <Textarea
                    id="textContent"
                    name="textContent"
                    placeholder="Plain text version of the newsletter"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Schedule (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="submit"
                    name="sendNow"
                    value="false"
                    disabled={createNewsletterMutation.isPending}
                  >
                    {createNewsletterMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save as Draft
                  </Button>
                  <Button
                    type="submit"
                    name="sendNow"
                    value="true"
                    disabled={createNewsletterMutation.isPending}
                  >
                    {createNewsletterMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Send className="mr-2 h-4 w-4" />
                    Send Now
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Email Template</CardTitle>
              <CardDescription>
                Create reusable email templates for newsletters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTemplateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Template name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Email subject"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="htmlContent">HTML Content</Label>
                  <Textarea
                    id="htmlContent"
                    name="htmlContent"
                    placeholder="HTML content of the email"
                    required
                    className="min-h-[200px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textContent">Text Content</Label>
                  <Textarea
                    id="textContent"
                    name="textContent"
                    placeholder="Plain text version of the email"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTemplateMutation.isPending}
                >
                  {createTemplateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Template
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template: any) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <Label>HTML Content</Label>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {template.htmlContent.substring(0, 100)}...
                      </div>
                    </div>
                    <div>
                      <Label>Text Content</Label>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {template.textContent.substring(0, 100)}...
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-4">
            {newsletters.map((newsletter: any) => (
              <Card key={newsletter.id}>
                <CardHeader>
                  <CardTitle>{newsletter.subject}</CardTitle>
                  <CardDescription>
                    Status: {newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {newsletter.scheduledFor && (
                      <div>
                        <Label>Scheduled For</Label>
                        <div className="mt-1 text-sm">
                          {format(new Date(newsletter.scheduledFor), "PPP")}
                        </div>
                      </div>
                    )}
                    {newsletter.sentAt && (
                      <div>
                        <Label>Sent At</Label>
                        <div className="mt-1 text-sm">
                          {format(new Date(newsletter.sentAt), "PPP")}
                        </div>
                      </div>
                    )}
                    {newsletter.metadata && (
                      <div className="space-y-1">
                        <div className="text-sm">
                          Recipients: {newsletter.metadata.recipientCount || 0}
                        </div>
                        {newsletter.metadata.openRate && (
                          <div className="text-sm">
                            Open Rate: {(newsletter.metadata.openRate * 100).toFixed(1)}%
                          </div>
                        )}
                        {newsletter.metadata.clickRate && (
                          <div className="text-sm">
                            Click Rate: {(newsletter.metadata.clickRate * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

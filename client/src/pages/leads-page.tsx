import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2, Send, Edit, Trash2, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { useNotificationSound } from "@/lib/useNotificationSound";
import { MessageDialog } from "@/components/MessageDialog";
import { SubscriptionRequiredModal } from "@/components/subscription-required-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

// Type definitions for database entities
interface SelectLead {
  id: number;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  budget: number;
  location: string;
  user_id: number;
  created_at: string;
  phoneNumber?: string;
  responses?: Array<{
    id: number;
    proposal: string;
    status: "pending" | "accepted" | "rejected";
    business_id: number;
    created_at: string;
    contactDetails?: string;
  }>;
  messages?: Array<{
    id: number;
    content: string;
    sender_id: number;
    read: boolean;
    created_at: string;
  }>;
}

interface SelectUser {
  id: number;
  email: string;
  userType: "free" | "business" | "vendor";
  countryCode: "GB" | "US";
  subscriptionActive: boolean;
  profile?: {
    name?: string;
    description?: string;
    categories?: string[];
    location?: string;
    industries?: string[];
    matchPreferences?: {
      budgetRange?: {
        min: number;
        max: number;
      };
      industries?: string[];
    };
  };
}

interface SelectMessage {
  id: number;
  content: string;
  sender_id: number;
  receiver_id: number;
  lead_id: number;
  read: boolean;
  created_at: string;
  sender?: {
    id: number;
    profile?: {
      name: string;
    };
  };
}

const PHONE_COUNTRY_CODES = {
  GB: {
    code: "44",
    format: "+44 XXXX XXXXXX",
    pattern: /^\+44\s\d{4}\s\d{6}$/
  },
  US: {
    code: "1",
    format: "+1 (XXX) XXX-XXXX",
    pattern: /^\+1\s\(\d{3}\)\s\d{3}-\d{4}$/
  }
};

const COUNTRIES = {
  "GB": "United Kingdom",
  "US": "United States"
};

export const BUSINESS_CATEGORIES = {
  "IT & Software Development": [
    "Web Development",
    "Mobile App Development",
    "Cloud Services",
    "DevOps & Infrastructure",
    "Software Architecture",
    "Database Development",
    "Cybersecurity",
    "AI & Machine Learning",
    "Blockchain Development",
    "Quality Assurance",
    "ERP Implementation",
    "IT Support & Maintenance",
    "Network Solutions",
    "Custom Software Development",
    "System Integration"
  ],
  "Marketing & Advertising": [
    "Digital Marketing",
    "Content Marketing",
    "Social Media Marketing",
    "SEO & SEM",
    "Email Marketing",
    "Brand Strategy",
    "Market Research",
    "Public Relations",
    "Video Marketing",
    "Influencer Marketing",
    "PPC Advertising",
    "Marketing Analytics",
    "Affiliate Marketing",
    "Local Marketing",
    "Marketing Automation"
  ],
  "Business Services": [
    "Business Consulting",
    "Financial Services",
    "Legal Services",
    "HR & Recruitment",
    "Administrative Support",
    "Project Management",
    "Business Analysis",
    "Strategic Planning",
    "Risk Management",
    "Operations Management",
    "Data Analysis",
    "Virtual Assistant Services",
    "Business Process Outsourcing",
    "Supply Chain Management",
    "Quality Management"
  ],
  "Creative & Design": [
    "Graphic Design",
    "UI/UX Design",
    "Brand Design",
    "Motion Graphics",
    "Video Production",
    "Photography",
    "Animation",
    "Illustration",
    "3D Modeling",
    "Print Design",
    "Package Design",
    "Web Design",
    "Art Direction",
    "Product Design",
    "Exhibition Design"
  ],
  "Construction & Building": [
    "General Construction",
    "Electrical Services",
    "Plumbing",
    "HVAC",
    "Carpentry",
    "Painting",
    "Roofing",
    "Foundation Work",
    "Building Renovation",
    "Commercial Construction",
    "Residential Construction",
    "Steel Construction",
    "Construction Management",
    "Building Maintenance",
    "Architectural Services"
  ],
  "Cleaning & Maintenance": [
    "Commercial Cleaning",
    "Industrial Cleaning",
    "Office Cleaning",
    "Residential Cleaning",
    "Specialized Cleaning",
    "Window Cleaning",
    "Carpet & Upholstery Cleaning",
    "Post-construction Cleaning",
    "Sanitization Services",
    "Waste Management",
    "Janitorial Services",
    "Equipment Cleaning",
    "Facilities Maintenance",
    "Green Cleaning Services",
    "Emergency Cleaning"
  ],
  "Professional Services": [
    "Accounting",
    "Tax Services",
    "Legal Consulting",
    "Insurance Services",
    "Real Estate Services",
    "Translation Services",
    "Writing & Editing",
    "Training & Education",
    "Career Coaching",
    "Virtual Assistance",
    "Notary Services",
    "Financial Planning",
    "Business Registration",
    "Patent Services",
    "Corporate Training"
  ],
  "Health & Wellness": [
    "Healthcare Services",
    "Mental Health Services",
    "Fitness & Training",
    "Nutrition Services",
    "Alternative Medicine",
    "Physical Therapy",
    "Wellness Coaching",
    "Medical Equipment",
    "Healthcare Technology",
    "Telehealth Services",
    "Dental Services",
    "Chiropractic Care",
    "Sports Medicine",
    "Occupational Health",
    "Health Education"
  ],
  "Retail & E-commerce": [
    "Online Retail",
    "Brick & Mortar Retail",
    "Wholesale",
    "Dropshipping",
    "Marketplace Management",
    "E-commerce Consulting",
    "Inventory Management",
    "Supply Chain",
    "Customer Service",
    "Payment Solutions",
    "Order Fulfillment",
    "Product Sourcing",
    "Retail Analytics",
    "Store Design",
    "Visual Merchandising"
  ],
  "Manufacturing & Industrial": [
    "Product Manufacturing",
    "Custom Fabrication",
    "Industrial Design",
    "Quality Control",
    "Process Automation",
    "Equipment Maintenance",
    "Material Handling",
    "Packaging Solutions",
    "Industrial Safety",
    "Logistics Services",
    "Metal Fabrication",
    "Plastic Manufacturing",
    "Food Processing",
    "Chemical Manufacturing",
    "Electronics Manufacturing"
  ],
  "Events & Entertainment": [
    "Event Planning",
    "Wedding Services",
    "Corporate Events",
    "Audio/Visual Services",
    "Entertainment Services",
    "Venue Management",
    "Catering Services",
    "Event Marketing",
    "Virtual Events",
    "Event Technology",
    "Festival Management",
    "Conference Planning",
    "Exhibition Services",
    "Event Staffing",
    "Event Production"
  ],
  "Landscaping & Outdoor": [
    "Landscape Design",
    "Garden Maintenance",
    "Tree Services",
    "Irrigation Systems",
    "Hardscaping",
    "Lawn Care",
    "Outdoor Lighting",
    "Pool Services",
    "Pest Control",
    "Snow Removal",
    "Sports Field Maintenance",
    "Green Infrastructure",
    "Artificial Turf Installation",
    "Water Features",
    "Ecological Services"
  ],
  "Automotive & Transportation": [
    "Auto Repair",
    "Fleet Management",
    "Vehicle Maintenance",
    "Car Detailing",
    "Towing Services",
    "Transport Services",
    "Logistics Planning",
    "Freight Services",
    "Courier Services",
    "Moving Services",
    "Vehicle Customization",
    "Parts Supply",
    "Driver Services",
    "Storage Solutions",
    "Vehicle Inspection"
  ],
  "Education & Training": [
    "Academic Tutoring",
    "Professional Training",
    "Language Teaching",
    "Skills Development",
    "Online Courses",
    "Corporate Training",
    "Educational Consulting",
    "Test Preparation",
    "Vocational Training",
    "Special Education",
    "Music Education",
    "Art Education",
    "Technical Training",
    "Safety Training",
    "Educational Technology"
  ],
  "Security Services": [
    "Physical Security",
    "Cybersecurity Services",
    "Security Systems",
    "Surveillance",
    "Access Control",
    "Security Consulting",
    "Event Security",
    "Security Training",
    "Risk Assessment",
    "Emergency Response",
    "Security Equipment",
    "Data Protection",
    "Personal Security",
    "Security Auditing",
    "Investigation Services"
  ]
} as const;

interface LeadFormData {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  budget: string;
  location: string;
  phoneNumber?: string;
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

interface AcceptProposalData {
  contactDetails: string;
}

interface LeadWithUnreadCount extends SelectLead {
  unreadMessages: number;
}

interface CreateLeadFormProps {
  onSubmit: (data: LeadFormData) => void;
  isSubmitting: boolean;
}

interface BusinessLeadsViewProps {
  leads: LeadWithUnreadCount[];
  user: SelectUser;
  selectedLead: SelectLead | null;
  setSelectedLead: (lead: SelectLead | null) => void;
  proposalDialogOpen: boolean;
  setProposalDialogOpen: (open: boolean) => void;
  toast: (options: any) => void;
  playNotification: (type: string) => void;
}

const CreateLeadForm = ({ onSubmit, isSubmitting }: CreateLeadFormProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { user } = useAuth();
  const countryCode = user?.countryCode || "GB";

  const form = useForm<LeadFormData>({
    defaultValues: {
      title: "",
      description: "",
      category: "",
      subcategory: "",
      budget: "",
      location: "",
      phoneNumber: "",
    },
  });

  const formatPhoneNumber = (value: string, country: "GB" | "US") => {
    const rawDigits = value.replace(/[^\d+]/g, '');
    const digits = rawDigits.replace(/^\+?(44|1)/, '');

    if (country === "US") {
      if (digits.length === 0) return "";
      if (digits.length <= 3) return `+1 (${digits}`;
      if (digits.length <= 6) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else {
      if (digits.length === 0) return "";
      if (digits.length <= 4) return `+44 ${digits}`;
      if (digits.length <= 10) return `+44 ${digits.slice(0, 4)} ${digits.slice(4)}`;
      return `+44 ${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
    }
  };


  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
      <div className="space-y-4">
        <div>
          <Label htmlFor="category">Main Category</Label>
          <Select
            onValueChange={(value) => {
              setSelectedCategory(value);
              form.setValue("category", value);
              form.setValue("subcategory", "");
            }}
            defaultValue={form.getValues("category")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a main category" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(BUSINESS_CATEGORIES).map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCategory && (
          <div>
            <Label htmlFor="subcategory">Subcategory</Label>
            <Select
              onValueChange={(value) => form.setValue("subcategory", value)}
              defaultValue={form.getValues("subcategory")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subcategory" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_CATEGORIES[selectedCategory as keyof typeof BUSINESS_CATEGORIES].map((subcategory) => (
                  <SelectItem key={subcategory} value={subcategory}>
                    {subcategory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
      <div>
        <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
        <Input
          id="phoneNumber"
          {...form.register("phoneNumber")}
          placeholder={PHONE_COUNTRY_CODES[countryCode].format}
          onChange={(e) => {
            const formatted = formatPhoneNumber(e.target.value, countryCode as "GB" | "US");
            form.setValue("phoneNumber", formatted);
          }}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
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
};

const BusinessLeadsView = ({
  leads,
  user,
  selectedLead,
  setSelectedLead,
  proposalDialogOpen,
  setProposalDialogOpen,
  toast,
  playNotification
}: BusinessLeadsViewProps) => {
  const isFirstLoadRef = useRef(true);
  const previousMessagesLengthRef = useRef(0);
  const proposalForm = useForm<ProposalFormData>({
    defaultValues: { proposal: "" }
  });

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
            <a href="/subscription">Start Free Trial</a>
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
                            <DialogContent>
                              <MessageDialogContent
                                leadId={lead.id}
                                receiverId={response.business_id}
                                onClose={() => queryClient.invalidateQueries({ queryKey: ["/api/leads"] })}
                              />
                            </DialogContent>
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
          <div className="space-y-6">
            {!user?.profile ? (
              <p className="text-muted-foreground text-center py-8">
                Go to your business profile and complete it to start seeing leads.
              </p>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No matching leads found at this time. Check back later for new opportunities.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface FreeUserLeadsViewProps {
  leads: LeadWithUnreadCount[];
  createLeadMutation: any;
  updateLeadMutation: any;
  editingLead: LeadWithUnreadCount | null;
  setEditingLead: (lead: LeadWithUnreadCount | null) => void;
  deleteLeadMutation: any;
  user: SelectUser;
  acceptProposalMutation: any;
}

const FreeUserLeadsView = ({
  leads,
  createLeadMutation,
  updateLeadMutation,
  editingLead,
  setEditingLead,
  deleteLeadMutation,
  user,
  acceptProposalMutation
}: FreeUserLeadsViewProps) => {
  const { toast } = useToast();
  const editForm = useForm<LeadFormData>({
    defaultValues: {
      title: editingLead?.title || "",
      description: editingLead?.description || "",
      category: editingLead?.category || "",
      subcategory: editingLead?.subcategory || "",
      budget: editingLead?.budget?.toString() || "",
      location: editingLead?.location || "",
      phoneNumber: editingLead?.phoneNumber || ""
    },
  });
  const form = useForm<AcceptProposalData>({
    defaultValues: { contactDetails: "" }
  });

  const rejectProposalMutation = useMutation({
    mutationFn: async ({ leadId, responseId }: { leadId: number; responseId: number }) => {
      const res = await apiRequest("PATCH", `/api/leads/${leadId}/responses/${responseId}`, { status: "rejected" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Proposal rejected successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject proposal",
        variant: "destructive",
      });
    }
  });

  return (
    <Tabs defaultValue="my-leads">
      <TabsList>
        <TabsTrigger value="my-leads">My Posted Leads</TabsTrigger>
        <TabsTrigger value="post">Post New Lead</TabsTrigger>
      </TabsList>
      <TabsContent value="my-leads" className="mt-4">
        <div className="grid gap-6">
          {leads.map((lead) => (
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
                              <Label htmlFor="edit-subcategory">Subcategory</Label>
                              <Input
                                id="edit-subcategory"
                                {...editForm.register("subcategory")}
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
                            <div>
                              <Label htmlFor="edit-phoneNumber">Phone Number (Optional)</Label>
                              <Input
                                id="edit-phoneNumber"
                                {...editForm.register("phoneNumber")}
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
                        onClick={() => deleteLeadMutation.mutate(lead.id)}
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
                        <div key={response.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">
                                {response.business?.profile?.name || "Anonymous Business"}
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
                            <div className="mt-4 space-y-4">
                              <div className="p-4 bg-background rounded-lg border">
                                <h4 className="font-medium mb-2">Contact Information</h4>
                                <p className="text-sm whitespace-pre-wrap">                                  {response.contactDetails || "No contact details provided yet."}
                                </p>
                              </div>

                              <div className="p-4 bg-background rounded-lg border">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium">Messages</h4>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Send className="h-4 w-4 mr-2" />
                                        Open Messages
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <MessageDialogContent
                                        leadId={lead.id}
                                        receiverId={response.business_id}
                                        onClose={() =>
                                          queryClient.invalidateQueries({
                                            queryKey: ["/api/leads"],
                                          })
                                        }
                                      />
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </div>
                          )}

                          {response.status === "pending" && (
                            <div className="flex gap-2 mt-4">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm">Accept</Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Accept Proposal</DialogTitle>
                                    <DialogDescription>
                                      Please provide your contact details for the vendor
                                    </DialogDescription>
                                  </DialogHeader>
                                  <form
                                    onSubmit={form.handleSubmit((data) =>
                                      acceptProposalMutation.mutate({
                                        leadId: lead.id,
                                        responseId: response.id,
                                        contactDetails: data.contactDetails,
                                      })
                                    )}
                                  >
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="contactDetails">
                                          Contact Details
                                        </Label>
                                        <Textarea
                                          id="contactDetails"
                                          {...form.register("contactDetails")}
                                          placeholder="Enter your phone number, email, or any other contact information..."
                                          className="min-h-[100px]"
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
                                          "Accept Proposal"
                                        )}
                                      </Button>
                                    </div>
                                  </form>
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  rejectProposalMutation.mutate({
                                    leadId: lead.id,
                                    responseId: response.id,
                                  });
                                }}
                                disabled={rejectProposalMutation.isPending}
                              >
                                {rejectProposalMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Rejecting...
                                  </>
                                ) : (
                                  "Reject"
                                )}
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
          {(!leads || leads.length === 0) && (
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
            <CardDescription>
              Fill out the form below to post a new lead
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateLeadForm
              onSubmit={(data) => createLeadMutation.mutate(data)}
              isSubmitting={createLeadMutation.isPending}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

const BusinessProfileForm = () => {
  const { user, setUser } = useAuth();
  const { register, handleSubmit } = useForm<ProfileFormData>();

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await apiRequest('POST', '/api/users/profile', data);
      setUser({...user, profile: data});
      queryClient.invalidateQueries({queryKey: ['/api/leads']});

    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} />
      </div>
      <div>
        <Label htmlFor="categories">Categories (comma-separated)</Label>
        <Input id="categories" {...register('categories')} />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" {...register('location')} />
      </div>
      <Button type="submit">Save Profile</Button>
    </form>
  );
};


export default function LeadsPage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const playNotification = useNotificationSound();

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithUnreadCount | null>(null);
  const [selectedLead, setSelectedLead] = useState<SelectLead | null>(null);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.profile?.name || "",
      description: user?.profile?.description || "",
      categories: user?.profile?.categories?.join(", ") || "",
      location: user?.profile?.location || "",
    },
  });

  const usernameForm = useForm<UsernameFormData>({
    defaultValues: {
      username: user?.username || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  if (!user) {
    return <Redirect to="/auth" />;
  }

  const {
    data: leads = [],
    isLoading: isLoadingLeads,
  } = useQuery<LeadWithUnreadCount[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/leads");
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.subscriptionRequired) {
            setShowSubscriptionModal(true);
            throw new Error("Subscription required");
          }
          throw new Error("Failed to fetch leads");
        }
        return await response.json();
      } catch (error: any) {
        if (error.subscriptionRequired ||
          (error.response && error.response.status === 403 && error.response.data?.subscriptionRequired)) {
          setShowSubscriptionModal(true);
        }
        throw error;
      }
    },
    enabled: !!user,
    retry: false
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept proposal",
        variant: "destructive",
      });
    }
  });

  const rejectProposalMutation = useMutation({
    mutationFn: async ({ leadId, responseId }: { leadId: number; responseId: number }) => {
      const res = await apiRequest("PATCH", `/api/leads/${leadId}/responses/${responseId}`, { status: "rejected" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Proposal rejected successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject proposal",
        variant: "destructive",
      });
    }
  });

  if (isLoadingLeads) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {user?.userType === 'business' || user?.userType === 'vendor' ? (
        <BusinessLeadsView
          leads={leads}
          user={user}
          selectedLead={selectedLead}
          setSelectedLead={setSelectedLead}
          proposalDialogOpen={proposalDialogOpen}
          setProposalDialogOpen={setProposalDialogOpen}
          toast={toast}
          playNotification={playNotification}
        />
      ) : (
        <FreeUserLeadsView
          leads={leads}
          createLeadMutation={createLeadMutation}
          updateLeadMutation={updateLeadMutation}
          editingLead={editingLead}
          setEditingLead={setEditingLead}
          deleteLeadMutation={deleteLeadMutation}
          user={user}
          acceptProposalMutation={acceptProposalMutation}
          rejectProposalMutation={rejectProposalMutation}
        />
      )}
    </div>
  );
}

interface MessageDialogContentProps {
  leadId: number;
  receiverId: number;
  onClose?: () => void;
}

export function MessageDialogContent({ leadId, receiverId, onClose }: MessageDialogContentProps) {
  const [open, setOpen] = useState(true);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onClose?.();
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Messages</DialogTitle>
      </DialogHeader>
      <MessageDialog
        leadId={leadId}
        receiverId={receiverId}
        isOpen={open}
        onOpenChange={handleOpenChange}
        onMessagesRead={onClose}
      />
    </>
  );
}

function calculateMatchScore(lead: any, user: any): {
  totalScore: number;
  categoryScore: number;
  locationScore: number;
  budgetScore: number;
  industryScore: number;
} {
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
  if (user?.profile?.matchPreferences?.budgetRange?.min && lead.budget &&
    Math.abs(lead.budget - user.profile.matchPreferences.budgetRange.min) < 1000) {
    budgetScore = 25;
  }
  if (user?.profile?.matchPreferences?.industries?.some((industry: string) =>
    lead.industries?.includes(industry))) {
    industryScore = 25;
  }

  totalScore = categoryScore + locationScore + budgetScore + industryScore;
  return { totalScore, categoryScore, locationScore, budgetScore, industryScore };
}
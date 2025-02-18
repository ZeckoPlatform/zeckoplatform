import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Link2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PRESET_SOURCES = {
  RSS: [
    {
      name: "UK Business Forums",
      url: "https://www.ukbusinessforums.co.uk/forums/-/index.rss",
      type: "rss",
      description: "Latest business opportunities from UK's largest business forum"
    },
    {
      name: "US Small Business Administration",
      url: "https://www.sba.gov/rss",
      type: "rss",
      description: "Official US government small business opportunities"
    }
  ],
  API: [
    {
      name: "UK Government Contracts",
      url: "https://www.contractsfinder.service.gov.uk/Published/Notices/",
      type: "api",
      requiresKey: true,
      description: "Official UK government contract opportunities"
    },
    {
      name: "US Federal Business Opportunities",
      url: "https://sam.gov/api/prod/opportunities/v2/search",
      type: "api",
      requiresKey: true,
      description: "US federal government contract listings"
    }
  ]
};

export function ImportLeadsDialog() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"rss" | "api">("rss");
  const [apiKey, setApiKey] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");

  const importMutation = useMutation({
    mutationFn: async (data: { type: "rss" | "api"; url: string; apiKey?: string }) => {
      const response = await apiRequest("POST", "/api/leads/import", data);
      if (!response.ok) throw new Error("Failed to import leads");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: `Imported ${data.leads.length} leads successfully`,
      });
      setUrl("");
      setApiKey("");
      setSelectedPreset("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePresetSelect = (preset: typeof PRESET_SOURCES.RSS[0] | typeof PRESET_SOURCES.API[0]) => {
    setType(preset.type);
    setUrl(preset.url);
    setSelectedPreset(preset.name);
    if (!preset.requiresKey) {
      setApiKey("");
    }
  };

  const handleImport = () => {
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({
      type,
      url,
      apiKey: apiKey || undefined,
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2 className="w-4 h-4 mr-2" />
          Import Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
          <DialogDescription>
            Import business leads from external sources to grow your marketplace
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="preset" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preset">Use Preset Source</TabsTrigger>
            <TabsTrigger value="custom">Custom Source</TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="mb-2 text-sm font-medium">RSS Feeds</h4>
                {PRESET_SOURCES.RSS.map((source) => (
                  <Card
                    key={source.name}
                    className={`mb-2 cursor-pointer transition-colors ${
                      selectedPreset === source.name ? "border-primary" : ""
                    }`}
                    onClick={() => handlePresetSelect(source)}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">{source.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {source.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium">API Sources</h4>
                {PRESET_SOURCES.API.map((source) => (
                  <Card
                    key={source.name}
                    className={`mb-2 cursor-pointer transition-colors ${
                      selectedPreset === source.name ? "border-primary" : ""
                    }`}
                    onClick={() => handlePresetSelect(source)}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">{source.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {source.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={type} onValueChange={(value: "rss" | "api") => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rss">RSS Feed</SelectItem>
                  <SelectItem value="api">External API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder="Enter feed or API URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            {type === "api" && (
              <div className="space-y-2">
                <Label>API Key (Optional)</Label>
                <Input
                  placeholder="Enter API key if required"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            )}
          </TabsContent>

          <Button 
            className="w-full mt-4" 
            onClick={handleImport}
            disabled={importMutation.isPending || !url}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Leads"
            )}
          </Button>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
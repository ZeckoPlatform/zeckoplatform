import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ImportLeadsDialog() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"rss" | "api">("rss");
  const [apiKey, setApiKey] = useState("");

  const importMutation = useMutation({
    mutationFn: async (data: { type: "rss" | "api"; url: string; apiKey?: string }) => {
      const response = await apiRequest("POST", "/api/leads/import", data);
      if (!response.ok) throw new Error("Failed to import leads");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Leads imported successfully",
      });
      setUrl("");
      setApiKey("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
        <Button variant="outline">Import Leads</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

          <Button 
            className="w-full" 
            onClick={handleImport}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? "Importing..." : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

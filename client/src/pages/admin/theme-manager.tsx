import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ColorConfig {
  primary: string;
  variant: "professional" | "tint" | "vibrant";
  appearance: "light" | "dark" | "system";
  radius: number;
  base: {
    background: string;
    foreground: string;
    card: string;
    "card-foreground": string;
    popover: string;
    "popover-foreground": string;
    primary: string;
    "primary-foreground": string;
    secondary: string;
    "secondary-foreground": string;
    muted: string;
    "muted-foreground": string;
    accent: string;
    "accent-foreground": string;
    destructive: string;
    "destructive-foreground": string;
    border: string;
    input: string;
    ring: string;
  };
}

const defaultColors: ColorConfig = {
  primary: "#FF6B2C",
  variant: "vibrant",
  appearance: "system",
  radius: 0.5,
  base: {
    background: "#FFFFFF",
    foreground: "#172B4D",
    card: "#FFFFFF",
    "card-foreground": "#172B4D",
    popover: "#FFFFFF",
    "popover-foreground": "#172B4D",
    primary: "#FF6B2C",
    "primary-foreground": "#FFFFFF",
    secondary: "#4A90E2",
    "secondary-foreground": "#FFFFFF",
    muted: "#E5F0FF",
    "muted-foreground": "#4A5D82",
    accent: "#4A90E2",
    "accent-foreground": "#FFFFFF",
    destructive: "#FF4545",
    "destructive-foreground": "#FFFFFF",
    border: "#E5E9F0",
    input: "#F0F4F8",
    ring: "#FF6B2C"
  }
};

export default function ThemeManager() {
  const { toast } = useToast();
  const [themeName, setThemeName] = useState("");
  const [colors, setColors] = useState<ColorConfig>(defaultColors);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");

  const { data: themes, isLoading: loadingThemes } = useQuery({
    queryKey: ["themes"],
    queryFn: () => apiRequest("/api/themes")
  });

  const createThemeMutation = useMutation({
    mutationFn: (themeData: { name: string; colors: ColorConfig }) =>
      apiRequest("/api/themes", {
        method: "POST",
        body: JSON.stringify(themeData),
      }),
    onSuccess: () => {
      toast({
        title: "Theme Created",
        description: "The theme has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save the theme. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateLivePreview = (newColors: ColorConfig) => {
    setColors(newColors);
    // Update CSS variables for live preview
    const root = document.documentElement;
    Object.entries(newColors.base).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  };

  const handleColorChange = (key: string, value: string) => {
    const newColors = { ...colors };
    if (key.includes(".")) {
      const [section, colorKey] = key.split(".");
      (newColors as any)[section][colorKey] = value;
    } else {
      (newColors as any)[key] = value;
    }
    updateLivePreview(newColors);
  };

  const handleSave = () => {
    if (!themeName) {
      toast({
        title: "Error",
        description: "Please enter a theme name",
        variant: "destructive",
      });
      return;
    }
    createThemeMutation.mutate({ name: themeName, colors });
  };

  const handleReset = () => {
    setColors(defaultColors);
    updateLivePreview(defaultColors);
  };

  const ColorInput = ({ label, path }: { label: string; path: string }) => (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={
            path.includes(".")
              ? (colors as any)[path.split(".")[0]][path.split(".")[1]]
              : (colors as any)[path]
          }
          onChange={(e) => handleColorChange(path, e.target.value)}
          className="w-16 p-1 h-10"
        />
        <Input
          type="text"
          value={
            path.includes(".")
              ? (colors as any)[path.split(".")[0]][path.split(".")[1]]
              : (colors as any)[path]
          }
          onChange={(e) => handleColorChange(path, e.target.value)}
          className="font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Theme Manager</CardTitle>
          <CardDescription>
            Customize the application's theme colors and preview changes in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="themeName">Theme Name</Label>
                <Input
                  id="themeName"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="Enter theme name"
                />
              </div>
              <div>
                <Label>Variant</Label>
                <Select
                  value={colors.variant}
                  onValueChange={(value: "professional" | "tint" | "vibrant") =>
                    handleColorChange("variant", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="tint">Tint</SelectItem>
                    <SelectItem value="vibrant">Vibrant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="colors" className="w-full">
              <TabsList>
                <TabsTrigger value="colors">Colors</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="colors" className="space-y-6">
                <div className="grid gap-6">
                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">Primary Colors</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ColorInput label="Primary" path="primary" />
                      <ColorInput label="Background" path="base.background" />
                      <ColorInput label="Foreground" path="base.foreground" />
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">UI Elements</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ColorInput label="Card" path="base.card" />
                      <ColorInput label="Card Foreground" path="base.card-foreground" />
                      <ColorInput label="Input" path="base.input" />
                      <ColorInput label="Border" path="base.border" />
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">Accent Colors</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ColorInput label="Secondary" path="base.secondary" />
                      <ColorInput label="Accent" path="base.accent" />
                      <ColorInput label="Muted" path="base.muted" />
                      <ColorInput label="Destructive" path="base.destructive" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview">
                <div className="grid gap-6">
                  <div className="flex gap-4">
                    <Button
                      variant={previewMode === "light" ? "default" : "outline"}
                      onClick={() => setPreviewMode("light")}
                    >
                      Light Mode
                    </Button>
                    <Button
                      variant={previewMode === "dark" ? "default" : "outline"}
                      onClick={() => setPreviewMode("dark")}
                    >
                      Dark Mode
                    </Button>
                  </div>

                  <div className={`space-y-4 p-6 rounded-lg ${previewMode === "dark" ? "bg-slate-900" : "bg-white"}`}>
                    <h2 className="text-2xl font-bold">Preview</h2>
                    <p>This is how your theme will look across the application.</p>
                    
                    <div className="grid gap-4">
                      <Button>Primary Button</Button>
                      <Button variant="secondary">Secondary Button</Button>
                      <Button variant="destructive">Destructive Button</Button>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Card Example</CardTitle>
                          <CardDescription>
                            This is how cards will appear with the selected theme.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p>Card content with the new theme colors.</p>
                        </CardContent>
                      </Card>
                      
                      <div className="flex gap-4">
                        <Input placeholder="Input field" />
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Option 1</SelectItem>
                            <SelectItem value="2">Option 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={handleReset}>
                Reset to Default
              </Button>
              <Button
                onClick={handleSave}
                disabled={createThemeMutation.isPending}
              >
                {createThemeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Theme"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

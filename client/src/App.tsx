import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background p-8">
        <h1 className="text-4xl font-bold">Welcome to Zecko Platform</h1>
        <p className="mt-4">Development server test page</p>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
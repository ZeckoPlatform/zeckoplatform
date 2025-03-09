import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
//import { Toaster } from "@/components/ui/toaster"; //removed as per intention

function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-4xl font-bold">Zecko Platform Test Page</h1>
      <p className="mt-4">If you can see this, the Vite development server is working!</p>
    </div>
  );
}

export default App;
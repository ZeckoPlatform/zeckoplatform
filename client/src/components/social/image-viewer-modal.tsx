import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
}

export function ImageViewerModal({ open, onOpenChange, imageUrl }: ImageViewerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-black/20 hover:bg-black/40 text-white z-50"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <img
            src={imageUrl}
            alt="Full size"
            className="w-full h-full object-contain max-h-[90vh]"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

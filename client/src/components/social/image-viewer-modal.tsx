import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent 
        className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden border-0 bg-transparent"
        style={{ backdropFilter: 'none' }}
      >
        <DialogTitle className="sr-only">Image Viewer</DialogTitle>
        <div className="relative flex items-center justify-center bg-black/90 rounded-lg overflow-hidden border border-primary">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 bg-black hover:bg-black/70 text-white"
            onClick={() => onOpenChange(false)}
            aria-label="Close image viewer"
            style={{ transition: 'none' }}
          >
            <X className="h-4 w-4" />
          </Button>
          <img
            src={imageUrl}
            alt="Full size view"
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
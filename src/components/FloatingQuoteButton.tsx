import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { QuoteModal } from "./QuoteModal";

export function FloatingQuoteButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3">
        <Button 
          size="sm" 
          variant="secondary"
          onClick={() => setOpen(true)}
          className="rounded-full shadow-md text-xs h-9 px-4 opacity-90 hover:opacity-100 transition-all border border-border"
        >
          <Calculator className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
          Cotar com Concorrente
        </Button>
      </div>

      <QuoteModal open={open} onOpenChange={setOpen} />
    </>
  );
}

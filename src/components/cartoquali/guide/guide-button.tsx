import { BookOpenCheck, CircleHelp, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGuide } from "./guide-provider";

/** The "?" in the top bar: replay this page's guide or the full tour. */
export function GuideButton() {
  const { startTour, startPageGuide, hasPageGuide, running } = useGuide();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ajuda e guia de uso"
          title="Ajuda e guia de uso"
          disabled={running}
        >
          <CircleHelp />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Guia de uso</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!hasPageGuide} onSelect={() => startPageGuide()}>
          <BookOpenCheck />
          Guia desta página
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => startTour()}>
          <Compass />
          Tour completo do sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

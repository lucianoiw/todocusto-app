"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconHelpCircle } from "@tabler/icons-react";

interface ProductSwitchesProps {
  defaultAvailableForSale?: boolean;
  defaultActive?: boolean;
}

export function ProductSwitches({
  defaultAvailableForSale = true,
  defaultActive = true,
}: ProductSwitchesProps) {
  const [availableForSale, setAvailableForSale] = useState(defaultAvailableForSale);
  const [active, setActive] = useState(defaultActive);

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2">
        <Switch
          id="availableForSale"
          checked={availableForSale}
          onCheckedChange={setAvailableForSale}
        />
        <Label htmlFor="availableForSale" className="cursor-pointer">
          Disponível para venda em cardápios
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconHelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Desative para produtos que são apenas componentes (ex: Base de Pizza)</p>
          </TooltipContent>
        </Tooltip>
        <input type="hidden" name="availableForSale" value={availableForSale ? "true" : "false"} />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={active}
          onCheckedChange={setActive}
        />
        <Label htmlFor="active" className="cursor-pointer">
          Produto ativo
        </Label>
        <input type="hidden" name="active" value={active ? "true" : "false"} />
      </div>
    </TooltipProvider>
  );
}

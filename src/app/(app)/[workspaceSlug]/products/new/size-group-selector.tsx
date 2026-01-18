"use client";

import { useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconExternalLink } from "@tabler/icons-react";

interface SizeGroup {
  id: string;
  name: string;
  options: { name: string }[];
}

interface SizeGroupSelectorProps {
  workspaceSlug: string;
  sizeGroups: SizeGroup[];
  defaultValue?: string;
}

export function SizeGroupSelector({
  workspaceSlug,
  sizeGroups,
  defaultValue,
}: SizeGroupSelectorProps) {
  const [hasSizes, setHasSizes] = useState(!!defaultValue);
  const [selectedGroupId, setSelectedGroupId] = useState(defaultValue || "");

  // Se não há grupos cadastrados
  if (sizeGroups.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Switch
            id="hasSizes"
            checked={hasSizes}
            onCheckedChange={setHasSizes}
          />
          <Label htmlFor="hasSizes" className="cursor-pointer">
            Esse produto tem tamanhos diferentes?
          </Label>
        </div>

        {hasSizes && (
          <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground mb-3">
              Você ainda não cadastrou nenhum grupo de tamanhos. Grupos de tamanhos
              permitem criar variações como P, M, G ou 500ml, 1L, 2L.
            </p>
            <Link
              href={`/${workspaceSlug}/sizes`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ir para Tamanhos
              <IconExternalLink className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Hidden input para enviar valor vazio */}
        <input type="hidden" name="sizeGroupId" value="" />
      </div>
    );
  }

  // Se há grupos cadastrados
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Switch
          id="hasSizes"
          checked={hasSizes}
          onCheckedChange={(checked) => {
            setHasSizes(checked);
            if (!checked) {
              setSelectedGroupId("");
            }
          }}
        />
        <Label htmlFor="hasSizes" className="cursor-pointer">
          Esse produto tem tamanhos diferentes?
        </Label>
      </div>

      {hasSizes && (
        <div className="space-y-2">
          <Label htmlFor="sizeGroupId">Grupo de Tamanhos</Label>
          <Select
            name="sizeGroupId"
            value={selectedGroupId}
            onValueChange={setSelectedGroupId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um grupo" />
            </SelectTrigger>
            <SelectContent>
              {sizeGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name} ({group.options.map((o) => o.name).join(", ")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Será criada uma variação do produto para cada tamanho do grupo
          </p>
        </div>
      )}

      {/* Hidden input quando switch está desligado */}
      {!hasSizes && <input type="hidden" name="sizeGroupId" value="" />}
    </div>
  );
}

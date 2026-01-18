"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMenuTargetMargin } from "@/actions/menus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconCheck } from "@tabler/icons-react";

interface TargetMarginSectionProps {
  workspaceSlug: string;
  menuId: string;
  targetMargin: number;
  pricingMode: "margin" | "markup";
  hasProducts: boolean;
}

export function TargetMarginSection({
  workspaceSlug,
  menuId,
  targetMargin: initialMargin,
  pricingMode,
  hasProducts,
}: TargetMarginSectionProps) {
  const router = useRouter();
  const [targetMargin, setTargetMargin] = useState(initialMargin);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = targetMargin !== initialMargin;

  async function handleSave() {
    if (!hasChanges) return;

    setSaving(true);
    const result = await updateMenuTargetMargin(
      workspaceSlug,
      menuId,
      targetMargin.toString(),
      updateExisting,
      initialMargin
    );
    setSaving(false);

    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } else {
      alert(result.error);
    }
  }

  const isMarkup = pricingMode === "markup";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isMarkup ? "Markup Alvo" : "Margem de Lucro Alvo"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isMarkup
            ? "Percentual aplicado sobre o custo para calcular preços"
            : "Percentual do preço de venda usado para calcular preços sugeridos"
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={targetMargin}
            onChange={(e) => setTargetMargin(Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hasChanges) {
                handleSave();
              }
            }}
            className="w-20 h-9"
            min="0"
            max="99"
            disabled={saving}
          />
          <span className="text-muted-foreground">%</span>
          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          )}
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <IconCheck className="w-4 h-4" />
              Salvo
            </span>
          )}
        </div>
        {hasChanges && hasProducts && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="updateExisting"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="updateExisting" className="text-sm cursor-pointer">
              Atualizar preços dos produtos existentes para {isMarkup ? "o novo markup" : "a nova margem"}
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

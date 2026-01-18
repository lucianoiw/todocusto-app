"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLaborCost } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconLoader2, IconInfoCircle } from "@tabler/icons-react";

interface LaborCostFormProps {
  workspaceSlug: string;
  currentLaborCost: string | null;
  currentMonthlyHours: string | null;
}

export function LaborCostForm({
  workspaceSlug,
  currentLaborCost,
  currentMonthlyHours,
}: LaborCostFormProps) {
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [laborCost, setLaborCost] = useState(currentLaborCost || "");
  const [monthlyHours, setMonthlyHours] = useState(currentMonthlyHours || "");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const result = await updateLaborCost(
      workspaceSlug,
      laborCost ? laborCost : null,
      monthlyHours ? monthlyHours : null
    );

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Configurações de mão de obra atualizadas!" });
      router.refresh();

      // Always recalculate all recipes when labor cost changes
      if (result.workspaceId) {
        setRecalculating(true);
        try {
          await fetch(`/api/recalculate-recipes/${workspaceSlug}`, {
            method: "POST",
          });
          setMessage({ type: "success", text: "Configurações atualizadas e receitas recalculadas!" });
        } catch {
          setMessage({ type: "success", text: "Configurações atualizadas! As receitas serão recalculadas gradualmente." });
        }
        setRecalculating(false);
      }
    }

    setSaving(false);
  }

  // Calculate example cost
  const hourlyRate = parseFloat(laborCost) || 0;
  const costPerMinute = hourlyRate / 60;
  const costPer10Min = costPerMinute * 10;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="monthlyHours">Horas trabalhadas por mês</Label>
          <Input
            id="monthlyHours"
            type="number"
            step="1"
            min="1"
            value={monthlyHours}
            onChange={(e) => setMonthlyHours(e.target.value)}
            placeholder="Ex: 176"
          />
          <p className="text-xs text-muted-foreground">
            Total de horas trabalhadas no mês (ex: 8h/dia × 22 dias = 176h)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="laborCost">Custo por hora de trabalho (R$)</Label>
          <Input
            id="laborCost"
            type="number"
            step="0.01"
            min="0"
            value={laborCost}
            onChange={(e) => setLaborCost(e.target.value)}
            placeholder="0,00"
          />
          <p className="text-xs text-muted-foreground">
            Valor da hora de trabalho incluindo encargos
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving || recalculating}>
        {saving ? (
          <>
            <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
            Salvando...
          </>
        ) : recalculating ? (
          <>
            <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
            Recalculando...
          </>
        ) : (
          "Salvar"
        )}
      </Button>

      {hourlyRate > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-start gap-2">
            <IconInfoCircle className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="text-sm">
              <p className="text-muted-foreground">
                Uma receita de <strong className="text-foreground">10 minutos</strong> terá custo de mão de obra de{" "}
                <strong className="text-foreground">
                  R$ {costPer10Min.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

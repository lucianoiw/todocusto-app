"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateMenuApportionment } from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconSettings, IconExternalLink } from "@tabler/icons-react";

interface FixedCostsSectionProps {
  workspaceSlug: string;
  menuId: string;
  totalMonthlyFixedCost: number;
  fixedCostCount: number;
  apportionmentType: "percentage_of_sale" | "fixed_per_product" | "proportional_to_sales";
  apportionmentValue: string | null;
  productCount: number;
}

const apportionmentLabels = {
  percentage_of_sale: "Percentual do Preço de Venda",
  fixed_per_product: "Valor Fixo por Produto",
  proportional_to_sales: "Proporcional às Vendas",
};

const apportionmentDescriptions = {
  percentage_of_sale:
    "Adiciona um percentual do preço de venda como custo fixo. Ex: 5% sobre o preço de venda.",
  fixed_per_product:
    "Adiciona um valor fixo para cada produto vendido, independente do preço.",
  proportional_to_sales:
    "Distribui o custo fixo mensal baseado em uma estimativa de vendas mensais.",
};

export function FixedCostsSection({
  workspaceSlug,
  menuId,
  totalMonthlyFixedCost,
  fixedCostCount,
  apportionmentType,
  apportionmentValue,
  productCount,
}: FixedCostsSectionProps) {
  const router = useRouter();
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(apportionmentType);
  const [selectedValue, setSelectedValue] = useState(apportionmentValue || "");

  async function handleSaveConfig() {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("apportionmentType", selectedType);
      formData.set("apportionmentValue", selectedValue);

      const result = await updateMenuApportionment(workspaceSlug, menuId, formData);
      if (result.success) {
        setShowConfigDialog(false);
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  // Calculate apportioned cost per product
  function getApportionedCostPerProduct(): string | null {
    if (totalMonthlyFixedCost === 0) return null;
    const appValue = parseFloat(apportionmentValue || "0");
    if (appValue <= 0) return null;

    switch (apportionmentType) {
      case "percentage_of_sale":
        return `${appValue.toFixed(2)}%`;
      case "fixed_per_product":
        return `R$ ${appValue.toFixed(2)}`;
      case "proportional_to_sales":
        return `R$ ${(totalMonthlyFixedCost / appValue).toFixed(2)}`;
      default:
        return null;
    }
  }

  const apportionedCost = getApportionedCostPerProduct();
  const hasConfig = apportionmentValue && parseFloat(apportionmentValue) > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Custos Fixos</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Rateio dos custos fixos do negócio nos produtos
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowConfigDialog(true)}
        >
          <IconSettings className="w-4 h-4 mr-1" />
          Configurar Rateio
        </Button>
      </CardHeader>
      <CardContent>
        {totalMonthlyFixedCost === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-3">
              Nenhum custo fixo cadastrado no workspace.
            </p>
            <Link
              href={`/${workspaceSlug}/fixed-costs/new`}
              className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
            >
              Cadastrar custos fixos
              <IconExternalLink className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total fixed costs */}
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Total de custos fixos mensais</div>
                <div className="text-xs text-muted-foreground">
                  {fixedCostCount} custo{fixedCostCount !== 1 ? "s" : ""} ativo{fixedCostCount !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">R$ {totalMonthlyFixedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <Link
                  href={`/${workspaceSlug}/fixed-costs`}
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Ver custos
                  <IconExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Apportionment config */}
            {hasConfig ? (
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-400 dark:text-blue-300">
                      {apportionmentLabels[apportionmentType]}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      {apportionmentType === "percentage_of_sale" &&
                        `${parseFloat(apportionmentValue || "0")}% do preço de venda`}
                      {apportionmentType === "fixed_per_product" &&
                        `R$ ${parseFloat(apportionmentValue || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por produto`}
                      {apportionmentType === "proportional_to_sales" &&
                        `${Math.round(parseFloat(apportionmentValue || "0"))} vendas estimadas/mês`}
                    </div>
                  </div>
                  {apportionedCost && (
                    <div className="text-right">
                      <div className="text-xs text-blue-600 dark:text-blue-400">Custo por produto</div>
                      <div className="font-bold text-blue-700 dark:text-blue-400 dark:text-blue-300">{apportionedCost}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Configure o rateio para incluir os custos fixos no cálculo de margem dos produtos.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Configure Apportionment Dialog */}
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Configurar Rateio de Custos Fixos</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Total mensal de custos fixos</div>
                <div className="text-xl font-bold">R$ {totalMonthlyFixedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              <div className="space-y-2">
                <Label>Método de rateio</Label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(
                      e.target.value as typeof apportionmentType
                    );
                    setSelectedValue("");
                  }}
                  className="w-full h-10 px-3 rounded-md border text-sm"
                >
                  <option value="proportional_to_sales">
                    Proporcional às Vendas (recomendado)
                  </option>
                  <option value="percentage_of_sale">
                    Percentual do Preço de Venda
                  </option>
                  <option value="fixed_per_product">
                    Valor Fixo por Produto
                  </option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {apportionmentDescriptions[selectedType]}
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  {selectedType === "percentage_of_sale" && "Percentual a adicionar"}
                  {selectedType === "fixed_per_product" && "Valor por produto"}
                  {selectedType === "proportional_to_sales" &&
                    "Estimativa de vendas mensais"}
                </Label>
                <div className="flex items-center gap-2">
                  {selectedType === "fixed_per_product" && (
                    <span className="text-muted-foreground">R$</span>
                  )}
                  <Input
                    type="number"
                    step={selectedType === "proportional_to_sales" ? "1" : "0.01"}
                    min="0"
                    value={selectedValue}
                    onChange={(e) => setSelectedValue(e.target.value)}
                    placeholder={
                      selectedType === "percentage_of_sale"
                        ? "5"
                        : selectedType === "fixed_per_product"
                        ? "1,50"
                        : "500"
                    }
                  />
                  {selectedType === "percentage_of_sale" && (
                    <span className="text-muted-foreground">%</span>
                  )}
                  {selectedType === "proportional_to_sales" && (
                    <span className="text-muted-foreground">vendas</span>
                  )}
                </div>

                {selectedType === "proportional_to_sales" &&
                  selectedValue &&
                  totalMonthlyFixedCost > 0 && (
                    <p className="text-sm text-blue-600">
                      Custo por produto: R${" "}
                      {(totalMonthlyFixedCost / parseInt(selectedValue || "1")).toLocaleString(
                        "pt-BR",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}
                    </p>
                  )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveConfig} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

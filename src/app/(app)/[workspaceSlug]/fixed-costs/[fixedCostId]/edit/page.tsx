import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getFixedCost, updateFixedCost } from "@/actions/fixed-costs";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";
import { DeleteFixedCostButton } from "./delete-button";

interface EditFixedCostPageProps {
  params: Promise<{ workspaceSlug: string; fixedCostId: string }>;
}

export default async function EditFixedCostPage({ params }: EditFixedCostPageProps) {
  const { workspaceSlug, fixedCostId } = await params;
  const fixedCost = await getFixedCost(workspaceSlug, fixedCostId);

  if (!fixedCost) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateFixedCost(workspaceSlug, fixedCostId, formData);
    if (result.success) {
      redirect(`/${workspaceSlug}/fixed-costs`);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/fixed-costs`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para custos fixos
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Custo Fixo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={fixedCost.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={fixedCost.description || ""}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor mensal *</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">R$</span>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={fixedCost.value}
                  required
                  className="w-40"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                name="active"
                value="true"
                defaultChecked={fixedCost.active}
                className="rounded"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Custo ativo
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <SubmitButton loadingText="Salvando...">Salvar Alterações</SubmitButton>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/fixed-costs`}>Cancelar</Link>
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-medium text-red-600 mb-2">Zona de perigo</h3>
            <DeleteFixedCostButton
              workspaceSlug={workspaceSlug}
              fixedCostId={fixedCostId}
              fixedCostName={fixedCost.name}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

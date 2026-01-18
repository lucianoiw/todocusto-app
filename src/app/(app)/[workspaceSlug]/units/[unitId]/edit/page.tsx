import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getUnit, updateUnit } from "@/actions/units";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";

interface EditUnitPageProps {
  params: Promise<{ workspaceSlug: string; unitId: string }>;
}

const measurementTypeLabels = {
  weight: "Peso",
  volume: "Líquido",
  unit: "Unidade",
};

export default async function EditUnitPage({ params }: EditUnitPageProps) {
  const { workspaceSlug, unitId } = await params;
  const unit = await getUnit(workspaceSlug, unitId);

  if (!unit) {
    notFound();
  }

  // Base units cannot be edited
  if (unit.isBase) {
    redirect(`/${workspaceSlug}/units`);
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateUnit(workspaceSlug, unitId, formData);
    if (result.success) {
      redirect(`/${workspaceSlug}/units`);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/units`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para unidades
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Unidade</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de medida</Label>
              <p className="text-sm text-muted-foreground">
                {measurementTypeLabels[unit.measurementType]}
              </p>
              <p className="text-xs text-muted-foreground">
                O tipo de medida não pode ser alterado.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={unit.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abbreviation">Abreviação *</Label>
                <Input
                  id="abbreviation"
                  name="abbreviation"
                  defaultValue={unit.abbreviation}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conversionFactor">
                Fator de conversão para{" "}
                {unit.measurementType === "weight" ? "gramas" : unit.measurementType === "volume" ? "mililitros" : "unidades"} *
              </Label>
              <Input
                id="conversionFactor"
                name="conversionFactor"
                type="number"
                step="0.000001"
                min="0.000001"
                defaultValue={unit.conversionFactor}
                required
              />
              <p className="text-xs text-muted-foreground">
                Quantas {unit.measurementType === "weight" ? "gramas" : unit.measurementType === "volume" ? "mililitros" : "unidades"} equivalem a 1 {unit.abbreviation}?
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <SubmitButton loadingText="Salvando...">Salvar Alterações</SubmitButton>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/units`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

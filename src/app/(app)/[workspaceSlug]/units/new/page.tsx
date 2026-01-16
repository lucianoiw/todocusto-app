import Link from "next/link";
import { redirect } from "next/navigation";
import { createUnit } from "@/actions/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconArrowLeft } from "@tabler/icons-react";

interface NewUnitPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function NewUnitPage({ params }: NewUnitPageProps) {
  const { workspaceSlug } = await params;

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await createUnit(workspaceSlug, formData);
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
          <CardTitle>Nova Unidade</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="measurementType">Tipo de medida *</Label>
              <Select name="measurementType" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Peso (gramas como base)</SelectItem>
                  <SelectItem value="volume">Líquido (mililitros como base)</SelectItem>
                  <SelectItem value="unit">Unidade (unidade como base)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Caixa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abbreviation">Abreviação *</Label>
                <Input
                  id="abbreviation"
                  name="abbreviation"
                  placeholder="Ex: cx"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conversionFactor">Fator de conversão *</Label>
              <Input
                id="conversionFactor"
                name="conversionFactor"
                type="number"
                step="0.000001"
                min="0.000001"
                placeholder="Ex: 2000 (para cx = 2kg = 2000g)"
                required
              />
              <p className="text-xs text-muted-foreground">
                Quantas unidades base (g/ml/un) equivalem a 1 desta unidade?
                <br />
                Exemplos: 1 kg = 1000 g | 1 L = 1000 ml | 1 dz = 12 un
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Criar Unidade</Button>
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

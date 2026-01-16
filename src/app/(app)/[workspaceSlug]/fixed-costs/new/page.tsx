import Link from "next/link";
import { redirect } from "next/navigation";
import { createFixedCost } from "@/actions/fixed-costs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";

interface NewFixedCostPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function NewFixedCostPage({ params }: NewFixedCostPageProps) {
  const { workspaceSlug } = await params;

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await createFixedCost(workspaceSlug, formData);
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
          <CardTitle>Novo Custo Fixo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Aluguel, Energia, Internet"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detalhes sobre este custo"
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
                  placeholder="0,00"
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
                defaultChecked
                className="rounded"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Custo ativo
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Criar Custo Fixo</Button>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/fixed-costs`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupplier } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";

interface NewSupplierPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function NewSupplierPage({ params }: NewSupplierPageProps) {
  const { workspaceSlug } = await params;

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await createSupplier(workspaceSlug, formData);
    if (result.success) {
      redirect(`/${workspaceSlug}/suppliers`);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/suppliers`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para fornecedores
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Novo Fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Distribuidora ABC"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="contato@fornecedor.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                name="address"
                placeholder="Rua, número, bairro, cidade - UF"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Anotações sobre o fornecedor"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Criar Fornecedor</Button>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/suppliers`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

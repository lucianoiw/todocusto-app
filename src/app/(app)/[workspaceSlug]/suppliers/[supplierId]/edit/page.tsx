import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSupplier, updateSupplier } from "@/actions/suppliers";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";
import { DeleteSupplierButton } from "./delete-button";

interface EditSupplierPageProps {
  params: Promise<{ workspaceSlug: string; supplierId: string }>;
}

export default async function EditSupplierPage({ params }: EditSupplierPageProps) {
  const { workspaceSlug, supplierId } = await params;
  const supplier = await getSupplier(workspaceSlug, supplierId);

  if (!supplier) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateSupplier(workspaceSlug, supplierId, formData);
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
          <CardTitle>Editar Fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={supplier.name}
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
                  defaultValue={supplier.phone || ""}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={supplier.email || ""}
                  placeholder="contato@fornecedor.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                name="address"
                defaultValue={supplier.address || ""}
                placeholder="Rua, número, bairro, cidade - UF"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={supplier.notes || ""}
                placeholder="Anotações sobre o fornecedor"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <SubmitButton loadingText="Salvando...">Salvar Alterações</SubmitButton>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/suppliers`}>Cancelar</Link>
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-medium text-red-600 mb-2">Zona de perigo</h3>
            <DeleteSupplierButton
              workspaceSlug={workspaceSlug}
              supplierId={supplierId}
              supplierName={supplier.name}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

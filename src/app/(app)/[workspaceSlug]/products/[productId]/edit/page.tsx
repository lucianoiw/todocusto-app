import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getProduct, updateProduct, deleteProduct } from "@/actions/products";
import { getCategories } from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconArrowLeft } from "@tabler/icons-react";
import { DeleteProductButton } from "./delete-button";

interface EditProductPageProps {
  params: Promise<{ workspaceSlug: string; productId: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { workspaceSlug, productId } = await params;

  const [product, categories] = await Promise.all([
    getProduct(workspaceSlug, productId),
    getCategories(workspaceSlug, "product"),
  ]);

  if (!product) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await updateProduct(workspaceSlug, productId, formData);
    if (result.success) {
      redirect(`/${workspaceSlug}/products/${productId}`);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/products/${productId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para {product.name}
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={product.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={product.description || ""}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria (opcional)</Label>
              <Select name="categoryId" defaultValue={product.categoryId || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                name="active"
                value="true"
                defaultChecked={product.active}
                className="rounded"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Produto ativo
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Salvar Alterações</Button>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/products/${productId}`}>Cancelar</Link>
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-medium text-red-600 mb-2">Zona de perigo</h3>
            <DeleteProductButton
              workspaceSlug={workspaceSlug}
              productId={productId}
              productName={product.name}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

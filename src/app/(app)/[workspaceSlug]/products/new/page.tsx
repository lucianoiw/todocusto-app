import Link from "next/link";
import { redirect } from "next/navigation";
import { getCategories } from "@/actions/categories";
import { createProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconArrowLeft } from "@tabler/icons-react";

interface NewProductPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function NewProductPage({ params }: NewProductPageProps) {
  const { workspaceSlug } = await params;
  const categories = await getCategories(workspaceSlug, "product");

  async function handleSubmit(formData: FormData) {
    "use server";
    const result = await createProduct(workspaceSlug, formData);
    if (result.success && result.id) {
      redirect(`/${workspaceSlug}/products/${result.id}`);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${workspaceSlug}/products`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para produtos
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Novo Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: X-Burguer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Uma breve descrição do produto"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria (opcional)</Label>
              <Select name="categoryId">
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
                defaultChecked
                className="rounded"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Produto ativo
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">Criar Produto</Button>
              <Button variant="outline" asChild>
                <Link href={`/${workspaceSlug}/products`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

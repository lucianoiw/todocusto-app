"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "@/components/category-select";
import { IconLoader2 } from "@tabler/icons-react";
import { SizeGroupSelector } from "./size-group-selector";
import { ProductSwitches } from "./product-switches";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface SizeGroup {
  id: string;
  name: string;
  options: { name: string }[];
}

interface ProductFormProps {
  workspaceSlug: string;
  categories: Category[];
  sizeGroups: SizeGroup[];
}

export function ProductForm({ workspaceSlug, categories, sizeGroups }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await createProduct(workspaceSlug, formData);
      if (result.success && result.id) {
        router.push(`/${workspaceSlug}/products/${result.id}`);
      } else if (result.error) {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
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
        <Label>Categoria (opcional)</Label>
        <CategorySelect
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
        />
      </div>

      <SizeGroupSelector
        workspaceSlug={workspaceSlug}
        sizeGroups={sizeGroups}
      />

      <ProductSwitches />

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            "Criar Produto"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${workspaceSlug}/products`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProduct } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CategorySelect } from "@/components/category-select";
import { IconLoader2 } from "@tabler/icons-react";
import { SizeGroupSelector } from "../../new/size-group-selector";
import { ProductSwitches } from "../../new/product-switches";

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

interface Product {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  sizeGroupId: string | null;
  availableForSale: boolean;
  active: boolean;
}

interface ProductEditFormProps {
  workspaceSlug: string;
  productId: string;
  product: Product;
  categories: Category[];
  sizeGroups: SizeGroup[];
}

export function ProductEditForm({
  workspaceSlug,
  productId,
  product,
  categories,
  sizeGroups,
}: ProductEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(product.categoryId);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await updateProduct(workspaceSlug, productId, formData);
      if (result.success) {
        router.push(`/${workspaceSlug}/products/${productId}`);
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
        defaultValue={product.sizeGroupId || undefined}
      />

      <ProductSwitches
        defaultAvailableForSale={product.availableForSale}
        defaultActive={product.active}
      />

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Alterações"
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${workspaceSlug}/products/${productId}`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

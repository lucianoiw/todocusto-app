import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@/actions/products";
import { getCategories } from "@/actions/categories";
import { getSizeGroups } from "@/actions/sizes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";
import { DeleteProductButton } from "./delete-button";
import { ProductEditForm } from "./product-edit-form";

interface EditProductPageProps {
  params: Promise<{ workspaceSlug: string; productId: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { workspaceSlug, productId } = await params;

  const [product, categories, sizeGroups] = await Promise.all([
    getProduct(workspaceSlug, productId),
    getCategories(workspaceSlug, "product"),
    getSizeGroups(workspaceSlug),
  ]);

  if (!product) {
    notFound();
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
          <ProductEditForm
            workspaceSlug={workspaceSlug}
            productId={productId}
            product={product}
            categories={categories}
            sizeGroups={sizeGroups}
          />

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

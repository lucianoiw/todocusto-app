import Link from "next/link";
import { getCategories } from "@/actions/categories";
import { getSizeGroups } from "@/actions/sizes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconArrowLeft } from "@tabler/icons-react";
import { ProductForm } from "./product-form";

interface NewProductPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function NewProductPage({ params }: NewProductPageProps) {
  const { workspaceSlug } = await params;
  const [categories, sizeGroups] = await Promise.all([
    getCategories(workspaceSlug, "product"),
    getSizeGroups(workspaceSlug),
  ]);

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
          <ProductForm
            workspaceSlug={workspaceSlug}
            categories={categories}
            sizeGroups={sizeGroups}
          />
        </CardContent>
      </Card>
    </div>
  );
}

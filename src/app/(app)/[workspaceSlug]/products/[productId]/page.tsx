import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProductComposition } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconArrowLeft, IconPencil, IconPlus, IconResize } from "@tabler/icons-react";
import { ProductCompositionSection } from "./composition-section";

interface ProductDetailPageProps {
  params: Promise<{ workspaceSlug: string; productId: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { workspaceSlug, productId } = await params;
  const product = await getProduct(workspaceSlug, productId);

  if (!product) {
    notFound();
  }

  const composition = await getProductComposition(productId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/${workspaceSlug}/products`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para produtos
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${workspaceSlug}/products/${productId}/edit`}>
              <IconPencil />
              Editar
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/${workspaceSlug}/products/new`}>
              <IconPlus />
              Novo Produto
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{product.name}</h1>
                  {!product.active && (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
                {product.description && (
                  <p className="text-muted-foreground mt-1">{product.description}</p>
                )}
                {product.categoryName && (
                  <Badge variant="secondary" className="mt-3">
                    {product.categoryName}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {product.sizeGroupId ? "Custo base (referencia)" : "Custo base"}
                </div>
                <div className="text-2xl font-bold">
                  R$ {parseFloat(product.baseCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {product.sizeGroupName && (
                  <Badge variant="outline" className="mt-2">
                    <IconResize className="w-3 h-3 mr-1" />
                    {product.sizeGroupName}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Size Options */}
        {product.sizeOptions && product.sizeOptions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <IconResize className="w-5 h-5" />
                Custos por Tamanho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure a composicao para o tamanho de referencia. Os outros tamanhos terao o custo calculado automaticamente pelo multiplicador.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tamanho</TableHead>
                    <TableHead className="text-right">Multiplicador</TableHead>
                    <TableHead className="text-right">Custo Calculado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.sizeOptions.map((option) => (
                    <TableRow key={option.id}>
                      <TableCell className="font-medium">
                        {option.name}
                        {option.isReference && (
                          <Badge variant="secondary" className="ml-2">
                            Referencia
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(option.multiplier).toFixed(2)}x
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {parseFloat(option.calculatedCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Composition */}
        <ProductCompositionSection
          workspaceSlug={workspaceSlug}
          productId={productId}
          composition={composition}
          referenceSizeName={product.sizeOptions?.find(o => o.isReference)?.name}
        />
      </div>
    </div>
  );
}

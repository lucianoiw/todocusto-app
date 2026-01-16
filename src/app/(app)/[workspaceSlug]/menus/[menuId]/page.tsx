import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMenu,
  getMenuProducts,
  getMenuFees,
  getWorkspaceFixedCostsTotal,
} from "@/actions/menus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconArrowLeft, IconPencil } from "@tabler/icons-react";
import { MenuProductsSection } from "./products-section";
import { MenuFeesSection } from "./fees-section";
import { FixedCostsSection } from "./fixed-costs-section";

interface MenuDetailPageProps {
  params: Promise<{ workspaceSlug: string; menuId: string }>;
}

export default async function MenuDetailPage({ params }: MenuDetailPageProps) {
  const { workspaceSlug, menuId } = await params;
  const menu = await getMenu(workspaceSlug, menuId);

  if (!menu) {
    notFound();
  }

  const products = await getMenuProducts(menuId);
  const fees = await getMenuFees(menuId);
  const fixedCostsData = await getWorkspaceFixedCostsTotal(workspaceSlug);

  // Calculate totals
  const totalRevenue = products.reduce((sum, p) => sum + parseFloat(p.salePrice), 0);
  const totalCost = products.reduce((sum, p) => sum + parseFloat(p.totalCost), 0);
  const totalMargin = products.reduce((sum, p) => sum + parseFloat(p.marginValue), 0);
  const avgMarginPercentage = products.length > 0
    ? products.reduce((sum, p) => sum + parseFloat(p.marginPercentage), 0) / products.length
    : 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/${workspaceSlug}/menus`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-1" />
          Voltar para cardápios
        </Link>
        <Button variant="outline" asChild>
          <Link href={`/${workspaceSlug}/menus/${menuId}/edit`}>
            <IconPencil className="w-4 h-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{menu.name}</h1>
                  {!menu.active && (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
                {menu.description && (
                  <p className="text-muted-foreground mt-1">{menu.description}</p>
                )}
              </div>
              {products.length > 0 && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Margem média</div>
                  <div className={`text-2xl font-bold ${avgMarginPercentage >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {avgMarginPercentage.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {products.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="text-sm text-muted-foreground">Produtos</div>
                <div className="text-xl font-bold">{products.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-sm text-muted-foreground">Receita total</div>
                <div className="text-xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-sm text-muted-foreground">Custo total</div>
                <div className="text-xl font-bold">R$ {totalCost.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="text-sm text-muted-foreground">Lucro total</div>
                <div className={`text-xl font-bold ${totalMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                  R$ {totalMargin.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Fees Section */}
        <MenuFeesSection
          workspaceSlug={workspaceSlug}
          menuId={menuId}
          fees={fees}
        />

        {/* Fixed Costs Section */}
        <FixedCostsSection
          workspaceSlug={workspaceSlug}
          menuId={menuId}
          totalMonthlyFixedCost={fixedCostsData.total}
          fixedCostCount={fixedCostsData.count}
          apportionmentType={menu.apportionmentType}
          apportionmentValue={menu.apportionmentValue}
          productCount={products.length}
        />

        {/* Products Section */}
        <MenuProductsSection
          workspaceSlug={workspaceSlug}
          menuId={menuId}
          products={products}
          fees={fees}
          apportionmentType={menu.apportionmentType}
          apportionmentValue={menu.apportionmentValue}
          totalMonthlyFixedCost={fixedCostsData.total}
        />
      </div>
    </div>
  );
}

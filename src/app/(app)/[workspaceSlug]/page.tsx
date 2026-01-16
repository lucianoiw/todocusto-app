import { getWorkspaceBySlug } from "@/actions/workspace";
import {
  getDashboardMetrics,
  getRecentEntries,
  getTopCostProducts,
  getTopCostRecipes,
} from "@/actions/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IconBox,
  IconToolsKitchen2,
  IconPackage,
  IconReceipt,
  IconTruck,
  IconCoin,
  IconArrowRight,
  IconShoppingCart,
} from "@tabler/icons-react";
import Link from "next/link";

interface WorkspacePageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceSlug } = await params;

  const [workspace, metrics, recentEntries, topProducts, topRecipes] = await Promise.all([
    getWorkspaceBySlug(workspaceSlug),
    getDashboardMetrics(workspaceSlug),
    getRecentEntries(workspaceSlug, 5),
    getTopCostProducts(workspaceSlug, 5),
    getTopCostRecipes(workspaceSlug, 5),
  ]);

  const statCards = [
    {
      title: "Insumos",
      value: metrics?.ingredients ?? 0,
      icon: IconBox,
      href: `/${workspaceSlug}/ingredients`,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Receitas",
      value: metrics?.recipes ?? 0,
      icon: IconToolsKitchen2,
      href: `/${workspaceSlug}/recipes`,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Produtos",
      value: metrics?.products ?? 0,
      icon: IconPackage,
      href: `/${workspaceSlug}/products`,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Cardápios",
      value: metrics?.menus ?? 0,
      icon: IconReceipt,
      href: `/${workspaceSlug}/menus`,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Fornecedores",
      value: metrics?.suppliers ?? 0,
      icon: IconTruck,
      href: `/${workspaceSlug}/suppliers`,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Custos Fixos/mês",
      value: `R$ ${parseFloat(metrics?.monthlyFixedCosts ?? "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: IconCoin,
      href: `/${workspaceSlug}/fixed-costs`,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/10",
      isMonetary: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{workspace?.name}</h1>
        {workspace?.description && (
          <p className="text-muted-foreground mt-1">{workspace.description}</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.href} href={stat.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.isMonetary ? "text-base" : ""}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Entries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <IconShoppingCart className="h-5 w-5" />
                Últimas Compras
              </CardTitle>
              <CardDescription>Entradas mais recentes de insumos</CardDescription>
            </div>
            <Link
              href={`/${workspaceSlug}/ingredients`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver todas
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                Nenhuma compra registrada ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/${workspaceSlug}/ingredients/${entry.ingredientId}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{entry.ingredientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.date + "T00:00:00").toLocaleDateString("pt-BR")}
                        {entry.supplierName && ` • ${entry.supplierName}`}
                      </p>
                    </div>
                    <p className="font-medium text-right ml-4">
                      R$ {parseFloat(entry.totalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products by Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <IconPackage className="h-5 w-5" />
                Produtos por Custo
              </CardTitle>
              <CardDescription>Produtos com maior custo base</CardDescription>
            </div>
            <Link
              href={`/${workspaceSlug}/products`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver todos
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                Nenhum produto cadastrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((prod) => (
                  <Link
                    key={prod.id}
                    href={`/${workspaceSlug}/products/${prod.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{prod.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {prod.active ? "Ativo" : "Inativo"}
                      </p>
                    </div>
                    <p className="font-mono font-medium text-right ml-4">
                      R$ {parseFloat(prod.baseCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Recipes by Cost */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <IconToolsKitchen2 className="h-5 w-5" />
                Receitas por Custo
              </CardTitle>
              <CardDescription>Receitas com maior custo total</CardDescription>
            </div>
            <Link
              href={`/${workspaceSlug}/recipes`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver todas
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {topRecipes.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                Nenhuma receita cadastrada ainda.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {topRecipes.map((rec) => (
                  <Link
                    key={rec.id}
                    href={`/${workspaceSlug}/recipes/${rec.id}`}
                    className="flex items-center justify-between py-3 px-4 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{rec.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Porção: R$ {parseFloat(rec.costPerPortion).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                      </p>
                    </div>
                    <p className="font-mono font-medium text-right ml-4">
                      R$ {parseFloat(rec.totalCost).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

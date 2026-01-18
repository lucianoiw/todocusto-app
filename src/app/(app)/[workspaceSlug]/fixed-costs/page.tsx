import Link from "next/link";
import { getFixedCosts } from "@/actions/fixed-costs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconPlus, IconReceipt } from "@tabler/icons-react";
import { FixedCostsTable } from "./fixed-costs-table";
import { FixedCostsFilters } from "./fixed-costs-filters";
import { FixedCostsPagination } from "./fixed-costs-pagination";

interface FixedCostsPageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function FixedCostsPage({ params, searchParams }: FixedCostsPageProps) {
  const { workspaceSlug } = await params;
  const search = await searchParams;

  const result = await getFixedCosts(workspaceSlug, {
    search: search.search,
    status: search.status as "active" | "inactive" | undefined,
    page: search.page ? parseInt(search.page) : 1,
    perPage: 15,
  });

  const { costs, activeTotal, pagination } = result;
  const hasFilters = search.search || search.status;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Custos Fixos</h1>
          <p className="text-muted-foreground">
            Gerencie os custos fixos do seu negócio (aluguel, luz, internet, etc)
          </p>
        </div>
        <Button asChild>
          <Link href={`/${workspaceSlug}/fixed-costs/new`}>
            <IconPlus className="w-4 h-4 mr-2" />
            Novo Custo Fixo
          </Link>
        </Button>
      </div>

      {costs.length > 0 && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total mensal (ativos na página)</span>
              <span className="text-2xl font-bold">R$ {activeTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <FixedCostsFilters workspaceSlug={workspaceSlug} />
      </div>

      {costs.length === 0 && !hasFilters ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconReceipt className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Nenhum custo fixo cadastrado</EmptyTitle>
                <EmptyDescription>
                  Custos fixos são despesas mensais do seu negócio: aluguel, energia,
                  internet, salários, contador, etc. Esses valores serão rateados
                  automaticamente no custo dos produtos dos seus cardápios.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href={`/${workspaceSlug}/fixed-costs/new`}>
                    <IconPlus className="w-4 h-4" />
                    Cadastrar primeiro custo fixo
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : costs.length === 0 && hasFilters ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nenhum custo fixo encontrado</EmptyTitle>
                <EmptyDescription>
                  Tente ajustar os filtros para encontrar o que procura.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <FixedCostsTable
              workspaceSlug={workspaceSlug}
              costs={costs}
            />
            <FixedCostsPagination
              workspaceSlug={workspaceSlug}
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              perPage={pagination.perPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface FixedCostsPaginationProps {
  workspaceSlug: string;
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
}

export function FixedCostsPagination({
  workspaceSlug,
  page,
  totalPages,
  total,
  perPage,
}: FixedCostsPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      params.set("page", newPage.toString());
    } else {
      params.delete("page");
    }
    startTransition(() => {
      router.push(`/${workspaceSlug}/fixed-costs?${params.toString()}`);
    });
  };

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      <span className="text-sm text-muted-foreground">
        Mostrando {start}-{end} de {total} custos fixos
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1 || isPending}
        >
          <IconChevronLeft className="w-4 h-4" />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages || isPending}
        >
          Próxima
          <IconChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

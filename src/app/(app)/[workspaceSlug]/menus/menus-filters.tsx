"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition, useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconSearch, IconX } from "@tabler/icons-react";

interface MenusFiltersProps {
  workspaceSlug: string;
}

export function MenusFilters({ workspaceSlug }: MenusFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const [searchValue, setSearchValue] = useState(search);

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      params.delete("page");

      startTransition(() => {
        router.push(`/${workspaceSlug}/menus?${params.toString()}`);
      });
    },
    [router, searchParams, workspaceSlug]
  );

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFilters({ search: value });
    }, 300);
  };

  const clearFilters = () => {
    setSearchValue("");
    startTransition(() => {
      router.push(`/${workspaceSlug}/menus`);
    });
  };

  const hasActiveFilters = search || status;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar cardápio..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-10 pl-9 pr-3 w-64 rounded-md border border-input text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <select
        value={status}
        onChange={(e) => updateFilters({ status: e.target.value })}
        className="h-10 px-3 rounded-md border border-input text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="">Todos os status</option>
        <option value="active">Ativos</option>
        <option value="inactive">Inativos</option>
      </select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <IconX className="w-4 h-4 mr-1" />
          Limpar
        </Button>
      )}

      {isPending && (
        <span className="text-sm text-muted-foreground">Carregando...</span>
      )}
    </div>
  );
}

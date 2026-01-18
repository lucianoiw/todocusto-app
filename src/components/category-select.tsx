"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IconChevronDown, IconSearch, IconX } from "@tabler/icons-react";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface CategorySelectProps {
  categories: Category[];
  value: string | null;
  onChange: (value: string | null) => void;
  name?: string;
  placeholder?: string;
}

export function CategorySelect({
  categories,
  value,
  onChange,
  name = "categoryId",
  placeholder = "Selecione",
}: CategorySelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedCategory = categories.find((c) => c.id === value);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const searchLower = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(searchLower));
  }, [categories, search]);

  return (
    <>
      <input type="hidden" name={name} value={value || ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selectedCategory ? (
              <div className="flex items-center gap-2">
                {selectedCategory.color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                )}
                <span className="truncate">{selectedCategory.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              {selectedCategory && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  className="hover:bg-accent rounded p-0.5"
                >
                  <IconX className="h-3 w-3" />
                </span>
              )}
              <IconChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 px-2">
              <IconSearch className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma categoria encontrada
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                  onClick={() => {
                    onChange(cat.id);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  {cat.color && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                  <span>{cat.name}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

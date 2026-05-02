import { useState, useRef } from "react";
import { EndpointCategory } from "@/data/api-endpoints";
import { EndpointSection } from "./EndpointSection";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface CategorySectionProps {
  category: EndpointCategory;
  endpointsPerPage?: number;
}

export function CategorySection({ category, endpointsPerPage = 3 }: CategorySectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const sectionRef = useRef<HTMLDivElement>(null);

  const totalEndpoints = category.endpoints.length;
  const totalPages = Math.ceil(totalEndpoints / endpointsPerPage);
  const startIndex = (currentPage - 1) * endpointsPerPage;
  const endIndex = Math.min(startIndex + endpointsPerPage, totalEndpoints);
  const paginatedEndpoints = category.endpoints.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll suave para o topo da categoria
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div ref={sectionRef} id={category.id} className="space-y-6 scroll-mt-20">
      {/* Header da categoria */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-foreground">{category.name}</h2>
          <Badge variant="secondary" className="font-mono text-xs">
            {totalEndpoints} endpoint{totalEndpoints !== 1 ? "s" : ""}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
        
        {/* Indicador de página atual */}
        {totalPages > 1 && (
          <p className="text-xs text-muted-foreground mt-2">
            Exibindo {startIndex + 1}-{endIndex} de {totalEndpoints}
          </p>
        )}
      </div>

      {/* Endpoints paginados */}
      {paginatedEndpoints.map((endpoint) => (
        <EndpointSection key={endpoint.id} endpoint={endpoint} />
      ))}

      {/* Paginação (apenas se houver mais de 1 página) */}
      {totalPages > 1 && (
        <div className="pt-4 border-t border-border">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {getVisiblePages().map((page, index) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

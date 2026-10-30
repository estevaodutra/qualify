import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image, ExternalLink, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const globalAssets = [
  {
    id: "asset-logo-dark",
    name: "Logo Qualify Oficial (Dark Mode)",
    type: "Imagem PNG",
    size: "45 KB",
    url: "/brand/qualify-logo.png",
  },
  {
    id: "asset-logo-criafy",
    name: "Criafy Brandmark & Ícone",
    type: "Vetor SVG",
    size: "18 KB",
    url: "/brand/criafy-icon.svg",
  },
  {
    id: "asset-fallback-cover",
    name: "Capa Padrão de Campanhas",
    type: "Imagem WebP",
    size: "120 KB",
    url: "/brand/default-campaign.webp",
  },
];

export default function AdminGlobalAssets() {
  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Assets Globais da Marca</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Arquivos visuais e mídias homologadas servidos globalmente pela CDN da plataforma.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {globalAssets.map((asset) => (
          <Card key={asset.id} className="hover:border-primary/40 transition-colors">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" />
                  {asset.name}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">{asset.type} • {asset.size}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="p-2 bg-muted/40 rounded border font-mono text-[11px] text-muted-foreground truncate">
                {asset.url}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

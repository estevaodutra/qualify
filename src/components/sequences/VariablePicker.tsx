import { useState } from "react";
import { Braces, Type, Hash, AlignLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  isGroup?: boolean;
}

export function VariablePicker({ onSelect, isGroup }: VariablePickerProps) {
  const [open, setOpen] = useState(false);

  const variables = isGroup ? [
    {
      category: "Campos do grupo",
      items: [
        { label: "Nome", value: "{{name}}", icon: Type },
        { label: "Telefone", value: "{{phone}}", icon: Hash },
        { label: "Grupo", value: "{{group}}", icon: AlignLeft },
      ]
    }
  ] : [
    {
      category: "Campos do lead",
      items: [
        { label: "Nome do lead", value: "{nome}", icon: Type },
        { label: "Primeiro nome do lead", value: "{primeiro_nome}", icon: Type },
        { label: "Telefone do lead", value: "{telefone}", icon: Hash },
        { label: "Email do lead", value: "{email}", icon: AlignLeft },
        { label: "CPF do lead", value: "{cpf}", icon: Hash },
        { label: "CEP do lead", value: "{cep}", icon: Hash },
        { label: "Endereço do lead", value: "{endereco}", icon: AlignLeft },
        { label: "Bairro do lead", value: "{bairro}", icon: AlignLeft },
        { label: "Número de residência do lead", value: "{numero}", icon: Hash },
        { label: "Cidade do lead", value: "{cidade}", icon: AlignLeft },
        { label: "Complemento do lead", value: "{complemento}", icon: AlignLeft },
      ]
    }
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white border-0 transition-colors">
                <Braces className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Inserir variável</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-[340px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Pesquisar..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nenhuma variável encontrada.</CommandEmpty>
            {variables.map((group) => (
              <CommandGroup key={group.category} heading={group.category}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.value}
                      value={item.label}
                      onSelect={() => {
                        onSelect(item.value);
                        setOpen(false);
                      }}
                      className="cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">{item.value}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

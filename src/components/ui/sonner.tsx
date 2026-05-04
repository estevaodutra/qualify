import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast font-['Inter'] text-sm border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
          success: "border-l-4 border-[#22DD4F] bg-[#0E1329]/95",
          error: "border-l-4 border-[#FF7A7A] bg-[#0E1329]/95",
          warning: "border-l-4 border-[#FFB432] bg-[#0E1329]/95",
          info: "border-l-4 border-[#7B8FFF] bg-[#0E1329]/95",
          title: "font-semibold text-white",
          description: "text-white/60",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

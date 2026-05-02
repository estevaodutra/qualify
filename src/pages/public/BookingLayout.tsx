import { PropsWithChildren } from "react";
import { PublicCalendar } from "@/hooks/usePublicBooking";

export default function BookingLayout({ calendar, children }: PropsWithChildren<{ calendar: PublicCalendar | null | undefined }>) {
  const primary = (calendar?.branding as any)?.primary_color || calendar?.color || "#3b82f6";
  const bg = (calendar?.branding as any)?.background_color || "#f9fafb";
  const companyName = (calendar?.branding as any)?.company_name || "";
  const logo = (calendar?.branding as any)?.logo_url;

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="max-w-3xl mx-auto p-6">
        <header className="flex items-center gap-3 mb-6">
          {logo && <img src={logo} alt="" className="h-10 w-auto" />}
          {companyName && <span className="font-semibold text-lg">{companyName}</span>}
        </header>
        <div
          className="bg-card text-card-foreground rounded-xl shadow-sm border p-6"
          style={{ borderColor: primary + "33" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

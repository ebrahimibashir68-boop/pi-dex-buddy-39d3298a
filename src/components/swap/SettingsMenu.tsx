import { useEffect, useState } from "react";
import {
  Settings,
  Monitor,
  Smartphone,
  Bell,
  Globe,
  Moon,
  Sun,
  Shield,
  Info,
  Zap,
  RefreshCw,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const STORAGE_KEY = "piswap:settings";

type Settings = {
  desktopSite: boolean;
  darkMode: boolean;
  notifications: boolean;
  expertMode: boolean;
  autoRefresh: boolean;
  analytics: boolean;
  language: string;
};

const defaults: Settings = {
  desktopSite: false,
  darkMode: true,
  notifications: true,
  expertMode: false,
  autoRefresh: true,
  analytics: true,
  language: "en",
};

function load(): Settings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

function applyDesktopSite(on: boolean) {
  const vp = document.querySelector('meta[name="viewport"]');
  if (!vp) return;
  vp.setAttribute(
    "content",
    on
      ? "width=1280"
      : "width=device-width, initial-scale=1, viewport-fit=cover",
  );
}

function applyDarkMode(on: boolean) {
  document.documentElement.classList.toggle("dark", on);
  document.documentElement.classList.toggle("light", !on);
}

export function SettingsMenu() {
  const [s, setS] = useState<Settings>(defaults);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loaded = load();
    setS(loaded);
    applyDesktopSite(loaded.desktopSite);
    applyDarkMode(loaded.darkMode);
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...s, [key]: value };
    setS(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (key === "desktopSite") applyDesktopSite(value as boolean);
    if (key === "darkMode") applyDarkMode(value as boolean);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Settings"
          className="size-9 grid place-items-center rounded-full border border-border bg-secondary/50 hover:bg-secondary transition-colors"
        >
          <Settings className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border">
          <div className="font-display font-semibold">Settings</div>
          <div className="text-xs text-muted-foreground">
            Personalize your PiSwap experience
          </div>
        </div>

        <Section title="Display">
          <Row
            icon={s.desktopSite ? <Monitor className="size-4" /> : <Smartphone className="size-4" />}
            label="Desktop site"
            hint="Force desktop layout on mobile"
          >
            <Switch
              checked={s.desktopSite}
              onCheckedChange={(v) => update("desktopSite", v)}
            />
          </Row>
          <Row
            icon={s.darkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
            label="Dark mode"
          >
            <Switch
              checked={s.darkMode}
              onCheckedChange={(v) => update("darkMode", v)}
            />
          </Row>
          <Row icon={<Globe className="size-4" />} label="Language">
            <select
              value={s.language}
              onChange={(e) => update("language", e.target.value)}
              className="bg-secondary/60 border border-border rounded-md text-sm px-2 py-1 outline-none"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="zh">中文</option>
              <option value="ko">한국어</option>
              <option value="ar">العربية</option>
            </select>
          </Row>
        </Section>

        <Section title="Application">
          <Row
            icon={<Bell className="size-4" />}
            label="Notifications"
            hint="Trade confirmations & alerts"
          >
            <Switch
              checked={s.notifications}
              onCheckedChange={(v) => update("notifications", v)}
            />
          </Row>
          <Row
            icon={<RefreshCw className="size-4" />}
            label="Auto-refresh prices"
          >
            <Switch
              checked={s.autoRefresh}
              onCheckedChange={(v) => update("autoRefresh", v)}
            />
          </Row>
          <Row
            icon={<Zap className="size-4" />}
            label="Expert mode"
            hint="Skip confirms, allow high slippage"
          >
            <Switch
              checked={s.expertMode}
              onCheckedChange={(v) => {
                if (v) toast.warning("Expert mode enabled — trade carefully");
                update("expertMode", v);
              }}
            />
          </Row>
          <Row
            icon={<Shield className="size-4" />}
            label="Share analytics"
            hint="Anonymous usage data"
          >
            <Switch
              checked={s.analytics}
              onCheckedChange={(v) => update("analytics", v)}
            />
          </Row>
        </Section>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Info className="size-3.5" />
            PiSwap v1.0.0
          </span>
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setS(defaults);
              applyDesktopSite(false);
              applyDarkMode(true);
              toast.success("Settings reset");
            }}
            className="hover:text-foreground transition-colors"
          >
            Reset
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-2 py-2 border-b border-border last:border-0">
      <div className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary/40 transition-colors">
      <div className="size-8 grid place-items-center rounded-md bg-secondary/60 text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar } from "./Avatar";
import { Bell, Lock, Smartphone, Camera, Save, Sun, Moon, Keyboard } from "lucide-react";
import type { UIUser } from "@/lib/adapters";
import { updateProfile } from "@/lib/api/auth";
import { toast } from "sonner";
import { isDarkMode, toggleDarkMode } from "@/lib/dark-mode";

const SHORTCUTS = [
  { keys: "Ctrl/⌘ + K", action: "Toggle search" },
  { keys: "Esc", action: "Close dialog / Back to list" },
  { keys: "Enter", action: "Send message" },
  { keys: "Shift + Enter", action: "New line" },
  { keys: "↑ / ↓", action: "Navigate conversations" },
];

export function SettingsDialog({
  open,
  onOpenChange,
  user,
  onLogout,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UIUser | null;
  onLogout: () => void;
  onSaved?: () => Promise<void> | void;
}) {
  const [bio, setBio] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [darkTick, setDarkTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    setBio(user?.about ?? "");
    setStatusMessage("");
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [open, user?.about, user?.id]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const preview = URL.createObjectURL(avatarFile);
    setAvatarPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [avatarFile]);

  async function handleSave() {
    setSaving(true);
    try {
      const form = new FormData();
      form.append("bio", bio);
      form.append("status_message", statusMessage);
      if (avatarFile) {
        form.append("avatar", avatarFile);
      }
      await updateProfile(form);
      await onSaved?.();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your Signal profile and preferences.</DialogDescription>
        </DialogHeader>

        {/* Profile */}
        <SectionHeader icon={<UserIcon />} label="Profile" />

        <div className="flex items-center gap-3 rounded-xl bg-signal-bg p-3">
          <Avatar
            initials={user?.initials ?? "??"}
            color={user?.avatarColor ?? "#3A76F0"}
            size={56}
            online={user?.online}
            imageUrl={avatarPreview ?? user?.avatarUrl ?? null}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-signal-text">{user?.name ?? "Unknown user"}</div>
            <div className="truncate text-xs text-signal-muted">{user?.phone ?? ""}</div>
            {user?.about && <div className="mt-0.5 truncate text-xs text-signal-muted">{user.about}</div>}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-signal-border bg-signal-panel p-4">
          <label className="grid gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-signal-muted">Avatar</span>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-signal-border px-3 py-2 text-sm text-signal-text hover:bg-signal-hover">
              <Camera size={16} />
              <span>{avatarFile ? avatarFile.name : "Choose image"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
            </label>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-signal-muted">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-signal-border px-3 py-2 text-sm text-signal-text focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
              placeholder="Write a short bio"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-signal-muted">Status message</span>
            <input
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              className="w-full rounded-lg border border-signal-border px-3 py-2 text-sm text-signal-text focus:outline-none focus:ring-2 focus:ring-signal-accent/40"
              placeholder="What are you up to?"
            />
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-signal-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <Save size={16} />
            Save profile
          </button>
        </div>

        {/* General */}
        <SectionHeader icon={<SettingsIcon />} label="General" />

        <div className="grid gap-1 rounded-xl border border-signal-border bg-signal-panel">
          <SettingsRow
            icon={isDarkMode() ? Sun : Moon}
            label="Appearance"
            trailing={<span className="text-xs text-signal-muted">{isDarkMode() ? "Dark" : "Light"}</span>}
            onClick={() => { toggleDarkMode(); setDarkTick((t) => t + 1); toast(isDarkMode() ? "Switched to light mode" : "Switched to dark mode"); }}
          />
          <SettingsRow icon={Lock} label="Privacy" onClick={() => toast("Privacy settings coming soon")} />
          <SettingsRow icon={Bell} label="Notifications" onClick={() => toast("Notification settings coming soon")} />
          <SettingsRow icon={Smartphone} label="Linked Devices" onClick={() => toast("Linked devices coming soon")} />
        </div>

        {/* Shortcuts */}
        <SectionHeader icon={<Keyboard size={14} />} label="Shortcuts" />

        <div className="rounded-xl border border-signal-border bg-signal-panel p-3">
          <div className="grid gap-0.5 text-xs text-signal-muted">
            {SHORTCUTS.map((row) => (
              <div key={row.action} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-signal-hover">
                <span className="text-signal-text">{row.action}</span>
                <kbd className="rounded border border-signal-border bg-signal-bg px-1.5 py-0.5 font-mono text-[10px] text-signal-text">{row.keys}</kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button onClick={onLogout} className="mt-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">
          Log out
        </button>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mt-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-signal-muted">
      {icon}
      {label}
    </div>
  );
}

function SettingsRow({ icon: Icon, label, trailing, onClick }: { icon: any; label: string; trailing?: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-signal-text hover:bg-signal-hover">
      <Icon size={16} className="shrink-0 text-signal-muted" />
      <span className="flex-1">{label}</span>
      {trailing}
    </button>
  );
}

function UserIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

function SettingsIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
}

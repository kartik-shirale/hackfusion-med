"use client";

import { useEffect, useState } from "react";
import { getUserProfile, updateUserProfile } from "@/actions/profile.action";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MailIcon,
  PhoneIcon,
  CalendarIcon,
  ShoppingCartIcon,
  PackageCheckIcon,
  FileTextIcon,
  RefreshCwIcon,
  MessageSquareIcon,
  UploadIcon,
  IndianRupeeIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  LogOutIcon,
  ShieldIcon,
  Loader2Icon,
  ArrowRightIcon,
  SettingsIcon,
} from "lucide-react";

export default function ProfilePage() {
  const { signOut } = useClerk();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formMobile, setFormMobile] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await getUserProfile();
      if (result.success) {
        setData(result.data);
        setFormName(result.data?.fullName || "");
        setFormMobile(result.data?.mobile || "");
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateUserProfile({
      fullName: formName,
      mobile: formMobile,
    });
    if (result.success) {
      setData((prev: any) => ({
        ...prev,
        fullName: formName,
        mobile: formMobile,
      }));
      setEditing(false);
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center w-full">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin text-[#1A1A2F]" />
          <span className="text-sm">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  const stats = [
    { icon: ShoppingCartIcon, label: "Orders", value: data.stats.totalOrders },
    { icon: PackageCheckIcon, label: "Delivered", value: data.stats.deliveredOrders },
    { icon: FileTextIcon, label: "Prescriptions", value: data.stats.prescriptions },
    { icon: RefreshCwIcon, label: "Refills", value: data.stats.refillAlerts },
    { icon: MessageSquareIcon, label: "Chats", value: data.stats.chats },
    { icon: UploadIcon, label: "Files", value: data.stats.files },
  ];

  const prefs = data.preference;

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-3xl p-4 md:p-6 lg:p-8 space-y-3">
        {/* Profile Card */}
        <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/60 backdrop-blur-sm shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)]">
          {/* Banner */}
          <div className="relative h-28 md:h-32 bg-gradient-to-r from-indigo-400 via-purple-400 via-pink-400 to-amber-300">
            <button
              onClick={() => setEditing(!editing)}
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition-all hover:bg-white/40"
            >
              <PencilIcon className="size-3.5" />
            </button>
          </div>

          {/* Avatar + Info */}
          <div className="relative px-4 md:px-6 pb-5">
            <div className="-mt-10">
              <Avatar className="size-20 border-4 border-white shadow-md">
                <AvatarImage src={data.profile} />
                <AvatarFallback className="bg-[#1A1A2F]/5 text-[#1A1A2F] text-2xl font-bold">
                  {data.fullName?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name + Role area */}
            <div className="mt-3 flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
              <div className="min-w-0 flex-1">
                {editing ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Full Name"
                        className="rounded-full h-8 text-sm w-full md:w-56"
                      />
                      <Input
                        value={formMobile}
                        onChange={(e) => setFormMobile(e.target.value)}
                        placeholder="+91 XXXXXXXXXX"
                        className="rounded-full h-8 text-sm w-full md:w-40"
                      />
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="icon"
                          className="size-8 rounded-full bg-[#1A1A2F] hover:bg-[#1A1A2F]/90 text-white shrink-0"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? <Loader2Icon className="size-3 animate-spin" /> : <CheckIcon className="size-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="size-8 rounded-full shrink-0"
                          onClick={() => setEditing(false)}
                          disabled={saving}
                        >
                          <XIcon className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-bold">{data.fullName}</h1>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MailIcon className="size-3" />
                        {data.email}
                      </span>
                      {data.mobile && (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="size-3" />
                          {data.mobile}
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarIcon className="size-3" />
                      Joined {new Date(data.joinedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                    </span>
                  </>
                )}
              </div>

              {/* Current role */}
              {!editing && (
                <div className="shrink-0 md:text-right">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 md:justify-end">
                    Current role <ShieldIcon className="size-3" />
                  </span>
                  <Badge variant="outline" className="mt-1 rounded-full text-xs px-3">
                    {data.role}
                  </Badge>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!editing && (
              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-full gap-1.5 bg-[#1A1A2F] hover:bg-[#1A1A2F]/90 text-white"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full gap-1.5 border-white/60 bg-white/40 backdrop-blur-sm"
                  onClick={() => router.push("/chat/settings")}
                >
                  <SettingsIcon className="size-3" />
                  Settings
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/50 bg-white/60 backdrop-blur-sm p-3 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.6)]"
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-[#1A1A2F]/5">
                  <Icon className="size-3.5 text-[#1A1A2F]/60" />
                </div>
                <span className="text-lg font-bold leading-none">{stat.value}</span>
                <span className="text-[11px] text-muted-foreground">{stat.label}</span>
              </div>
            );
          })}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Total Spent */}
          <div className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/60 backdrop-blur-sm p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.6)]">
            <div>
              <p className="text-sm font-medium">Total Spent</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ₹{data.stats.totalSpent.toLocaleString("en-IN")} lifetime
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-[#1A1A2F]/5">
              <IndianRupeeIcon className="size-3.5 text-[#1A1A2F]/60" />
            </div>
          </div>

          {/* Notifications */}
          {prefs && (
            <div
              className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/60 backdrop-blur-sm p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.6)] cursor-pointer transition-all hover:shadow-md hover:bg-white/70"
              onClick={() => router.push("/chat/integrations")}
            >
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                  {prefs.notificationChannel || "Not configured"}
                </p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-full bg-[#1A1A2F]/5">
                <ArrowRightIcon className="size-3.5 text-[#1A1A2F]/60" />
              </div>
            </div>
          )}

          {/* Delivery Pref */}
          {prefs && (
            <div className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/60 backdrop-blur-sm p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.6)]">
              <div>
                <p className="text-sm font-medium">Delivery</p>
                <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                  {prefs.deliveryPreference || "Standard"}
                </p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-full bg-[#1A1A2F]/5">
                <PackageCheckIcon className="size-3.5 text-[#1A1A2F]/60" />
              </div>
            </div>
          )}
        </div>

        {/* Preferences tags */}
        {prefs && (
          <div className="flex items-center gap-2 flex-wrap rounded-2xl border border-white/50 bg-white/60 backdrop-blur-sm px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.6)]">
            <span className="text-xs font-medium text-muted-foreground mr-1">Preferences</span>
            {[
              { label: "Price", value: prefs.pricePreference || "Balanced" },
              { label: "Generic", value: prefs.genericAllowed ? "Allowed" : "No" },
              { label: "Auto-Refill", value: prefs.autoRefillConsent ? "On" : "Off" },
            ].map((item) => (
              <Badge
                key={item.label}
                variant="outline"
                className="rounded-full text-[11px] gap-1 px-3 py-1 font-normal border-white/60 bg-white/40"
              >
                {item.label}: <span className="font-medium capitalize">{item.value}</span>
              </Badge>
            ))}
            {prefs.preferredBrands?.length > 0 &&
              prefs.preferredBrands.map((brand: string) => (
                <Badge key={brand} variant="outline" className="rounded-full text-[11px] px-3 py-1 border-white/60 bg-white/40">{brand}</Badge>
              ))}
          </div>
        )}

        {/* Logout */}
        <div className="flex justify-center pt-2 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full gap-1.5 text-xs text-muted-foreground hover:text-rose-500"
            onClick={handleSignOut}
          >
            <LogOutIcon className="size-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}


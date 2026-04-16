import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import UserPedidosPanel from "./UserPedidosPanel";

type ProfileRow = {
  id: string;
  address: string | null;

  first_name: string | null;
  last_name: string | null;
  phone: string | null;

  country: string | null;
  company: string | null;

  address_line1: string | null; // SOLO calle
  address_line2: string | null; // Nº si viene (y piso/puerta si el user añade)

  postal_code: string | null;
  city: string | null;
  region: string | null;

  marketing_opt_in: boolean;

  is_admin: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

function formatDate(dt?: string | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

async function ensureGoogleMapsPlacesLoaded() {
  const w = window as any;
  if (w.google?.maps?.places) return true;

  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!key) return false;

  const existing = document.querySelector(
    'script[data-google-maps="1"]'
  ) as HTMLScriptElement | null;

  if (existing) {
    return await new Promise<boolean>((resolve) => {
      const started = Date.now();
      const t = setInterval(() => {
        const ww = window as any;
        if (ww.google?.maps?.places) {
          clearInterval(t);
          resolve(true);
        } else if (Date.now() - started > 8000) {
          clearInterval(t);
          resolve(false);
        }
      }, 150);
    });
  }

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=places&language=es&region=ES`;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-google-maps", "1");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar Google Maps JS"));
    document.head.appendChild(s);
  });

  return await new Promise<boolean>((resolve) => {
    const started = Date.now();
    const t = setInterval(() => {
      const ww = window as any;
      if (ww.google?.maps?.places) {
        clearInterval(t);
        resolve(true);
      } else if (Date.now() - started > 8000) {
        clearInterval(t);
        resolve(false);
      }
    }, 150);
  });
}

function splitStreetAndNumberFromLine1(line1: string | null | undefined) {
  const s = String(line1 ?? "").trim();
  if (!s) return { street: "", number: "" };

  const beforeComma = s.split(",")[0]?.trim() ?? s;

  const m = beforeComma.match(/^(.*?)(?:\s+(\d[\wºª\-\/]*))\s*$/);
  if (!m) return { street: beforeComma, number: "" };

  const street = (m[1] ?? "").trim();
  const number = (m[2] ?? "").trim();
  if (!street) return { street: beforeComma, number: "" };

  return { street, number };
}

type Tab = "profile" | "privacy" | "orders";

const UserProfile = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("profile");

  const [authEmail, setAuthEmail] = useState<string>("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ✅ Dirección (uncontrolled)
  const streetRef = useRef<HTMLInputElement | null>(null);
  const hydratedOnceRef = useRef(false);

  // ✅ flags + refs para NO perder el listener
  const addr2AutoFilledRef = useRef(false);
  const acRef = useRef<any>(null);
  const listenerRef = useRef<any>(null);

  // ✅ para controlar si el .pac-container está colapsado
  const pacHiddenRef = useRef(false);

  const setStreetValue = (val: string) => {
    if (streetRef.current) streetRef.current.value = val;
  };

  // ✅ util: colapsar / restaurar el dropdown (sin “quitar attribution”, solo ocultarlo cuando no toca)
  const hidePac = () => {
    pacHiddenRef.current = true;
    document.querySelectorAll<HTMLElement>(".pac-container").forEach((el) => {
      el.style.display = "none";
      el.style.height = "0";
      el.style.overflow = "hidden";
      el.style.boxShadow = "none";
      el.style.border = "0";
      el.style.pointerEvents = "none";
    });
  };

  const showPac = () => {
    pacHiddenRef.current = false;
    document.querySelectorAll<HTMLElement>(".pac-container").forEach((el) => {
      el.style.display = "";
      el.style.height = "";
      el.style.overflow = "";
      el.style.boxShadow = "";
      el.style.border = "";
      el.style.pointerEvents = "";
    });
  };

  // =========================
  // PRIVACIDAD: email + pass
  // =========================
  const [newEmail, setNewEmail] = useState("");
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const refreshAuthEmail = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) setAuthEmail(data.user?.email ?? "");
  };

  const requestEmailChange = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setPrivacyMsg("Escribe un email válido.");
      return;
    }

    setPrivacySaving(true);
    setPrivacyMsg(null);

    // 🔐 Supabase manda un email al nuevo correo para confirmar el cambio.
    // Necesitas tener bien configurado en Supabase: Auth > URL Configuration (Site URL + Redirect URLs).
    const { error } = await supabase.auth.updateUser(
      { email },
      {
        emailRedirectTo: `${window.location.origin}/perfil`,
      } as any
    );

    if (error) {
      setPrivacyMsg(`Error cambiando email ❌: ${error.message}`);
      setPrivacySaving(false);
      return;
    }

    setPrivacyMsg(
      "Te he enviado un email al nuevo correo para confirmar el cambio. Hasta que no lo confirmes, no se actualiza."
    );
    setPrivacySaving(false);
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setPrivacyMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== newPassword2) {
      setPrivacyMsg("Las contraseñas no coinciden.");
      return;
    }

    setPrivacySaving(true);
    setPrivacyMsg(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPrivacyMsg(`Error cambiando contraseña: ${error.message}`);
      setPrivacySaving(false);
      return;
    }

    setNewPassword("");
    setNewPassword2("");
    setPrivacyMsg("Contraseña actualizada ✅");
    setPrivacySaving(false);
  };

  // =========================
  // LOAD PERFIL
  // =========================
  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setMessage(null);

      const {
        data: { user },
        error: uErr,
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (uErr || !user) {
        navigate("/login");
        return;
Toggle}

      setAuthEmail(user.email ?? "");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id, address, is_admin, created_at, updated_at,
          first_name, last_name, phone,
          country, company, address_line1, address_line2, postal_code, city, region,
          marketing_opt_in
        `
        )
        .eq("id", user.id)
        .single();

      if (!alive) return;

      if (error) {
        const empty: ProfileRow = {
          id: user.id,
          address: null,
          first_name: null,
          last_name: null,
          phone: null,
          country: "España",
          company: null,
          address_line1: null,
          address_line2: null,
          postal_code: null,
          city: null,
          region: null,
          marketing_opt_in: false,
          is_admin: false,
          created_at: null,
          updated_at: null,
        };
        setProfile(empty);
        setMessage("Completa tu perfil y guarda los cambios.");
      } else {
        const row = data as ProfileRow;

        const { street, number } = splitStreetAndNumberFromLine1(row.address_line1);

        const addr2 =
          (row.address_line2 ?? "").trim()
            ? row.address_line2
            : number
            ? number
            : row.address_line2;

        addr2AutoFilledRef.current = !(row.address_line2 ?? "").trim() && !!number;

        setProfile({
          ...row,
          country: row.country ?? "España",
          address_line1: street || null,
          address_line2: addr2 ?? null,
        });
      }

      setLoading(false);
    };

    load();

    // refresca email si llega cambio por confirmación
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshAuthEmail().catch(() => {});
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [navigate]);

  // ✅ hidratar SOLO 1 vez input Dirección
  useEffect(() => {
    if (!profile) return;
    if (hydratedOnceRef.current) return;

    hydratedOnceRef.current = true;
    setStreetValue(profile.address_line1 ?? "");
  }, [profile]);

  // ✅ Autocomplete
  useEffect(() => {
    if (tab !== "profile") return;
    if (!profile) return;

    let cancelled = false;

    const getComp = (comps: any[], type: string) =>
      comps.find((c: any) => (c.types || []).includes(type))?.long_name || "";

    // ✅ Forzar SOLO calle (SIN disparar "input" para no reabrir el dropdown)
    const forceStreetOnly = (street: string) => {
      const input = streetRef.current;
      if (!input) return;

      const apply = () => {
        input.value = street;
      };

      queueMicrotask(apply);
      requestAnimationFrame(apply);
      setTimeout(apply, 60);
      setTimeout(apply, 180);
    };

    // ✅ Cerrar dropdown de Google (colapsar pac-container)
    const closePac = () => {
      const input = streetRef.current;
      if (!input) return;

      input.blur();

      const esc = new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        which: 27,
        bubbles: true,
      });
      input.dispatchEvent(esc);

      setTimeout(() => hidePac(), 0);
    };

    const setup = async () => {
      const ok = await ensureGoogleMapsPlacesLoaded();
      if (!ok || cancelled) return;

      const w = window as any;
      const input = streetRef.current;
      if (!w.google?.maps?.places || !input) return;

      if (acRef.current && listenerRef.current) return;

      const ac = new w.google.maps.places.Autocomplete(input, {
        types: ["address"],
        componentRestrictions: { country: ["es"] },
        fields: ["address_components", "name", "formatted_address"],
      });

      const onPlaceChanged = () => {
        const place = ac.getPlace();
        const comps = place?.address_components ?? [];

        const streetNumber = getComp(comps, "street_number");
        const route = getComp(comps, "route");

        const postalCode = getComp(comps, "postal_code");

        const city =
          getComp(comps, "locality") ||
          getComp(comps, "postal_town") ||
          getComp(comps, "administrative_area_level_3") ||
          getComp(comps, "sublocality") ||
          getComp(comps, "sublocality_level_1");

        const region =
          getComp(comps, "administrative_area_level_2") ||
          getComp(comps, "administrative_area_level_1");

        const country = getComp(comps, "country") || "España";

        const street = (route || "").trim();

        if (street) {
          forceStreetOnly(street);
        } else {
          const current = (streetRef.current?.value ?? "").trim();
          const cleaned = current.split(",")[0]?.trim();
          if (cleaned) forceStreetOnly(cleaned);
        }

        setProfile((p) => {
          if (!p) return p;

          const addr2Current = (p.address_line2 ?? "").trim();
          const canOverwriteAddr2 = !addr2Current || addr2AutoFilledRef.current;

          let nextAddr2 = p.address_line2;
          if (streetNumber && canOverwriteAddr2) {
            nextAddr2 = streetNumber;
            addr2AutoFilledRef.current = true;
          }

          return {
            ...p,
            address_line1: street || p.address_line1,
            address_line2: nextAddr2,
            postal_code: postalCode || null,
            city: city || null,
            region: region || null,
            country: country || p.country || "España",
          };
        });

        closePac();
      };

      const listener = ac.addListener("place_changed", onPlaceChanged);

      acRef.current = ac;
      listenerRef.current = listener;
    };

    setup();

    return () => {
      cancelled = true;
      if (tab !== "profile") {
        if (listenerRef.current?.remove) listenerRef.current.remove();
        listenerRef.current = null;
        acRef.current = null;
      }
    };
  }, [tab, profile]);

  const saveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    const streetDomRaw = (streetRef.current?.value ?? "").trim();
    const streetDom = (streetDomRaw.split(",")[0] ?? "").trim();

    const payload = {
      id: profile.id,

      first_name: profile.first_name?.trim() || null,
      last_name: profile.last_name?.trim() || null,
      phone: profile.phone?.trim() || null,

      country: profile.country?.trim() || "España",
      company: profile.company?.trim() || null,

      address_line1: streetDom || null,
      address_line2: profile.address_line2?.trim() || null,

      postal_code: profile.postal_code?.trim() || null,
      city: profile.city?.trim() || null,
      region: profile.region?.trim() || null,

      marketing_opt_in: !!profile.marketing_opt_in,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert([payload], { onConflict: "id" });

    if (error) {
      console.error(error);
      setMessage(`Error guardando cambios ❌: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("Perfil actualizado ✅");
    setSaving(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => {});
    navigate("/login");
  };

  if (loading) return <div className="p-8 text-gray-600">Cargando perfil…</div>;
  if (!profile) return <div className="p-8 text-red-600">Perfil no encontrado</div>;

  return (
    <main className="bg-gray-100 min-h-screen py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="lg:grid lg:grid-cols-12 lg:divide-x">
            <aside className="lg:col-span-3 p-6 border-b lg:border-b-0">
              <div className="mb-5">
                <div className="text-sm text-gray-500">Cuenta</div>
                <div className="font-semibold text-gray-900 break-words">{authEmail || "—"}</div>

                {profile.is_admin && (
                  <div className="inline-flex mt-3 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                    Admin
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  <div>Creado: {formatDate(profile.created_at)}</div>
                  <div>Actualizado: {formatDate(profile.updated_at)}</div>
                </div>
              </div>

              <nav className="space-y-2">
                <button
                  type="button"
                  onClick={() => setTab("profile")}
                  className={`w-full text-left px-3 py-2 rounded-md font-medium ${
                    tab === "profile" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Perfil
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPrivacyMsg(null);
                    setTab("privacy");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md font-medium ${
                    tab === "privacy" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Privacidad
                </button>

                <button
                  type="button"
                  onClick={() => setTab("orders")}
                  className={`w-full text-left px-3 py-2 rounded-md ${
                    tab === "orders" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Mis pedidos
                </button>

                
              </nav>
            </aside>

            <section className="lg:col-span-9 p-6">
              {tab === "orders" ? (
                <UserPedidosPanel />
              ) : tab === "privacy" ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900">Privacidad</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Gestiona tu email y contraseña. Para cambiar el email, Supabase envía un correo de confirmación al nuevo email.
                  </p>

                  <div className="mt-6 space-y-6">
                    {/* EMAIL */}
                    <div className="rounded-lg border border-gray-200 p-5">
                      <div className="font-semibold text-gray-900">Correo electrónico</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Actual: <span className="font-medium text-gray-800">{authEmail || "—"}</span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Nuevo correo</label>
                          <input
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                            placeholder="nuevo@email.com"
                            autoComplete="email"
                          />
                        </div>

                        <button
                          onClick={requestEmailChange}
                          disabled={privacySaving}
                          className="h-[42px] rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-50 px-4"
                        >
                          {privacySaving ? "Enviando…" : "Enviar verificación"}
                        </button>
                      </div>

                      <p className="mt-3 text-xs text-gray-500">
                        * El cambio NO se aplica hasta que confirmes desde el email recibido en la nueva dirección.
                      </p>
                    </div>

                    {/* PASSWORD */}
                    <div className="rounded-lg border border-gray-200 p-5">
                      <div className="font-semibold text-gray-900">Contraseña</div>
                      <div className="text-sm text-gray-500 mt-1">Cambia tu contraseña desde aquí.</div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nueva contraseña</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                            placeholder="Mínimo 8 caracteres"
                            autoComplete="new-password"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Repite la contraseña</label>
                          <input
                            type="password"
                            value={newPassword2}
                            onChange={(e) => setNewPassword2(e.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                            placeholder="Nueva contraseña"
                            autoComplete="new-password"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={changePassword}
                          disabled={privacySaving}
                          className="rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-50 px-5 py-2"
                        >
                          {privacySaving ? "Guardando…" : "Actualizar contraseña"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {privacyMsg && <p className="mt-4 text-sm text-gray-700">{privacyMsg}</p>}
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900">Mi perfil</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Estos datos se pueden usar automáticamente en el checkout.
                  </p>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre</label>
                      <input
                        value={profile.first_name ?? ""}
                        onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Nombre"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Apellidos</label>
                      <input
                        value={profile.last_name ?? ""}
                        onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Apellidos"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                      <input
                        value={profile.phone ?? ""}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="600 000 000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">País / Región</label>
                      <select
                        value={profile.country ?? "España"}
                        onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option>España</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Empresa (opcional)</label>
                      <input
                        value={profile.company ?? ""}
                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Empresa"
                      />
                    </div>

                    {/* ✅ Dirección */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Dirección</label>
                      <input
                        ref={streetRef}
                        defaultValue={profile.address_line1 ?? ""}
                        onFocus={() => {
                          if (pacHiddenRef.current) showPac();
                        }}
                        onChange={(e) => {
                          if (pacHiddenRef.current) showPac();

                          const v = e.target.value;

                          setProfile((p) => {
                            if (!p) return p;

                            const trimmed = v.trim();
                            const shouldClear = trimmed.length === 0;

                            const nextAddr2 =
                              shouldClear && addr2AutoFilledRef.current ? "" : p.address_line2 ?? "";

                            if (shouldClear) {
                              addr2AutoFilledRef.current = false;
                            }

                            return {
                              ...p,
                              address_line1: v,
                              address_line2: nextAddr2,
                              postal_code: shouldClear ? "" : p.postal_code,
                              city: shouldClear ? "" : p.city,
                              region: shouldClear ? "" : p.region,
                            };
                          });
                        }}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Calle"
                        autoComplete="off"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Al elegir una sugerencia se rellena CP/ciudad/provincia; el desplegable se cierra solo.
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Casa, apartamento, etc. (opcional)
                      </label>
                      <input
                        value={profile.address_line2 ?? ""}
                        onChange={(e) => {
                          addr2AutoFilledRef.current = false;
                          setProfile({ ...profile, address_line2: e.target.value });
                        }}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Nº, piso, puerta, escalera..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Código postal</label>
                      <input
                        value={profile.postal_code ?? ""}
                        onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="00000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                      <input
                        value={profile.city ?? ""}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Ciudad"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Provincia / Estado</label>
                      <input
                        value={profile.region ?? ""}
                        onChange={(e) => setProfile({ ...profile, region: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Provincia"
                      />
                    </div>

                    <label className="md:col-span-2 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!profile.marketing_opt_in}
                        onChange={(e) => setProfile({ ...profile, marketing_opt_in: e.target.checked })}
                      />
                      <span className="text-gray-700">Enviarme novedades y ofertas por email</span>
                    </label>
                  </div>

                  {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => navigate("/")}
                      className="px-6 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Volver
                    </button>

                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="px-6 py-2 rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                    >
                      {saving ? "Guardando…" : "Guardar cambios"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default UserProfile;

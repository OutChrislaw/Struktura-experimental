"use client";

import { getSsSiteInfo } from "@/lib/api";
import { SaPage, SaPanel } from "@/app/portal/dashboard/sa/_components/SaPage";
import { useSsResource } from "../../_components/useSsResource";

export default function SsSiteMapPage() {
  const { data, loading, error } = useSsResource(getSsSiteInfo);
  const site = data?.site ?? null;
  const lat = site?.coordinates.lat ?? null;
  const lng = site?.coordinates.lng ?? null;
  const hasCoordinates = lat !== null && lng !== null;
  const mapsUrl = hasCoordinates ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  return (
    <SaPage kicker="System Supervisor" title="Site Map" subtitle="Approximate location of your assigned site.">
      <SaPanel title="Location">
        {hasCoordinates ? (
          <div>
            <div
              style={{
                position: "relative",
                height: "420px",
                borderRadius: "10px",
                border: "1px solid #d1d9e6",
                overflow: "hidden",
                background:
                  "repeating-linear-gradient(0deg, #e6ebf2 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, #e6ebf2 0 1px, transparent 1px 44px), linear-gradient(135deg, #f1f5f9, #e2e8f0)",
              }}
            >
              <div style={{ position: "absolute", left: "-10%", right: "-10%", top: "54%", height: "30px", background: "#cbd5e1", transform: "rotate(-7deg)" }} />
              <div style={{ position: "absolute", top: "-10%", bottom: "-10%", left: "45%", width: "22px", background: "#cbd5e1", transform: "rotate(5deg)" }} />
              <div
                style={{
                  position: "absolute",
                  left: "45%",
                  top: "50%",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50% 50% 50% 0",
                  background: "#ca8a04",
                  transform: "translate(-50%, -100%) rotate(-45deg)",
                  boxShadow: "0 0 0 8px rgba(202, 138, 4, 0.18)",
                }}
              />
              <div style={{ position: "absolute", left: "47%", top: "52%", background: "#0a1440", color: "#ffffff", padding: "0.4rem 0.7rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                {site?.project}
              </div>
              <div style={{ position: "absolute", left: "1rem", bottom: "1rem", background: "rgba(255, 255, 255, 0.9)", border: "1px solid #d1d9e6", borderRadius: "6px", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#334155" }}>
                Illustrative map - no external map service connected.
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between", marginTop: "1rem" }}>
              <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                <strong>{site?.location ?? "-"}</strong> &middot; {lat}, {lng}
              </div>
              {mapsUrl ? (
                <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0a1440" }}>
                  Open in Google Maps
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, color: loading ? "#64748b" : "#b91c1c", fontSize: "0.86rem" }}>
            {loading
              ? "Loading site location..."
              : error !== ""
                ? error
                : "No coordinates have been recorded for this site yet."}
          </p>
        )}
      </SaPanel>
    </SaPage>
  );
}

"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PetCard from "@/components/PetCard";
import dynamic from "next/dynamic";
const HeroMap = dynamic(() => import("@/components/HeroMap"), { ssr: false, loading: () => <div className="hm-map skeleton" /> });
import SetupNotice from "@/components/SetupNotice";
import { isConfigured, listPosts, subscribePosts } from "@/lib/supabase";
import { FUR, areaName, furName, isSample } from "@/lib/data";
import { t } from "@/lib/i18n";

export default function FeedPage() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("all");
  const [species, setSpecies] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    listPosts().then((d) => { setPosts(d); setError(null); }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    load();
    const off = subscribePosts(load); // ประกาศใหม่ขึ้นเองโดยไม่ต้องรีเฟรช
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { off(); window.removeEventListener("focus", onFocus); };
  }, [load]);

  // นับเฉพาะประกาศจริง (ไม่นับประกาศตัวอย่าง)
  const counts = useMemo(() => {
    const c = { lost: 0, found: 0, home: 0, real: 0 };
    const all = { lost: 0, found: 0, home: 0 };
    (posts ?? []).forEach((p) => {
      all[p.status] = (all[p.status] ?? 0) + 1;
      if (isSample(p)) return;
      c.real++; c[p.status] = (c[p.status] ?? 0) + 1;
    });
    c.all = all;
    return c;
  }, [posts]);

  const shown = useMemo(() => {
    if (!posts) return [];
    const s = q.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (status === "all" || p.status === status) &&
        (species === "all" || p.species === species) &&
        (!s || [p.name, p.description, areaName(p.area), furName(p.fur), FUR[p.fur]?.[0], p.contact_name, p.species_other].join(" ").toLowerCase().includes(s))
    );
  }, [posts, status, species, q]);

  if (!isConfigured) return <SetupNotice />;

  const chip = (value, cur, set, label) => (
    <button key={value + set.name + label} className="chip" aria-pressed={cur === value} onClick={() => set(value)}>{label}</button>
  );

  return (
    <>
      <section className="hb">
        <div className="hb-main">
          <h1 className="hb-title">{t("hb_title")}</h1>
          <p className="hb-stat">
            {!posts ? t("loading") : counts.real
              ? t("hb_stat", { lost: counts.lost, found: counts.found, home: counts.home })
              : t(posts.length ? "hb_none_real" : "hb_none")}
          </p>
          <div className="hb-actions">
            <Link href="/new?type=lost" className="hb-act lost">
              <b>{t("cta_lost")}</b><span>{t("hb_lost_d")}</span><i aria-hidden="true">→</i>
            </Link>
            <Link href="/new?type=found" className="hb-act found">
              <b>{t("cta_found")}</b><span>{t("hb_found_d")}</span><i aria-hidden="true">→</i>
            </Link>
          </div>
          <div className="search hb-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--muted)", flex: "none" }}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input id="q" type="search" placeholder={t("search_ph")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("search_aria")} />
          </div>
        </div>
        <aside className="hb-map" aria-label={t("feed_aria")}>
          <div className="hb-map-head">
            <span>{t("map_teaser")}</span>
            <Link href="/map">{t("open_full_map")}</Link>
          </div>
          <HeroMap posts={posts} />
          <div className="hb-legend"><span><i className="lost" />{t("status.lost")}</span><span><i className="found" />{t("status.found")}</span><span><i className="ring" />{t("legend_new")}</span></div>
        </aside>
      </section>

      <section className="board" aria-labelledby="board-title">
      <div className="section-title">
        <h2 id="board-title">{t("latest")}</h2>
        <span className="live"><i />{t("auto_update")}</span>
      </div>

      <div className="toolbar">
        <div className="chips">
          {chip("all", status, setStatus, t("all"))}
          {chip("lost", status, setStatus, `${t("status.lost")}${posts ? " " + counts.all.lost : ""}`)}
          {chip("found", status, setStatus, `${t("status.found")}${posts ? " " + counts.all.found : ""}`)}
          {chip("home", status, setStatus, `${t("status.home")}${posts ? " " + counts.all.home : ""}`)}
          <span className="divider" />
          {chip("all", species, setSpecies, t("all_species"))}
          {chip("dog", species, setSpecies, t("species.dog"))}
          {chip("cat", species, setSpecies, t("species.cat"))}
          {chip("other", species, setSpecies, t("species.other"))}
        </div>
        <div className="toolbar-row">
          <span className="meta">{posts ? t("n_posts", { n: shown.length }) : t("loading")}</span>
        </div>
      </div>

      {error && <div className="notice error">{t("load_fail", { e: error })} <button className="btn small" onClick={load}>{t("retry")}</button></div>}

      {!posts && !error ? (
        <div className="grid">{Array.from({ length: 6 }, (_, i) => <div className="skeleton" key={i} />)}</div>
      ) : posts && shown.length ? (
        <div className="grid">{shown.map((p) => <PetCard key={p.id} post={p} />)}</div>
      ) : posts ? (
        <div className="empty board-note">
          {posts.length ? <>{t("no_match")}<br />{t("no_match2")}</> : <>{t("no_posts")}<br /><Link href="/new" className="btn warm" style={{ marginTop: 12 }}>{t("first_post")}</Link></>}
        </div>
      ) : null}
      </section>
    </>
  );
}

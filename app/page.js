"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PetCard from "@/components/PetCard";
import HeroShow from "@/components/HeroShow";
import dynamic from "next/dynamic";
const HeroMap = dynamic(() => import("@/components/HeroMap"), { ssr: false, loading: () => <div className="hm-map skeleton" /> });
import { PetPhoto } from "@/components/PetAvatar";
import TimeAgo from "@/components/TimeAgo";
import SetupNotice from "@/components/SetupNotice";
import { isConfigured, listPosts, subscribePosts } from "@/lib/supabase";
import { FUR, areaName, furName } from "@/lib/data";
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

  const counts = useMemo(() => {
    const c = { lost: 0, found: 0, home: 0 };
    (posts ?? []).forEach((p) => { c[p.status] = (c[p.status] ?? 0) + 1; });
    return c;
  }, [posts]);

  // รูปบนแบนเนอร์: ประกาศล่าสุดที่มีรูป (ถ้าไม่มีรูปเลย ใช้ประกาศล่าสุด)
  const featured = useMemo(() => {
    const list = (posts ?? []).filter((p) => p.status !== "home");
    const withPhoto = list.filter((p) => p.photo_url);
    return (withPhoto.length >= 3 ? withPhoto : list).slice(0, 3);
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
      {posts && posts.length > 0 && <HeroShow posts={posts} />}

      <section className="hero">
        <aside className="hero-feed" aria-label={t("feed_aria")}>
          <div className="hf-head">
            <span className="hf-live"><i />{t("map_teaser")}</span>
            <Link href="/map" className="hf-map">{t("open_full_map")}</Link>
          </div>
          <div className="hf-mapwrap">
            <HeroMap posts={posts} />
            <div className="hf-legend"><span><i className="lost" />{t("status.lost")}</span><span><i className="found" />{t("status.found")}</span><span><i className="ring" />{t("legend_new")}</span></div>
          </div>
          <div className="hf-foot">
            <div><b>{posts ? counts.lost : "–"}</b><span>{t("count_lost")}</span></div>
            <div><b>{posts ? counts.found : "–"}</b><span>{t("status.found")}</span></div>
            <div><b>{posts ? counts.home : "–"}</b><span>{t("status.home")}</span></div>
          </div>
        </aside>
      </section>

      
      <div className="section-title">
        <h2>{t("latest")}</h2>
        <span className="live"><i />{t("auto_update")}</span>
      </div>

      <div className="toolbar">
        <div className="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--muted)", flex: "none" }}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input id="q" type="search" placeholder={t("search_ph")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("search_aria")} />
        </div>
        <div className="chips">
          {chip("all", status, setStatus, t("all"))}
          {chip("lost", status, setStatus, `${t("status.lost")}${posts ? " " + counts.lost : ""}`)}
          {chip("found", status, setStatus, `${t("status.found")}${posts ? " " + counts.found : ""}`)}
          {chip("home", status, setStatus, `${t("status.home")}${posts ? " " + counts.home : ""}`)}
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
        <div className="empty">
          {posts.length ? <>{t("no_match")}<br />{t("no_match2")}</> : <>{t("no_posts")}<br /><Link href="/new" className="btn warm" style={{ marginTop: 12 }}>{t("first_post")}</Link></>}
        </div>
      ) : null}
    </>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { accent, apparait, ARCHE, useVu } from "./accueil";
import { cn } from "@/lib/utils";
import type { Media } from "@/server/db/schema";

/**
 * LE CABINET — la promenade lente, choisie par Anne parmi cinq idées
 * (fenêtre, mur de cadres, deux battants, bienvenue, promenade).
 */

type Props = {
  photos: Media[];
  titre: string;
  sousTitre: string;
  surtitre?: string;
  id?: string;
};

function Entete({
  surtitre,
  titre,
  sousTitre,
  vu,
  centre = false,
}: {
  surtitre?: string;
  titre: string;
  sousTitre: string;
  vu: boolean;
  centre?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-wrap items-end gap-6 lg:mb-12",
        centre ? "flex-col items-center text-center" : "justify-between",
      )}
    >
      <div>
        {surtitre && (
          <p
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-[var(--ad-pierre)] shadow-[0_1px_2px_rgba(46,66,79,0.06),0_4px_14px_-6px_rgba(46,66,79,0.12)]"
            style={apparait(vu, 0)}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[var(--ad-or)]"
            />
            {surtitre}
          </p>
        )}
        <h2
          className="text-[clamp(38px,4.6vw,62px)] leading-[1.04]"
          style={apparait(vu, 0.1)}
        >
          {accent(titre)}
        </h2>
      </div>
      {sousTitre && (
        <p
          className="max-w-[36ch] font-[family-name:var(--ad-titre)] text-[19px] italic leading-[1.5] text-[var(--ad-pierre)]"
          style={apparait(vu, 0.25)}
        >
          {sousTitre}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   LA PROMENADE LENTE — une rangée de portes qui glisse sans fin, très
   lentement, comme quand on marche dans un couloir. Et qu'on peut faire
   défiler SOI-MÊME : au doigt, à la souris (glisser), au pavé tactile, ou
   avec les flèches. Elle ne s'arrête que pendant qu'on la mène soi-même,
   et reprend son pas aussitôt après.
   ══════════════════════════════════════════════════════════════════════ */

/** Pixels par seconde du défilement automatique. */
const PAS = 30
/** Le temps de repos après une action, avant de reprendre la marche. */
const REPOS = 400

export function CabinetDefile({
  photos,
  surtitre,
  titre,
  sousTitre,
  id = "cabinet",
}: Props) {
  const [ref, vu] = useVu<HTMLElement>();
  const piste = useRef<HTMLDivElement>(null);
  const liste = photos.slice(0, 8);
  const tour = [...liste, ...liste];
  /* L'état de la marche, hors React (60 images par seconde). */
  const etat = useRef({ attente: 0, doigt: false, glisse: null as null | { x: number; depart: number; bouge: boolean } });

  const toucher = () => {
    etat.current.attente = performance.now() + REPOS;
  };

  /* La marche : on avance le défilement de la piste, et on boucle à la
     moitié (la seconde moitié est la copie de la première). */
  useEffect(() => {
    const el = piste.current;
    if (!el) return;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let avant = performance.now();
    let reste = 0;
    const pas = (maintenant: number) => {
      const dt = Math.min(64, maintenant - avant);
      avant = maintenant;
      const e = etat.current;
      /* La marche ne s'arrête QUE pendant qu'on la mène soi-même (glisser,
         défiler, flèches) — pas au simple survol : la galerie vit toujours. */
      if (!calme && !e.glisse && !e.doigt && maintenant > e.attente) {
        reste += (PAS * dt) / 1000;
        const entier = Math.floor(reste);
        if (entier) {
          el.scrollLeft += entier;
          reste -= entier;
        }
      }
      const moitie = el.scrollWidth / 2;
      if (moitie > 0) {
        if (el.scrollLeft >= moitie) el.scrollLeft -= moitie;
        else if (el.scrollLeft <= 0 && e.glisse) el.scrollLeft += moitie;
      }
      raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Glisser à la souris (au doigt, le navigateur fait défiler tout seul). */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !piste.current) return;
    etat.current.glisse = { x: e.clientX, depart: piste.current.scrollLeft, bouge: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    toucher();
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = etat.current.glisse;
    if (!g || !piste.current) return;
    const dx = e.clientX - g.x;
    if (Math.abs(dx) > 4) g.bouge = true;
    piste.current.scrollLeft = g.depart - dx;
    toucher();
  };
  const finGlisse = () => {
    etat.current.glisse = null;
    toucher();
  };

  /* Les flèches : une porte de plus, ou de moins, en douceur. */
  const deplacer = (sens: 1 | -1) => {
    const el = piste.current;
    if (!el) return;
    toucher();
    el.scrollBy({ left: sens * Math.min(360, el.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <section
      ref={ref}
      id={id}
      className="scroll-mt-24 overflow-hidden py-14 sm:py-20 md:py-28"
    >
      <div className="mx-auto max-w-[1240px] px-[6vw] lg:px-12">
        <Entete
          surtitre={surtitre}
          titre={titre}
          sousTitre={sousTitre}
          vu={vu}
        />
      </div>
      <div
        className="group relative"
        style={{ opacity: vu ? 1 : 0, transition: "opacity 1.4s .3s" }}
        onMouseLeave={finGlisse}
      >
        <div
          ref={piste}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finGlisse}
          onPointerCancel={finGlisse}
          onWheel={(e) => {
            /* Seul un défilement HORIZONTAL (pavé tactile) est une prise en main ;
               la molette qui fait descendre la page ne fige pas la galerie. */
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) toucher();
          }}
          onTouchStart={() => (etat.current.doigt = true)}
          onTouchEnd={() => {
            etat.current.doigt = false;
            toucher();
          }}
          onTouchCancel={() => (etat.current.doigt = false)}
          onClickCapture={(e) => {
            /* Un glisser n'est pas un clic. */
            if (etat.current.glisse?.bouge) e.preventDefault();
          }}
          className="cursor-grab overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          aria-label="Photos du cabinet — faites défiler"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") deplacer(1);
            if (e.key === "ArrowLeft") deplacer(-1);
          }}
        >
          <ul className="flex w-max select-none gap-4 pl-5 sm:gap-5 lg:gap-7 lg:pl-7">
            {tour.map((p, k) => (
              <li key={k} aria-hidden={k >= liste.length} className="shrink-0">
                <div
                  className="relative overflow-hidden bg-[var(--ad-sable)] shadow-[0_26px_50px_-32px_rgba(46,66,79,0.45)]"
                  style={{
                    borderRadius: ARCHE,
                    height: "min(52vh, 480px, 125vw)",
                    width:
                      (k % liste.length) % 2
                        ? "min(26vh, 240px, 62vw)"
                        : "min(36vh, 330px, 84vw)",
                    marginTop: (k % liste.length) % 2 ? 40 : 0,
                  }}
                >
                  <Image
                    src={p.url}
                    alt={k < liste.length ? p.alt : ""}
                    fill
                    draggable={false}
                    sizes="330px"
                    className="pointer-events-none object-cover transition-transform duration-[1400ms] group-hover:scale-[1.02]"
                  />
                </div>
                <p className="mt-3 text-center font-[family-name:var(--ad-titre)] text-[15px] italic text-[var(--ad-pierre)]">
                  {p.caption}
                </p>
              </li>
            ))}
          </ul>
        </div>
        {/* Les flèches, sur ordinateur : au survol de la promenade. */}
        {[-1, 1].map((sens) => (
          <button
            key={sens}
            type="button"
            onClick={() => deplacer(sens as 1 | -1)}
            aria-label={sens < 0 ? "Photos précédentes" : "Photos suivantes"}
            className={cn(
              "absolute top-[calc(50%-24px)] z-10 hidden h-12 w-12 place-items-center rounded-full bg-white/90 text-[var(--ad-nuit)] opacity-0 shadow-[0_14px_30px_-14px_rgba(46,66,79,0.5)] backdrop-blur transition-[opacity,transform,translate,scale] duration-500 ease-[var(--ad-ease)] hover:scale-105 focus-visible:opacity-100 group-hover:opacity-100 md:grid",
              sens < 0 ? "left-5 lg:left-8" : "right-5 lg:right-8",
            )}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={sens < 0 ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
            </svg>
          </button>
        ))}
      </div>
    </section>
  );
}

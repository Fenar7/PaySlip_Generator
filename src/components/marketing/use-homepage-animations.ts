"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function animateSection(
  section: Element,
  options?: {
    start?: string;
    cards?: string;
    extra?: string;
    stagger?: number;
    y?: number;
  },
) {
  const heading = section.querySelector("[data-animate='section-heading']");
  const cards = options?.cards
    ? Array.from(section.querySelectorAll(options.cards))
    : [];
  const extras = options?.extra
    ? Array.from(section.querySelectorAll(options.extra))
    : [];

  const targets = [heading, ...cards, ...extras].filter(Boolean);

  if (targets.length === 0) {
    return;
  }

  gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: options?.start ?? "top 78%",
      once: true,
    },
  }).from(targets, {
    opacity: 0,
    y: options?.y ?? 26,
    duration: 0.72,
    stagger: options?.stagger ?? 0.1,
    ease: "power3.out",
    clearProps: "opacity,transform",
  });
}

export function useHomepageAnimations(rootRef: React.RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        gsap.set(root.querySelectorAll("[data-animate]"), { clearProps: "all" });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

        heroTl
          .from("[data-animate='header']", {
            opacity: 0,
            y: -18,
            duration: 0.6,
            clearProps: "opacity,transform",
          })
          .from(
            "[data-animate='nav-item']",
            {
              opacity: 0,
              y: -10,
              duration: 0.36,
              stagger: 0.05,
              clearProps: "opacity,transform",
            },
            "-=0.32",
          )
          .from(
            "[data-animate='header-cta']",
            {
              opacity: 0,
              y: -10,
              duration: 0.38,
              stagger: 0.06,
              clearProps: "opacity,transform",
            },
            "-=0.24",
          )
          .from(
            "[data-animate='hero-eyebrow']",
            {
              opacity: 0,
              y: 20,
              duration: 0.48,
              clearProps: "opacity,transform",
            },
            "-=0.08",
          )
          .from(
            "[data-animate='hero-line']",
            {
              opacity: 0,
              y: 38,
              duration: 0.72,
              stagger: 0.08,
              clearProps: "opacity,transform",
            },
            "-=0.08",
          )
          .from(
            "[data-animate='hero-copy']",
            {
              opacity: 0,
              y: 24,
              duration: 0.5,
              clearProps: "opacity,transform",
            },
            "-=0.38",
          )
          .from(
            "[data-animate='hero-cta']",
            {
              opacity: 0,
              y: 20,
              duration: 0.42,
              stagger: 0.08,
              clearProps: "opacity,transform",
            },
            "-=0.22",
          )
          .from(
            "[data-animate='hero-chip']",
            {
              opacity: 0,
              y: 18,
              duration: 0.42,
              stagger: 0.07,
              clearProps: "opacity,transform",
            },
            "-=0.16",
          )
          .from(
            "[data-animate='mockup-shell']",
            {
              opacity: 0,
              y: 34,
              scale: 0.97,
              duration: 0.85,
              clearProps: "opacity,transform",
            },
            "-=0.68",
          )
          .from(
            "[data-animate='mockup-pane']",
            {
              opacity: 0,
              y: 20,
              duration: 0.48,
              stagger: 0.08,
              clearProps: "opacity,transform",
            },
            "-=0.42",
          )
          .from(
            "[data-animate='mockup-stat']",
            {
              opacity: 0,
              y: 16,
              duration: 0.42,
              stagger: 0.06,
              clearProps: "opacity,transform",
            },
            "-=0.2",
          );

        animateSection(root.querySelector("[data-animate='features-section']")!, {
          cards: "[data-animate='feature-card']",
          extra: "[data-animate='feature-extra']",
        });

        animateSection(root.querySelector("[data-animate='solutions-section']")!, {
          cards: "[data-animate='solution-card']",
        });

        animateSection(root.querySelector("[data-animate='workflow-section']")!, {
          cards: "[data-animate='workflow-card']",
        });

        animateSection(root.querySelector("[data-animate='generators-section']")!, {
          cards: "[data-animate='generator-card']",
        });

        animateSection(root.querySelector("[data-animate='faq-section']")!, {
          cards: "[data-animate='faq-card']",
        });

        animateSection(root.querySelector("[data-animate='final-cta']")!, {
          extra: "[data-animate='final-cta-action']",
          stagger: 0.12,
        });

        mm.add("(min-width: 1024px)", () => {
          gsap.to("[data-animate='hero-glow-left']", {
            yPercent: -10,
            xPercent: 8,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 1.2,
            },
          });

          gsap.to("[data-animate='hero-glow-right']", {
            yPercent: -14,
            xPercent: -6,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 1.4,
            },
          });

          gsap.to("[data-animate='mockup-shell']", {
            yPercent: -4,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-animate='hero']",
              start: "top top",
              end: "bottom top",
              scrub: 1,
            },
          });

          gsap.to("[data-animate='mockup-stat']", {
            yPercent: -8,
            stagger: 0.08,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-animate='hero']",
              start: "top top",
              end: "bottom top",
              scrub: 1.1,
            },
          });
        });

        mm.add("(max-width: 1023px)", () => {
          ScrollTrigger.config({ ignoreMobileResize: true });
        });
      });

      return () => mm.revert();
    }, root);

    return () => ctx.revert();
  }, [rootRef]);
}

"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type RootRef = RefObject<HTMLElement | null>;

function setWillChange(targets: gsap.TweenTarget) {
  gsap.set(targets, { willChange: "transform,opacity" });
}

function clearMotion(targets: gsap.TweenTarget) {
  gsap.set(targets, { clearProps: "transform,opacity,willChange" });
}

function createReplaySectionTrigger(
  section: HTMLElement,
  build: () => gsap.core.Timeline,
  start = "top 82%",
  end = "bottom 16%",
) {
  const timeline = build().pause(0);
  ScrollTrigger.create({
    trigger: section,
    start,
    end,
    onEnter: () => timeline.restart(),
    onEnterBack: () => timeline.restart(),
    onLeaveBack: () => timeline.progress(0).pause(),
  });
}

function buildFeatureTimeline(section: HTMLElement) {
  const heading = section.querySelector("[data-animate='section-heading']");
  const story = section.querySelector("[data-animate='feature-story']");
  const cards = section.querySelectorAll("[data-animate='feature-card']");
  const extra = section.querySelector("[data-animate='feature-extra']");
  setWillChange([heading, story, cards, extra].filter(Boolean));

  return gsap
    .timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => clearMotion([heading, story, cards, extra].filter(Boolean)),
    })
    .from(heading, {
      opacity: 0,
      y: 20,
      duration: 0.52,
    })
    .from(
      story,
      {
        opacity: 0,
        x: -28,
        duration: 0.58,
      },
      "-=0.26",
    )
    .from(
      cards,
      {
        opacity: 0,
        y: 22,
        stagger: 0.08,
        duration: 0.4,
      },
      "-=0.36",
    )
    .from(
      extra,
      {
        opacity: 0,
        y: 16,
        duration: 0.36,
      },
      "-=0.24",
    );
}

function buildSolutionTimeline(section: HTMLElement) {
  const heading = section.querySelector("[data-animate='section-heading']");
  const cards = gsap.utils.toArray<HTMLElement>(
    section.querySelectorAll("[data-animate='solution-card']"),
  );
  setWillChange([heading, cards].flat());

  return gsap
    .timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => clearMotion([heading, cards].flat()),
    })
    .from(heading, {
      opacity: 0,
      y: 18,
      duration: 0.48,
    })
    .from(
      cards,
      {
        opacity: 0,
        y: 26,
        stagger: 0.1,
        duration: 0.44,
      },
      "-=0.22",
    );
}

function buildWorkflowTimeline(section: HTMLElement) {
  const heading = section.querySelector("[data-animate='section-heading']");
  const cards = section.querySelectorAll("[data-animate='workflow-card']");
  const steps = section.querySelectorAll("[data-animate='workflow-step']");
  setWillChange([heading, cards, steps].filter(Boolean));

  return gsap
    .timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => clearMotion([heading, cards, steps].filter(Boolean)),
    })
    .from(heading, {
      opacity: 0,
      y: 18,
      duration: 0.48,
    })
    .from(
      cards,
      {
        opacity: 0,
        y: 22,
        stagger: 0.11,
        duration: 0.44,
      },
      "-=0.2",
    )
    .from(
      steps,
      {
        opacity: 0,
        scale: 0.94,
        stagger: 0.11,
        duration: 0.24,
      },
      "-=0.38",
    );
}

function buildGeneratorTimeline(section: HTMLElement) {
  const heading = section.querySelector("[data-animate='section-heading']");
  const cards = section.querySelectorAll("[data-animate='generator-card']");
  setWillChange([heading, cards].filter(Boolean));

  return gsap
    .timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => clearMotion([heading, cards].filter(Boolean)),
    })
    .from(heading, {
      opacity: 0,
      y: 18,
      duration: 0.5,
    })
    .from(
      cards,
      {
        opacity: 0,
        y: 24,
        stagger: 0.1,
        duration: 0.46,
      },
      "-=0.24",
    );
}

function buildFaqTimeline(section: HTMLElement) {
  const heading = section.querySelector("[data-animate='section-heading']");
  const cards = section.querySelectorAll("[data-animate='faq-card']");
  setWillChange([heading, cards].filter(Boolean));

  return gsap
    .timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => clearMotion([heading, cards].filter(Boolean)),
    })
    .from(heading, {
      opacity: 0,
      y: 14,
      duration: 0.4,
    })
    .from(
      cards,
      {
        opacity: 0,
        y: 18,
        stagger: 0.07,
        duration: 0.32,
      },
      "-=0.16",
    );
}

function buildFinalCtaTimeline(section: HTMLElement) {
  const heading = section.querySelector("[data-animate='section-heading']");
  const actions = section.querySelectorAll("[data-animate='final-cta-action']");
  setWillChange([heading, actions].filter(Boolean));

  return gsap
    .timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => clearMotion([heading, actions].filter(Boolean)),
    })
    .from(heading, {
      opacity: 0,
      y: 20,
      duration: 0.54,
    })
    .from(
      actions,
      {
        opacity: 0,
        y: 16,
        stagger: 0.08,
        duration: 0.34,
      },
      "-=0.2",
    );
}

function buildDesktopHero() {
  setWillChange([
    "[data-animate='hero-eyebrow']",
    "[data-animate='hero-line']",
    "[data-animate='hero-copy']",
    "[data-animate='hero-cta']",
    "[data-animate='hero-chip']",
    "[data-animate='mockup-shell']",
    "[data-animate='mockup-pane']",
    "[data-animate='mockup-stat']",
    "[data-animate='mockup-capability']",
  ]);

  return gsap
    .timeline({
      defaults: { ease: "power3.out" },
      onComplete: () =>
        clearMotion([
          "[data-animate='hero-eyebrow']",
          "[data-animate='hero-line']",
          "[data-animate='hero-copy']",
          "[data-animate='hero-cta']",
          "[data-animate='hero-chip']",
          "[data-animate='mockup-shell']",
          "[data-animate='mockup-pane']",
          "[data-animate='mockup-stat']",
          "[data-animate='mockup-capability']",
        ]),
    })
    .from("[data-animate='hero-eyebrow']",
      {
        opacity: 0,
        x: -14,
        duration: 0.36,
      })
    .from(
      "[data-animate='hero-line']",
      {
        yPercent: 108,
        opacity: 0,
        stagger: 0.1,
        duration: 0.7,
      },
      "-=0.04",
    )
    .from(
      "[data-animate='hero-copy']",
      {
        opacity: 0,
        y: 18,
        duration: 0.36,
      },
      "-=0.38",
    )
    .from(
      "[data-animate='hero-cta']",
      {
        opacity: 0,
        y: 16,
        stagger: 0.08,
        duration: 0.28,
      },
      "-=0.16",
    )
    .from(
      "[data-animate='hero-chip']",
      {
        opacity: 0,
        y: 14,
        stagger: 0.05,
        duration: 0.26,
      },
      "-=0.08",
    )
    .from(
      "[data-animate='mockup-shell']",
      {
        opacity: 0,
        y: 20,
        duration: 0.56,
      },
      "-=0.38",
    )
    .from(
      "[data-animate='mockup-pane']",
      {
        opacity: 0,
        y: 14,
        stagger: 0.06,
        duration: 0.3,
      },
      "-=0.28",
    )
    .from(
      "[data-animate='mockup-stat']",
      {
        opacity: 0,
        y: 12,
        stagger: 0.05,
        duration: 0.24,
      },
      "-=0.12",
    )
    .from(
      "[data-animate='mockup-capability']",
      {
        opacity: 0,
        y: 12,
        stagger: 0.05,
        duration: 0.22,
      },
      "-=0.14",
    );
}

function buildMobileHero() {
  setWillChange([
    "[data-animate='hero-eyebrow']",
    "[data-animate='hero-line']",
    "[data-animate='hero-copy']",
    "[data-animate='hero-cta']",
    "[data-animate='hero-chip']",
    "[data-animate='mockup-shell']",
  ]);

  return gsap
    .timeline({
      defaults: { ease: "power2.out" },
      onComplete: () =>
        clearMotion([
          "[data-animate='hero-eyebrow']",
          "[data-animate='hero-line']",
          "[data-animate='hero-copy']",
          "[data-animate='hero-cta']",
          "[data-animate='hero-chip']",
          "[data-animate='mockup-shell']",
        ]),
    })
    .from("[data-animate='hero-eyebrow']",
      {
        opacity: 0,
        y: 14,
        duration: 0.3,
      })
    .from(
      "[data-animate='hero-line']",
      {
        yPercent: 106,
        opacity: 0,
        stagger: 0.08,
        duration: 0.56,
      },
      "-=0.02",
    )
    .from(
      "[data-animate='hero-copy']",
      {
        opacity: 0,
        y: 14,
        duration: 0.28,
      },
      "-=0.28",
    )
    .from(
      "[data-animate='hero-cta']",
      {
        opacity: 0,
        y: 12,
        stagger: 0.06,
        duration: 0.24,
      },
      "-=0.12",
    )
    .from(
      "[data-animate='hero-chip']",
      {
        opacity: 0,
        y: 10,
        stagger: 0.05,
        duration: 0.2,
      },
      "-=0.08",
    )
    .from(
      "[data-animate='mockup-shell']",
      {
        opacity: 0,
        y: 16,
        duration: 0.36,
      },
      "-=0.2",
    );
}

export function useHomepageAnimations(rootRef: RootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        clearMotion(root.querySelectorAll("[data-animate]"));
      });

      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        buildDesktopHero();

        createReplaySectionTrigger(
          root.querySelector("[data-animate='features-section']") as HTMLElement,
          () => buildFeatureTimeline(root.querySelector("[data-animate='features-section']") as HTMLElement),
        );
        createReplaySectionTrigger(
          root.querySelector("[data-animate='solutions-section']") as HTMLElement,
          () => buildSolutionTimeline(root.querySelector("[data-animate='solutions-section']") as HTMLElement),
        );
        createReplaySectionTrigger(
          root.querySelector("[data-animate='workflow-section']") as HTMLElement,
          () => buildWorkflowTimeline(root.querySelector("[data-animate='workflow-section']") as HTMLElement),
        );
        createReplaySectionTrigger(
          root.querySelector("[data-animate='generators-section']") as HTMLElement,
          () => buildGeneratorTimeline(root.querySelector("[data-animate='generators-section']") as HTMLElement),
        );
        createReplaySectionTrigger(
          root.querySelector("[data-animate='faq-section']") as HTMLElement,
          () => buildFaqTimeline(root.querySelector("[data-animate='faq-section']") as HTMLElement),
        );
        createReplaySectionTrigger(
          root.querySelector("[data-animate='final-cta']") as HTMLElement,
          () => buildFinalCtaTimeline(root.querySelector("[data-animate='final-cta']") as HTMLElement),
          "top 84%",
        );
      });

      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        ScrollTrigger.config({ ignoreMobileResize: true });
        buildMobileHero();

        gsap.utils
          .toArray<HTMLElement>(
            "[data-animate='features-section'], [data-animate='solutions-section'], [data-animate='workflow-section'], [data-animate='generators-section'], [data-animate='faq-section'], [data-animate='final-cta']",
          )
          .forEach((section) => {
            createReplaySectionTrigger(
              section,
              () => {
                const items = section.querySelectorAll(
                  "[data-animate='section-heading'], [data-animate='feature-story'], [data-animate='feature-card'], [data-animate='feature-extra'], [data-animate='solution-card'], [data-animate='workflow-card'], [data-animate='generator-card'], [data-animate='faq-card'], [data-animate='final-cta-action']",
                );
                setWillChange(items);
                return gsap
                  .timeline({
                    defaults: { ease: "power2.out" },
                    onComplete: () => clearMotion(items),
                  })
                  .from(items, {
                    opacity: 0,
                    y: 14,
                    stagger: 0.06,
                    duration: 0.24,
                  });
              },
              "top 86%",
              "bottom 22%",
            );
          });
      });
    }, root);

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      ctx.revert();
    };
  }, [rootRef]);
}

"use client";

export function AuthBlobBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block" aria-hidden="true">
      <div className="absolute inset-y-0 right-0 w-[84%]">
        <svg
          className="h-full w-full auth-liquid-wave"
          viewBox="0 0 1100 980"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="auth-wave-core" x1="196" y1="640" x2="1002" y2="410" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="18%" stopColor="rgba(254,226,226,0.16)" />
              <stop offset="42%" stopColor="rgba(248,113,113,0.30)" />
              <stop offset="68%" stopColor="rgba(220,38,38,0.62)" />
              <stop offset="100%" stopColor="rgba(185,28,28,0.12)" />
            </linearGradient>
            <linearGradient id="auth-wave-secondary" x1="132" y1="720" x2="1044" y2="504" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="24%" stopColor="rgba(254,242,242,0.12)" />
              <stop offset="48%" stopColor="rgba(252,165,165,0.22)" />
              <stop offset="72%" stopColor="rgba(239,68,68,0.38)" />
              <stop offset="100%" stopColor="rgba(220,38,38,0.08)" />
            </linearGradient>
            <radialGradient id="auth-red-bloom" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(760 660) rotate(-28) scale(268 254)">
              <stop offset="0%" stopColor="rgba(239,68,68,0.42)" />
              <stop offset="58%" stopColor="rgba(239,68,68,0.20)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0)" />
            </radialGradient>
            <linearGradient id="auth-wave-highlight" x1="350" y1="572" x2="976" y2="512" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="35%" stopColor="rgba(255,255,255,0.24)" />
              <stop offset="55%" stopColor="rgba(254,226,226,0.54)" />
              <stop offset="78%" stopColor="rgba(255,255,255,0.10)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            <filter id="auth-soft-blur" x="-22%" y="-22%" width="144%" height="144%">
              <feGaussianBlur stdDeviation="34" />
            </filter>
            <filter id="auth-ambient-blur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="72" />
            </filter>
          </defs>

          <g filter="url(#auth-ambient-blur)" opacity="0.94">
            <path fill="url(#auth-wave-core)">
              <animate
                attributeName="d"
                dur="18s"
                repeatCount="indefinite"
                values="
                  M116 676C208 606 348 560 514 534C670 510 844 486 1062 372V572C934 656 828 730 726 782C596 848 456 892 312 888C206 886 132 852 116 804V676Z;
                  M92 634C218 562 386 520 554 506C716 494 882 462 1062 336V566C950 644 862 710 770 770C648 848 506 896 338 902C210 906 112 866 92 806V634Z;
                  M148 712C260 622 400 578 560 548C722 518 876 474 1062 392V598C964 664 866 740 754 804C612 882 446 920 286 892C196 876 144 824 148 768V712Z;
                  M116 676C208 606 348 560 514 534C670 510 844 486 1062 372V572C934 656 828 730 726 782C596 848 456 892 312 888C206 886 132 852 116 804V676Z
                "
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="20s"
                repeatCount="indefinite"
                values="0 0; -16 12; 18 -18; 0 0"
              />
            </path>
          </g>

          <g filter="url(#auth-soft-blur)" opacity="0.88">
            <path fill="url(#auth-wave-secondary)">
              <animate
                attributeName="d"
                dur="14s"
                repeatCount="indefinite"
                values="
                  M180 580C332 514 484 484 644 470C796 458 922 418 1062 336V476C956 552 852 608 738 650C604 700 470 734 326 744C250 748 200 724 180 688V580Z;
                  M154 608C300 532 466 494 634 486C804 478 926 430 1062 352V500C960 566 852 624 720 674C574 730 436 760 302 754C228 750 174 722 154 688V608Z;
                  M208 554C356 492 510 470 664 460C822 452 940 420 1062 360V492C950 564 836 634 700 688C560 744 430 768 304 746C242 736 214 694 208 646V554Z;
                  M180 580C332 514 484 484 644 470C796 458 922 418 1062 336V476C956 552 852 608 738 650C604 700 470 734 326 744C250 748 200 724 180 688V580Z
                "
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="16s"
                repeatCount="indefinite"
                values="0 0; 14 -10; -10 14; 0 0"
              />
              <animate attributeName="opacity" dur="10s" repeatCount="indefinite" values="0.72;0.94;0.78;0.72" />
            </path>
          </g>

          <g filter="url(#auth-soft-blur)" opacity="0.72">
            <path fill="url(#auth-red-bloom)">
              <animate
                attributeName="d"
                dur="12s"
                repeatCount="indefinite"
                values="
                  M620 544C706 492 826 486 910 548C996 614 1012 746 938 820C852 906 700 904 604 820C520 746 536 610 620 544Z;
                  M586 562C680 484 830 470 934 548C1034 624 1024 774 924 850C816 930 660 910 572 818C498 742 508 628 586 562Z;
                  M652 520C742 474 850 490 926 562C1000 632 1002 746 944 824C870 918 728 926 624 860C534 804 556 630 652 520Z;
                  M620 544C706 492 826 486 910 548C996 614 1012 746 938 820C852 906 700 904 604 820C520 746 536 610 620 544Z
                "
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="14s"
                repeatCount="indefinite"
                values="0 0; -12 10; 10 -14; 0 0"
              />
              <animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0.42;0.66;0.48;0.42" />
            </path>
          </g>

          <g filter="url(#auth-soft-blur)" opacity="0.56">
            <path fill="url(#auth-wave-highlight)">
              <animate
                attributeName="d"
                dur="11s"
                repeatCount="indefinite"
                values="
                  M296 612C410 558 540 530 690 514C816 500 936 474 1040 430C946 536 840 596 720 642C594 692 470 708 356 700C316 698 286 674 296 612Z;
                  M274 636C396 570 548 534 710 520C840 510 950 486 1048 452C960 548 862 612 738 664C606 718 470 732 344 714C300 706 268 684 274 636Z;
                  M326 586C446 540 570 518 714 502C840 488 944 466 1038 428C944 530 830 592 704 634C564 680 440 696 334 688C304 686 294 648 326 586Z;
                  M296 612C410 558 540 530 690 514C816 500 936 474 1040 430C946 536 840 596 720 642C594 692 470 708 356 700C316 698 286 674 296 612Z
                "
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="13s"
                repeatCount="indefinite"
                values="0 0; 10 -6; -14 10; 0 0"
              />
            </path>
          </g>

          <g filter="url(#auth-ambient-blur)" opacity="0.34">
            <ellipse cx="780" cy="650" rx="220" ry="182" fill="url(#auth-red-bloom)">
              <animate attributeName="rx" dur="15s" repeatCount="indefinite" values="220;255;228;220" />
              <animate attributeName="ry" dur="15s" repeatCount="indefinite" values="182;210;194;182" />
              <animate attributeName="cx" dur="17s" repeatCount="indefinite" values="780;742;804;780" />
              <animate attributeName="cy" dur="17s" repeatCount="indefinite" values="650;616;694;650" />
              <animate attributeName="opacity" dur="12s" repeatCount="indefinite" values="0.24;0.44;0.28;0.24" />
            </ellipse>
          </g>
        </svg>
      </div>

      <div
        className="absolute inset-y-0 right-0 w-[86%]"
        style={{
          background:
            "radial-gradient(circle at 58% 56%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.04) 26%, rgba(255,255,255,0.22) 58%, rgba(255,255,255,0.88) 100%)",
        }}
      />
    </div>
  );
}

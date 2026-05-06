"use client";

export function AuthBlobBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block" aria-hidden="true">
      <div className="absolute inset-y-0 right-0 w-[78%]">
        <svg
          className="h-full w-full auth-liquid-wave"
          viewBox="0 0 960 960"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="auth-red-core" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(535 555) rotate(25) scale(405 360)">
              <stop offset="0%" stopColor="rgba(220,38,38,0.58)" />
              <stop offset="52%" stopColor="rgba(239,68,68,0.30)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0)" />
            </radialGradient>
            <radialGradient id="auth-red-secondary" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(660 470) rotate(-18) scale(360 290)">
              <stop offset="0%" stopColor="rgba(248,113,113,0.36)" />
              <stop offset="54%" stopColor="rgba(239,68,68,0.18)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0)" />
            </radialGradient>
            <radialGradient id="auth-red-accent" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(705 705) rotate(-40) scale(245 220)">
              <stop offset="0%" stopColor="rgba(220,38,38,0.26)" />
              <stop offset="55%" stopColor="rgba(220,38,38,0.12)" />
              <stop offset="100%" stopColor="rgba(220,38,38,0)" />
            </radialGradient>

            <filter id="auth-soft-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="38" />
            </filter>
            <filter id="auth-ambient-blur" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="60" />
            </filter>
          </defs>

          <g filter="url(#auth-ambient-blur)" opacity="0.82">
            <path fill="url(#auth-red-core)">
              <animate
                attributeName="d"
                dur="16s"
                repeatCount="indefinite"
                values="
                  M280 392C338 257 522 194 656 246C804 304 860 470 812 592C760 726 600 810 446 778C304 748 192 634 188 512C186 466 224 430 280 392Z;
                  M250 422C306 280 500 198 650 232C812 268 896 444 858 592C826 734 670 840 500 816C350 794 208 678 200 542C196 480 204 458 250 422Z;
                  M294 366C374 236 548 186 684 252C822 320 864 490 790 626C724 744 560 810 422 772C292 736 194 624 198 498C200 446 242 406 294 366Z;
                  M280 392C338 257 522 194 656 246C804 304 860 470 812 592C760 726 600 810 446 778C304 748 192 634 188 512C186 466 224 430 280 392Z
                "
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="18s"
                repeatCount="indefinite"
                values="0 0; 18 -14; -10 20; 0 0"
              />
            </path>
          </g>

          <g filter="url(#auth-soft-blur)" opacity="0.95">
            <path fill="url(#auth-red-secondary)">
              <animate
                attributeName="d"
                dur="12s"
                repeatCount="indefinite"
                values="
                  M448 298C574 208 736 216 832 310C922 398 914 562 844 678C772 796 638 858 516 842C408 826 326 746 314 642C300 524 344 372 448 298Z;
                  M404 334C540 210 734 206 848 318C944 412 938 566 852 692C774 806 626 866 498 832C388 804 314 706 304 600C294 492 324 408 404 334Z;
                  M468 274C604 206 758 232 844 344C920 444 912 604 822 710C734 814 596 860 486 824C374 786 302 674 302 558C302 444 364 326 468 274Z;
                  M448 298C574 208 736 216 832 310C922 398 914 562 844 678C772 796 638 858 516 842C408 826 326 746 314 642C300 524 344 372 448 298Z
                "
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="14s"
                repeatCount="indefinite"
                values="0 0; -20 18; 12 -16; 0 0"
              />
            </path>
          </g>

          <g filter="url(#auth-soft-blur)" opacity="0.8">
            <path fill="url(#auth-red-accent)">
              <animate
                attributeName="d"
                dur="10s"
                repeatCount="indefinite"
                values="
                  M570 646C638 566 758 560 826 628C888 692 878 802 798 850C708 904 576 878 514 798C466 736 502 708 570 646Z;
                  M544 674C620 576 764 554 842 628C910 694 894 824 796 874C688 928 548 886 492 790C454 722 486 734 544 674Z;
                  M592 628C662 560 764 572 822 636C876 696 864 798 790 846C704 902 582 886 522 812C480 760 524 694 592 628Z;
                  M570 646C638 566 758 560 826 628C888 692 878 802 798 850C708 904 576 878 514 798C466 736 502 708 570 646Z
                "
              />
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="11s"
                repeatCount="indefinite"
                values="0 0; 16 10; -8 -16; 0 0"
              />
            </path>
          </g>

          <g opacity="0.28" filter="url(#auth-ambient-blur)">
            <path
              d="M314 470C408 410 510 404 600 428C712 458 806 534 910 554V720C836 664 760 650 694 664C558 692 480 814 314 834C182 850 72 780 10 702V540C108 572 198 544 314 470Z"
              fill="url(#auth-red-secondary)"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                dur="20s"
                repeatCount="indefinite"
                values="0 0; 24 -18; -18 12; 0 0"
              />
            </path>
          </g>
        </svg>
      </div>

      <div
        className="absolute inset-y-0 right-0 w-[82%]"
        style={{
          background:
            "radial-gradient(circle at 58% 58%, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0.20) 62%, rgba(255,255,255,0.82) 100%)",
        }}
      />
    </div>
  );
}

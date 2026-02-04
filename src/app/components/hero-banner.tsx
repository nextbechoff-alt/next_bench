import { useEffect, useRef, useState } from "react";

export function HeroBanner() {
  const fullText = "One Platform.";
  const typingSpeed = 90;
  const loopDelay = 5000;

  const [typedText, setTypedText] = useState("");
  const [showCaret, setShowCaret] = useState(true);

  const hasLoopedOnce = useRef(false);
  const hasScrolled = useRef(false);

  useEffect(() => {
    let index = 0;
    let typingInterval: ReturnType<typeof setInterval>;
    let loopTimeout: ReturnType<typeof setTimeout>;

    const startTyping = () => {
      if (hasScrolled.current) return;

      index = 0;
      setTypedText("");

      typingInterval = setInterval(() => {
        index++;

        setTypedText(fullText.slice(0, index));

        if (index >= fullText.length) {
          clearInterval(typingInterval);

          // Remove caret after first loop
          if (!hasLoopedOnce.current) {
            hasLoopedOnce.current = true;
            setShowCaret(false);
          }

          // Schedule next loop only if user hasn't scrolled
          loopTimeout = setTimeout(() => {
            if (!hasScrolled.current) {
              startTyping();
            }
          }, loopDelay);
        }
      }, typingSpeed);
    };

    const handleScroll = () => {
      hasScrolled.current = true;
      setShowCaret(false);
      clearInterval(typingInterval);
      clearTimeout(loopTimeout);
      window.removeEventListener("scroll", handleScroll);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    startTyping();

    return () => {
      clearInterval(typingInterval);
      clearTimeout(loopTimeout);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900">
            <span className="block">Everything Students Need.</span>

            <span className="block text-blue-600 mt-2 min-h-[1.2em]">
              {typedText}
              {showCaret && <span className="typing-caret">|</span>}
            </span>
          </h1>

          <p className="mt-4 text-base md:text-lg text-gray-600 animate-slide-up">
            Buy • Sell • Learn • Connect
          </p>

          <p className="mt-3 text-sm text-gray-500 max-w-2xl mx-auto">
            A modern student marketplace for growth, collaboration, smart discovery, and meaningful rewards.
          </p>

          <div className="mt-8 flex justify-center animate-slide-up">
            <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg px-6 py-3 text-sm text-gray-700 shadow-sm">
              Designed to support participation, contribution, and value creation.
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-500 text-xs">
        <span className="mb-2 tracking-wide">Scroll to explore</span>
        <div className="w-5 h-9 rounded-full border border-gray-400 flex items-start justify-center p-1">
          <span className="w-1 h-1.5 bg-gray-500 rounded-full animate-scroll-indicator" />
        </div>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import { motion, type Variants } from "motion/react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 250, damping: 22 },
  },
};

export default function Footer() {
  return (
    <footer className="relative isolate w-full overflow-hidden bg-[#3f68d6] px-6 pb-7 pt-16 text-white sm:px-10 sm:pt-20 lg:px-16">
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, x: "-18%" }}
        whileInView={{ opacity: 1, x: "0%" }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{
          duration: 1.1,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute inset-x-0 top-0 h-3 overflow-hidden"
      >
        <motion.div
          animate={{ backgroundPositionX: ["0px", "26px"] }}
          transition={{
            duration: 8,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop",
          }}
          className="h-full w-[120%] -translate-x-8 -skew-x-[32deg] bg-[repeating-linear-gradient(90deg,#ffd24a_0px,#ffd24a_2px,transparent_2px,transparent_13px)] opacity-90"
        />
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "0px 0px -60px 0px" }}
        variants={containerVariants}
        className="mx-auto flex w-full max-w-6xl flex-col gap-10"
      >
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <motion.div variants={itemVariants} className="max-w-md">
            <a
              href="#top"
              aria-label="MyBuddy home"
              className="inline-flex items-center gap-3 rounded-sm transition-colors hover:text-[#ffd24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd24a]"
            >
              <Image
                src="/mybuddy-mark.svg"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <span className="text-4xl font-semibold tracking-[-0.06em]">
                myBuddy<span className="text-[#ffd24a]">.</span>
              </span>
            </a>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/80">
              A little buddy, always close by.
            </p>
          </motion.div>

          <motion.nav
            variants={itemVariants}
            aria-label="Footer links"
            className="flex flex-col items-start gap-3 text-sm font-medium sm:flex-row sm:items-center sm:gap-7"
          >
            <a
              href="https://github.com/vedantchavare04/myBuddy-releases/releases/latest/download/MyBuddy-Setup.exe"
              className="rounded-sm text-white/90 transition-colors hover:text-[#ffd24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd24a]"
            >
              Download
            </a>
            <a
              href="https://github.com/vedantchavare04/mybuddy"
              target="_blank"
              rel="noreferrer"
              className="rounded-sm text-white/90 transition-colors hover:text-[#ffd24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd24a]"
            >
              GitHub
            </a>
            <a
              href="#feedback-form"
              className="rounded-sm text-white/90 transition-colors hover:text-[#ffd24a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd24a]"
            >
              Report a problem
            </a>
          </motion.nav>
        </div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col gap-2 border-t border-white/20 pt-5 text-xs text-white/65 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>© MyBuddy</span>
          <span>A little help, right where you need it.</span>
        </motion.div>
      </motion.div>
    </footer>
  );
}

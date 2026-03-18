"use client";

import { type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
  type Transition,
  LayoutGroup,
} from "framer-motion";

export { motion, AnimatePresence, useReducedMotion, LayoutGroup };

// --- Easing ---

/** ease-out-quart: fast deceleration, natural feel */
const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

// --- Shared transitions ---

const defaultTransition: Transition = {
  duration: 0.25,
  ease: EASE_OUT_QUART,
};

// --- FadeIn ---

interface FadeInProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
}

export function FadeIn({
  children,
  className,
  duration = 0.2,
  delay = 0,
}: FadeInProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: EASE_OUT_QUART }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// --- SlideUp ---

interface SlideUpProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  offset?: number;
}

export function SlideUp({
  children,
  className,
  duration = 0.25,
  delay = 0,
  offset = 8,
}: SlideUpProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE_OUT_QUART }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// --- StaggerContainer + StaggerItem ---

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.05,
      staggerChildren: 0.03,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
}

export function StaggerContainer({ children, className }: StaggerContainerProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial={prefersReduced ? "visible" : "hidden"}
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// --- Shared exit/enter variants for lists ---

export const listItemVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: EASE_OUT_QUART },
  },
};

export const slideRightExitVariants: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    x: 60,
    transition: { duration: 0.2, ease: EASE_OUT_QUART },
  },
};

export const crossFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.15, ease: EASE_OUT_QUART },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1, ease: EASE_OUT_QUART },
  },
};

// --- Step slide variants (for wizard) ---

export function getStepSlideVariants(direction: number): Variants {
  return {
    initial: { opacity: 0, x: direction > 0 ? 60 : -60 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: EASE_OUT_QUART },
    },
    exit: {
      opacity: 0,
      x: direction > 0 ? -60 : 60,
      transition: { duration: 0.2, ease: EASE_OUT_QUART },
    },
  };
}

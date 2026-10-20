"use client";

import {useEffect, useId, useRef, useState, type CSSProperties} from "react";
import Icon from "@/components/ui/icon";
import "./booking-process.css";

// Processing, success, and transfer are separate phases: only one ring runs at a time.
const phases = [
  {step: -1, kind: "entrance", duration: 800},
  {step: 0, kind: "processing", duration: 1800},
  {step: 0, kind: "success", duration: 400},
  {step: 0, kind: "transfer", duration: 600},
  {step: 1, kind: "processing", duration: 1800},
  {step: 1, kind: "success", duration: 400},
  {step: 1, kind: "transfer", duration: 600},
  {step: 2, kind: "processing", duration: 1800},
  {step: 2, kind: "success", duration: 400},
  {step: 2, kind: "finished", duration: 1500},
  {step: -1, kind: "reset", duration: 400},
] as const;

type Step = {icon: string; title: string; description: string};

export default function BookingProcess({steps}: {steps: Step[]}) {
  const root = useRef<HTMLOListElement>(null);
  const [cursor, setCursor] = useState({phase: 0, cycle: 0});
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const remaining = useRef<number>(phases[0].duration);
  const replayVersion = useRef(0);
  const id = useId();
  const phase = phases[cursor.phase];
  const playing = inView && pageVisible && !reducedMotion;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReducedMotion(media.matches);
    const visibility = () => setPageVisible(!document.hidden);
    motion(); visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {threshold: 0.15});
    if (root.current) observer.observe(root.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now();
    const version = replayVersion.current;
    let advanced = false;
    const timer = window.setTimeout(() => {
      advanced = true;
      const next = (cursor.phase + 1) % phases.length;
      remaining.current = phases[next].duration;
      setCursor(current => ({phase: next, cycle: current.cycle + (next === 0 ? 1 : 0)}));
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      // Read the latest replay counter so an old timer cannot shorten a new replay.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (!advanced && version === replayVersion.current) remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [cursor, playing]);

  function replay(index: number) {
    if (reducedMotion) return;
    const next = [1, 4, 7][index];
    replayVersion.current++;
    remaining.current = phases[next].duration;
    setCursor(current => ({phase: next, cycle: current.cycle + 1}));
  }

  return <ol ref={root} className="booking-process" data-playing={playing} data-phase={reducedMotion ? "static" : phase.kind} aria-label="Booking process preview">
    {steps.map((step, index) => {
      const completed = reducedMotion || phase.step > index || phase.step === index && phase.kind !== "processing";
      const active = !reducedMotion && phase.step === index && phase.kind === "processing";
      const state = completed ? "completed" : active ? "processing" : "waiting";
      const flowing = !reducedMotion && phase.step === index && phase.kind === "transfer";
      return <li key={index} className="booking-process-step" data-state={state} data-celebrate={!reducedMotion && phase.step === index && phase.kind === "success"} style={{"--step-index": index} as CSSProperties}>
        <div className="booking-process-card">
          <button type="button" className="booking-process-replay" onClick={() => replay(index)} aria-label={`Replay step ${index + 1}: ${step.title}`} aria-describedby={`${id}-${index}`}/>
          <span className="booking-process-symbol" aria-hidden="true">
            <span className="booking-process-orbit"/>
            <svg className="booking-process-ring" viewBox="0 0 112 112"><circle className="booking-process-ring-track" cx="56" cy="56" r="50"/>{active && <circle key={`${cursor.cycle}-${index}`} className="booking-process-ring-progress" cx="56" cy="56" r="50" pathLength="100"/>}</svg>
            <span className="booking-process-icon"><Icon name={step.icon} size={32}/></span>
            <span className="booking-process-success"><svg viewBox="0 0 32 32" fill="none"><path d="m8 16 5 5 11-11" pathLength="1"/></svg></span>
          </span>
          <h3>{step.title}</h3>
          <p id={`${id}-${index}`}>{step.description}</p>
          <span className="booking-process-status" aria-hidden="true">{completed ? index === 2 ? "Ride Request Ready" : "Completed" : active ? "Processing" : "Ready when you are"}</span>
        </div>
        {index < steps.length - 1 && <span className="booking-process-connection" data-flowing={flowing} data-completed={reducedMotion || phase.step > index} aria-hidden="true"><span className="booking-process-connection-fill"/><span className="booking-process-particle"/></span>}
      </li>;
    })}
  </ol>;
}

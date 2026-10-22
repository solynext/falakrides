"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect, useState} from "react";
import "./special-offer-button.css";

export default function SpecialOfferButton() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    const timer = window.setTimeout(() => setVisible(true), 5000);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (pathname !== "/") return null;

  return <div className={`special-offer-wrap${visible ? " is-visible" : ""}`}>
    <Link className="special-offer-button" href="/offers" aria-label="View special offers, up to 50% off">
      <span className="special-offer-discount" aria-hidden="true"><small>UP TO</small><strong>50%</strong><small>OFF</small></span>
      <span className="special-offer-label">SPECIAL OFFER</span>
    </Link>
    <button className="special-offer-dismiss" type="button" aria-label="Dismiss special offer" onClick={() => setVisible(false)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button>
  </div>;
}

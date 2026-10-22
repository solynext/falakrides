"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import "./special-offer-button.css";

export default function SpecialOfferButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  return <div className={`special-offer-wrap${visible ? " is-visible" : ""}`}>
    <Link className="special-offer-button" href="/offers" aria-label="View special offers">
      <span aria-hidden="true">%</span>
      <span>Special Offer</span>
    </Link>
    <button className="special-offer-dismiss" type="button" aria-label="Dismiss special offer" onClick={() => setVisible(false)}>×</button>
  </div>;
}

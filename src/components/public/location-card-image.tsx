"use client";

import Image from "next/image";
import {useState} from "react";
import {photo} from "@/utils/images";

function destinationPhoto(name: string) {
  const madinah = /madinah|medina|madina|المدينة/i.test(name);
  const airport = /airport|\b(jed|med)\b|مطار/i.test(name);
  if (airport) return madinah || /\bmed\b/i.test(name) ? "/images/locations/madinah-airport.jpg" : "/images/locations/jeddah-airport.jpg";
  if (madinah) return "/images/locations/madinah.jpg";
  if (/jeddah|jiddah|jidda|جدة/i.test(name)) return "/images/locations/jeddah.jpg";
  if (/hotel|فندق/i.test(name)) return "/images/locations/hotel-makkah.jpg";
  if (/makkah|mecca|مكة|haram|الحرم/i.test(name)) return "/images/locations/makkah-haram.jpg";
  if (/ziyarat|ziyarah|زيارة/i.test(name)) return "/images/reference/ziyarat.webp";
  return "/images/reference/hero-transfer.png";
}

export default function LocationCardImage({name, image}: {name: string; image: string}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const savedImage = image?.trim();
  const fallback = destinationPhoto(name);
  const src = savedImage && savedImage !== failedImage ? photo(savedImage, 800) : fallback;

  return <Image src={src} alt={`${name} destination`} fill sizes="(max-width: 600px) 230px, 280px" onError={() => {if (src !== fallback) setFailedImage(savedImage);}}/>;
}

"use client";
import LocationCards from "./location-cards";

export default function RelatedLocations({serviceId,serviceTitle}:{serviceId:string;serviceTitle:string}) {
  return <LocationCards serviceId={serviceId} serviceTitle={serviceTitle} carousel={false}/>;
}

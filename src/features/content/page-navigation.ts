import {editableContentFields} from "./fields";
import {websiteCopyFields} from "./website-model";
import type {WebsiteCollection} from "./website-model";

export type ContentSection = {id: string; label: string; fields: string[]; copy: string[]; collection?: WebsiteCollection};
export type ContentPage = {id: string; label: string; sections: ContentSection[]};
const names: Record<string, string> = {home:"Home",about:"About",packages:"Packages",vehicles:"Vehicles",gallery:"Gallery",routes:"Routes",offers:"Offers",contact:"Contact",faq:"FAQ","book-a-ride":"Book a ride","my-bookings":"My bookings",policies:"Policies",privacy:"Privacy",terms:"Terms",shared:"Shared website"};
export const contentPages: ContentPage[] = Object.entries(names).map(([id,label])=>({id,label,sections:[]}));
function section(page: string, label: string) {
  const target = contentPages.find(item=>item.id===page)!;
  let found = target.sections.find(item=>item.label===label);
  if (!found) {found={id:`${page}:${label}`,label,fields:[],copy:[]};target.sections.push(found);}
  return found;
}
section("home","Hero slides").collection="slides";
section("gallery","Gallery photos").collection="gallery";
const copyGroups: Record<string,string> = {Introduction:"Introduction", "Booking steps":"How booking works",Benefits:"Why choose us"};
for (const field of websiteCopyFields) {
  let page="home", label=copyGroups[field.group] || field.group;
  if(field.group==="Navigation & buttons" || field.group==="Footer") {page="shared";label=field.group;}
  if(field.group==="Gallery") {page="gallery";label="Gallery introduction";}
  if(field.group==="Services & vehicles") label=/^(fleet|vehicle|privateJourney|luggage)/.test(field.key)?"Vehicle section":"Services section";
  if(field.group==="Callout, reviews & FAQ") label=field.key.startsWith("callout")?"Booking callout":field.key.startsWith("reviews")?"Reviews":"FAQ introduction";
  if(field.group==="Public pages") {page=field.key.startsWith("about")?"about":field.key.startsWith("services")?"shared":field.key.startsWith("vehicles")?"vehicles":field.key.startsWith("contact")?"contact":field.key.startsWith("faq")?"faq":"packages";label="Page introduction";}
  section(page,label).copy.push(field.key);
}
section("faq","Questions & answers").collection="faqs";
const fieldPages: Record<string,string> = {main:"home",services:"shared",umrah:"packages",fleet:"vehicles",Vehicles:"vehicles",routes:"routes","Popular routes":"routes",offers:"offers",about:"about",contact:"contact",faq:"faq",privacy:"privacy",terms:"terms",booking:"book-a-ride",inquiry:"shared","Booking locations":"book-a-ride","Booking form labels":"book-a-ride","Booking popup":"book-a-ride","Booking history":"my-bookings","Fleet labels":"vehicles","Contact form":"contact"};
for(const field of editableContentFields) {
  if(field.kind==="website") continue;
  const match=field.section.match(/^Page: (.+)$/);
  const page=match ? (match[1].trim()==="packages slug"?"packages":match[1].trim().replaceAll(" ","-")) : fieldPages[field.section] || "shared";
  section(names[page]?page:"shared",match?"Page text":field.section==="Current website"?"Page banner":field.section).fields.push(field.id);
}

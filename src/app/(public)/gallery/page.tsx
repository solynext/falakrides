import type {Metadata} from "next";
import PublicPage from "@/components/layout/public-page";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import GalleryExperience from "./gallery-experience";

export async function generateMetadata():Promise<Metadata>{
  const {published}=await readContent();
  const {copy}=websiteFromValues(published);
  return {title:`${copy.navGallery} | Falak Rides`,description:copy.galleryDescription};
}

export default async function Gallery() {
  const {published}=await readContent();
  const {copy, gallery}=websiteFromValues(published);
  return <PublicPage title={copy.navGallery} description={copy.galleryDescription}>
    <GalleryExperience photos={gallery.filter(photo=>photo.visible&&photo.image)} copy={copy}/>
  </PublicPage>;
}

import type {Metadata} from "next";
import PublicPage from "@/components/layout/public-page";
import {readContent} from "@/features/content/store";
import {websiteFromValues} from "@/features/content/website-model";
import GalleryExperience from "./gallery-experience";
import {pageMetadata} from "@/lib/seo";

export async function generateMetadata():Promise<Metadata>{
  const {published}=await readContent();
  const {copy}=websiteFromValues(published);
  return pageMetadata({title:`${copy.navGallery} | Falak Rides`,description:copy.galleryDescription,path:"/gallery",image:"/images/locations/madinah.jpg"});
}

export default async function Gallery() {
  const {published}=await readContent();
  const {copy, gallery}=websiteFromValues(published);
  return <PublicPage title={copy.navGallery} description={copy.galleryDescription}>
    <GalleryExperience photos={gallery.filter(photo=>photo.visible&&photo.image)} copy={copy}/>
  </PublicPage>;
}

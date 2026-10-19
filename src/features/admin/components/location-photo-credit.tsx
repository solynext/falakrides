import credits from "@/data/location-image-credits.json";

export default function LocationPhotoCredit({image}:{image:string}) {
  const photo=credits.find(photo=>photo.image===image);
  if(!photo)return null;
  const anchor=photo.image.split("/").pop()?.replace(".jpg","");
  return <a className="adm-photo-credit" href={`/images/locations/credits.html#${anchor}`} target="_blank" rel="noopener noreferrer">Photo credits</a>;
}

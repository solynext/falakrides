export function serviceSlug(name:string,existing:string[]=[]):string {
  const base=name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90).replace(/-$/g,"");
  if(!base)return "";
  let slug=base;
  for(let suffix=2;existing.includes(slug);suffix++)slug=`${base}-${suffix}`;
  return slug;
}

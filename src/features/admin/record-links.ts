import type {AdminRow} from "./types";

export function routeStops(route:string) {
  const parts=route.split(/\s*(?:→|->)\s*/).map(part=>part.trim());
  return parts.length === 2 ? parts : ["",""];
}
export function applySavedRide(row:AdminRow,ride?:AdminRow):AdminRow {
  if(!ride)return {...row,fareId:""};
  const [pickup,destination]=routeStops(ride.route);
  return {...row,fareId:ride.id,pickup,destination,fare:ride.fare || "",...(ride.vehicleId ? {vehicle:ride.vehicleId} : {})};
}
export function applySavedCustomer(row:AdminRow,customer?:AdminRow):AdminRow {
  return customer ? {...row,customerId:customer.id,customer:customer.name,email:customer.email,phone:customer.phone} : {...row,customerId:"",customer:"",email:"",phone:""};
}
export function applyBookingLink(row:AdminRow,booking:AdminRow|undefined,module:string):AdminRow {
  if(!booking)return {...row,booking:"",...(module === "payments" ? {customer:"",amount:""} : {recipient:""})};
  return {...row,booking:booking.id,...(module === "payments" ? {customer:booking.customer,amount:booking.fare || ""} : {recipient:row.channel === "Email" ? booking.email : booking.phone})};
}

import {db} from "@/lib/db";

export async function databaseCatalog() {
  const [vehicles, fares, locations, offers, reviews] = await Promise.all([
    db.vehicle.findMany({where: {status: {not: "Maintenance"}}, orderBy: {createdAt: "asc"}}),
    db.fare.findMany({where: {status: "Active"}, orderBy: {createdAt: "asc"}}),
    db.location.findMany({where: {status: "Active"}, orderBy: {createdAt: "asc"}}),
    db.offer.findMany({where: {status: "Active", validUntil: {gte: new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Riyadh"})}}, orderBy: {createdAt: "desc"},include:{vehicle:true}}),
    db.feedback.findMany({where: {status: "Approved", type: "Review"}, orderBy: {createdAt: "desc"}, take: 20}),
  ]);
  return {
    vehicles: vehicles.map(vehicle => ({id: vehicle.id, name: vehicle.name, category: vehicle.category, image: vehicle.image, description: vehicle.description, passengers: vehicle.passengers, bags: vehicle.luggage})),
    routes: fares.map(fare => {const [from, to = ""] = fare.route.split(/\s*→\s*/); return [from, to, fare.caption, fare.image || "/images/header-background.jpg", fare.fare === null ? "" : String(fare.fare / 100), fare.maxFare == null ? "" : String(fare.maxFare / 100)];}),
    fares: fares.map(fare => ({route: fare.route, fare: fare.fare === null ? null : fare.fare / 100, maxFare:fare.maxFare == null ? null : fare.maxFare / 100, vehicleId:fare.vehicleId})),
    locations: locations.map(location => location.name),
    offers: offers.map(offer => ({id: offer.id, title: offer.name, image:offer.vehicle?.image || "", route: offer.route, discountPercent: offer.discount, validUntil: offer.validUntil, terms: offer.terms})),
    reviews: reviews.map(review => ({id: review.id, name: review.customer, rating: review.rating ?? 0, text: review.message})),
  };
}

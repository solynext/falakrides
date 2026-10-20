export type GuideSection = {heading: string; paragraphs?: string[]; bullets?: string[]};
export type TravelGuide = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  sections: GuideSection[];
  links: {label: string; href: string}[];
};

export const travelGuides: TravelGuide[] = [
  {
    slug: "book-jeddah-airport-taxi-makkah",
    title: "How to Book a Taxi from Jeddah Airport to Makkah for Umrah",
    description: "A practical checklist for arranging a Jeddah Airport to Makkah private transfer, including flight, hotel, passenger and luggage details.",
    excerpt: "Prepare the arrival and destination details that help the transport team confirm a suitable pickup and quote.",
    sections: [
      {heading: "Collect your arrival and hotel details", paragraphs: ["Before requesting a Jeddah Airport to Makkah taxi, have your arrival date, flight number, expected landing time and hotel address ready. If you know your terminal or preferred meeting point, include that too. These details help the team discuss the pickup plan with you.", "Share a contact number that will be reachable on the travel day. If your flight or accommodation changes, update the team using your booking details rather than assuming the original plan has changed automatically."]},
      {heading: "Choose a vehicle preference for your party", paragraphs: ["Count passengers and bags, including larger suitcases and any items that need extra space. The listed fleet includes sedan, family, premium and group preferences; the exact vehicle, passenger capacity and luggage fit must be confirmed for your trip.", "If you are unsure which option fits, send the passenger and luggage counts with your quote request. Review the available [vehicles and packages](/vehicles) and ask the team to confirm the selection before booking."]},
      {heading: "Request and confirm the fare", paragraphs: ["Enter Jeddah Airport as pickup and your Makkah hotel as destination in the booking request. Add the date, pickup time, passenger count and luggage. A route fare is shown only when one is published for the selected route; otherwise ask for a quote.", "Before you accept, confirm the fare in SAR, what the quote covers, the vehicle preference, meeting point and any waiting arrangements. Do not rely on an estimate from an unrelated route or vehicle."]},
      {heading: "Use a simple arrival checklist", bullets: ["Flight number and arrival date", "Hotel name and full address in Makkah", "Passenger and luggage counts", "Reachable phone number", "Agreed meeting point, vehicle and fare"]},
    ],
    links: [{label: "Request a Jeddah Airport to Makkah taxi", href: "/jeddah-airport-to-makkah-taxi"}, {label: "Check Umrah taxi price information", href: "/umrah-taxi-prices"}, {label: "View airport transfer service details", href: "/services/airport-transfers"}],
  },
  {
    slug: "umrah-taxi-prices-fare-guide",
    title: "Umrah Taxi Prices in Saudi Arabia: What Affects the Fare?",
    description: "Learn how to compare published Umrah taxi fares and request a complete SAR quote when your route or vehicle is not listed.",
    excerpt: "Understand what to check in a published fare and which trip details to include when you request a quote.",
    sections: [
      {heading: "Start with the exact route", paragraphs: ["A fare applies to the route and options shown with it. Airport terminals, hotel addresses, intermediate stops and the direction of travel can change the request, so enter the actual pickup and destination rather than assuming a nearby route is equivalent.", "The [routes and prices page](/routes) lists active fare records where available. If your journey is not shown, use the booking form or WhatsApp to request a quote; the site does not promise an unlisted fixed price."]},
      {heading: "Compare vehicle and trip requirements", paragraphs: ["Vehicle preference, passenger count and luggage all matter when confirming a suitable ride. A route may have more than one vehicle option, and a fare associated with one option should not be treated as the fare for another.", "Also explain whether you need a one-way or return trip, additional stops, airport pickup coordination or a multi-city itinerary. Ask the team to state the complete fare in SAR and confirm what is included before accepting."]},
      {heading: "A practical quote checklist", bullets: ["Exact pickup and destination addresses", "Travel date and requested pickup time", "Passenger and luggage counts", "Vehicle preference, if you have one", "Stops, return travel or airport details", "The full fare in SAR and any agreed inclusions"]},
      {heading: "Avoid comparing unlike quotes", paragraphs: ["When comparing offers, check that the route, direction, vehicle and trip details match. An advertised amount without the same itinerary or vehicle may not be comparable. Ask whether waiting, stops or a return leg are included rather than inferring those terms.", "For available vehicle categories and capacities, see the [vehicle list](/vehicles). Capacity and availability are confirmed by the team for the actual booking."]},
    ],
    links: [{label: "Compare listed Umrah taxi routes", href: "/routes"}, {label: "Ask for a price for a specific route", href: "/book-a-ride"}, {label: "Explore premium vehicle preferences", href: "/premium-umrah-transport"}],
  },
  {
    slug: "affordable-or-premium-umrah-transport",
    title: "Affordable or Premium Umrah Transport: Choosing a Vehicle",
    description: "Compare vehicle preferences for an Umrah journey by party size, luggage and route, then request a confirmed fare in SAR.",
    excerpt: "Choose a vehicle by matching the actual passenger and luggage needs to the route and a confirmed quote.",
    sections: [
      {heading: "Choose for the trip, not only the category", paragraphs: ["A sedan preference may suit a smaller party, while a family vehicle, premium SUV or group van may be worth asking about when your party or luggage needs more space. These are starting points, not a guarantee of a specific model or capacity.", "The fleet page identifies vehicle preferences and the published catalog capacities where available. Ask the team to confirm the actual vehicle, passenger limit, luggage fit and availability for your date."]},
      {heading: "When a premium option may suit you", paragraphs: ["Choose a premium vehicle preference if that is the kind of ride you want to request. The [premium Umrah transport page](/premium-umrah-transport) describes the currently listed premium option and links to its package information.", "Premium describes the website's vehicle category; it does not establish that a vehicle is available for a particular time. Confirm the model, route, fare and any requested stops directly with the team."]},
      {heading: "Ask for a like-for-like price", paragraphs: ["A useful comparison uses the same pickup, destination, date, passenger count, luggage and trip type for each option. Ask for the complete quote in SAR and clarify what the team has included.", "If the route has no published fare, use [Umrah taxi price information](/umrah-taxi-prices) and request a quote. Do not assume that a price displayed for another route or vehicle applies to your journey."]},
      {heading: "Before you book", bullets: ["Confirm the vehicle model or preference", "Check passenger capacity and luggage fit", "Share your route and any planned stops", "Confirm availability and the total SAR quote", "Keep the booking details for changes or questions"]},
    ],
    links: [{label: "See premium Umrah transport options", href: "/premium-umrah-transport"}, {label: "Browse the vehicle catalog", href: "/vehicles"}, {label: "Request a quote", href: "/book-a-ride"}],
  },
  {
    slug: "makkah-to-madinah-private-taxi",
    title: "Makkah to Madinah by Private Taxi: Route, Vehicles and Booking",
    description: "Plan a Makkah to Madinah private transfer with exact pickup details, vehicle and luggage requirements, and a confirmed quote.",
    excerpt: "A booking guide for arranging a private intercity transfer between Makkah and Madinah.",
    sections: [
      {heading: "Set the pickup and drop-off addresses", paragraphs: ["For a Makkah to Madinah taxi request, provide the pickup address in Makkah and the destination address in Madinah. Hotel names alone can be ambiguous, so include the full address or a clear location name where possible.", "Share the date and preferred pickup time. Journey duration varies with the agreed route, traffic and stops; ask the team to discuss the schedule that fits your plans."]},
      {heading: "Decide what the trip includes", paragraphs: ["Tell the team whether you need one-way travel, a return journey or additional stops. A request for a direct hotel-to-hotel transfer differs from an itinerary with sightseeing or waiting time, so describe each leg clearly.", "If you are also arranging Ziyarat, review the existing [Makkah and Madinah Ziyarat service](/services/ziyarat-taxi-services) and agree on the locations, order and timing before the booking is confirmed."]},
      {heading: "Match the vehicle to passengers and bags", paragraphs: ["Select a vehicle preference only after considering the number of passengers and the amount of luggage. Compare the [published fleet options](/vehicles), then ask the team to confirm the vehicle and luggage fit for your journey.", "If you need a package itinerary, see the listed [transport packages](/packages). A package description is not a substitute for confirming the route, availability and complete quote."]},
      {heading: "Confirm price and travel details", paragraphs: ["Review the [active route fares](/routes) for a matching Makkah to Madinah option. If the exact route or vehicle is not listed, request a quote. Confirm the final fare in SAR, pickup time, vehicle and any inclusions before accepting."]},
    ],
    links: [{label: "View the Makkah to Madinah taxi page", href: "/makkah-to-madinah-taxi"}, {label: "Request an intercity quote", href: "/book-a-ride"}, {label: "Read how fares are quoted", href: "/travel-guides/umrah-taxi-prices-fare-guide"}],
  },
  {
    slug: "best-vehicle-for-umrah-family-group",
    title: "Which Vehicle Is Best for an Umrah Family or Group?",
    description: "Choose an Umrah vehicle preference using passenger count, luggage, route and a confirmed capacity rather than model assumptions.",
    excerpt: "Use passenger and luggage counts to narrow vehicle preferences, then confirm actual capacity and availability.",
    sections: [
      {heading: "Count passengers and luggage first", paragraphs: ["Start with the number of adults and children travelling, then count bags and note any large or unusually shaped items. A vehicle that fits the passenger count may still not have the luggage space your group needs.", "Use the capacities listed on the [fleet page](/vehicles) as a guide to the catalog, then ask the team to confirm the actual vehicle, capacity and luggage fit for your travel date. The site's fleet disclosure identifies images and examples as illustrative."]},
      {heading: "Compare the listed preferences", paragraphs: ["The published catalog includes sedan, family, premium and group preferences, including Camry / Sonata, Staria, GMC Yukon XL and Hiace package options. Availability and exact specifications should be confirmed for each booking.", "A smaller party may ask about a sedan or family option; a larger party can ask whether a group vehicle is suitable. Do not rely on a model name alone to determine the number of seats or bags."]},
      {heading: "Include the route and trip type", paragraphs: ["Vehicle choice and price can depend on the journey. Include every pickup and destination, the date, whether the trip is one-way or return, and any planned stops in the quote request.", "For an airport arrival, include the flight details and hotel address. For travel between Makkah and Madinah, provide both exact addresses and ask the team to confirm a workable pickup time."]},
      {heading: "Request a complete quote", paragraphs: ["Compare options using the same itinerary and ask for the final fare in SAR. Published route fares appear where available; otherwise use the [price guide](/umrah-taxi-prices) and request a quote. Confirm the vehicle and luggage fit before accepting."]},
    ],
    links: [{label: "Browse vehicles and published capacities", href: "/vehicles"}, {label: "Explore vehicle packages", href: "/packages"}, {label: "Request a vehicle quote", href: "/book-a-ride"}],
  },
  {
    slug: "arrange-umrah-airport-transfers",
    title: "How to Arrange Airport Transfers for an Umrah Trip",
    description: "Plan an Umrah airport transfer with flight, hotel, pickup, passenger and luggage details for Jeddah or Madinah arrivals.",
    excerpt: "Prepare the information needed to coordinate an airport pickup and onward hotel transfer.",
    sections: [
      {heading: "Choose the airport and first destination", paragraphs: ["Identify whether your journey starts at Jeddah Airport or Madinah Airport and provide the exact hotel or address where you are going. If you are planning onward travel to another city, list each leg separately so the quote reflects the full itinerary.", "Falak Ride lists airport transfer service information for both Jeddah and Madinah. Review the [airport transfer service](/services/airport-transfers) and the route pages for the journey you need."]},
      {heading: "Share flight and pickup information", paragraphs: ["Include the flight number, arrival date, expected landing time, terminal if known, and a reachable phone number. Ask the team to confirm where to meet, how to contact the driver and any waiting arrangements.", "Flight schedules and arrival plans can change. If your flight or hotel changes, contact the team with your booking reference so the pickup can be reviewed."]},
      {heading: "Confirm your vehicle and luggage needs", paragraphs: ["Provide the number of passengers and bags, including large suitcases. Ask the team which listed vehicle preference can fit your party and luggage; images and model names alone do not confirm capacity or availability.", "If you are travelling with a family or group, browse the [fleet and vehicle options](/vehicles) and include your preference in the request."]},
      {heading: "Check the complete fare before travel", paragraphs: ["Review an active fare only if it matches your route and selected vehicle. When no matching price is published, request a quote and confirm the full fare in SAR, the pickup plan and what the quote covers.", "For a Jeddah Airport arrival in Makkah, use the [Jeddah Airport to Makkah transfer page](/jeddah-airport-to-makkah-taxi). For other routes, use the [route price list](/routes) or send a booking request."]},
    ],
    links: [{label: "Request an airport pickup", href: "/services/airport-transfers"}, {label: "See Umrah taxi prices", href: "/umrah-taxi-prices"}, {label: "Book an airport transfer", href: "/book-a-ride"}],
  },
];

export function travelGuide(slug: string) {
  return travelGuides.find(guide => guide.slug === slug);
}

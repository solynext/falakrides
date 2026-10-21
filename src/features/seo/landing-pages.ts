export type RouteLanding = {
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  pickup: string;
  destination: string;
  routeFrom: string;
  routeTo: string;
  intro: string;
  journey: string;
  pickupInformation: string[];
  planning: string[];
  booking: string[];
  related: {label: string; href: string}[];
};

export const routeLandings: RouteLanding[] = [
  {
    slug: "jeddah-airport-to-makkah-taxi",
    path: "/jeddah-airport-to-makkah-taxi",
    title: "Jeddah Airport to Makkah Taxi | Private Umrah Transfer | Falak Ride",
    description: "Arrange a private taxi from Jeddah Airport to Makkah. Share your flight, hotel, passenger and luggage details to request a vehicle and fare quote.",
    h1: "Jeddah Airport to Makkah Taxi",
    pickup: "Jeddah Airport (JED)",
    destination: "Makkah",
    routeFrom: "jeddah airport",
    routeTo: "makkah",
    intro: "Plan a private airport transfer from King Abdulaziz International Airport to your Makkah accommodation. Falak Ride can review your arrival details, destination and vehicle preference before confirming the pickup and quote.",
    journey: "This is an airport-to-accommodation journey from Jeddah Airport to Makkah. Your terminal, hotel address, arrival procedures, traffic and any agreed stops affect the pickup schedule and driving time. Ask for a journey estimate for your arrival; no fixed duration is promised here.",
    pickupInformation: [
      "Provide your flight number, arrival date and terminal if known. Include a phone or WhatsApp number the team can use on arrival.",
      "Agree the exact terminal meeting point and contact procedure before travel; do not assume a particular gate, arrivals-hall welcome or included waiting time.",
      "Allow for immigration and baggage collection when arranging pickup. Ask how delays and waiting charges will be handled, and contact the team if your flight changes.",
      "Give your Makkah hotel name and full address, and ask the team to confirm the accessible drop-off point.",
    ],
    planning: [
      "Include your flight number, arrival date and expected landing time in your request.",
      "Share the terminal or meeting-point details available to you and the full hotel address in Makkah.",
      "Tell the team how many passengers and bags are travelling so it can check a suitable vehicle preference.",
    ],
    booking: [
      "Use the booking form to provide the pickup, hotel destination, travel date, arrival time, passenger count and luggage count.",
      "Ask the team to confirm the meeting point, vehicle, fare in SAR and any waiting arrangements before accepting the trip.",
      "If your arrival plan changes, contact the team with your booking details so the pickup can be reviewed.",
    ],
    related: [
      {label: "Compare published route fares", href: "/routes"},
      {label: "See how Umrah taxi prices are quoted", href: "/umrah-taxi-prices"},
      {label: "Read the Jeddah Airport pickup guide", href: "/travel-guides/book-jeddah-airport-taxi-makkah"},
    ],
  },
  {
    slug: "makkah-to-madinah-taxi",
    path: "/makkah-to-madinah-taxi",
    title: "Makkah to Madinah Taxi | Private Intercity Transfer | Falak Ride",
    description: "Request a private taxi from Makkah to Madinah. Compare listed vehicle and route fares where available, or contact Falak Ride for a quote.",
    h1: "Makkah to Madinah Taxi",
    pickup: "Makkah",
    destination: "Madinah",
    routeFrom: "makkah",
    routeTo: "madinah",
    intro: "Arrange a private intercity transfer between your Makkah and Madinah addresses. Share the hotel or pickup details at both ends, your travel date, passenger count and luggage so the team can review the journey and available vehicle preferences.",
    journey: "This is an intercity transfer from your agreed Makkah pickup address to your agreed Madinah destination. The exact addresses, road conditions and requested stops determine the journey plan. Ask the team for an estimated driving time and suitable departure time for your travel date rather than relying on a guaranteed arrival time.",
    pickupInformation: [
      "Share the Makkah hotel name, full address and a reachable contact number; confirm whether the pickup point is the lobby entrance or another accessible location.",
      "Provide the Madinah hotel name and full drop-off address. A Madinah Airport transfer or Ziyarat itinerary is a different route and needs its own quote.",
      "Discuss luggage, oversized items and any requested rest or prayer stops before booking; do not assume extra stops are included in a direct-transfer fare.",
      "If you also need the return trip, give its date and time and ask for a separate confirmed price.",
    ],
    planning: [
      "Enter the exact pickup and drop-off addresses rather than only the city names when you request a quote.",
      "Tell the team whether you need a one-way or return journey and whether you would like to discuss any stops.",
      "Travel duration varies with the agreed route, traffic and stops; confirm your itinerary and timing before booking.",
    ],
    booking: [
      "Choose Makkah as pickup and Madinah as destination in the booking form, then add the date and preferred pickup time.",
      "Select a vehicle preference after checking the passenger and luggage details with the team.",
      "Confirm the full fare in SAR, inclusions and pickup arrangements before you accept the trip.",
    ],
    related: [
      {label: "View active route fares", href: "/routes"},
      {label: "Explore private vehicle preferences", href: "/vehicles"},
      {label: "Read the Makkah to Madinah travel guide", href: "/travel-guides/makkah-to-madinah-private-taxi"},
    ],
  },
  {
    slug: "madinah-to-jeddah-airport-transfer",
    path: "/madinah-to-jeddah-airport-transfer",
    title: "Madinah to Jeddah Airport Transfer | Private Taxi | Falak Ride",
    description: "Plan a private transfer from Madinah to Jeddah Airport. Request a quote with your flight, pickup, passenger and luggage details.",
    h1: "Madinah to Jeddah Airport Transfer",
    pickup: "Madinah",
    destination: "Jeddah Airport (JED)",
    routeFrom: "madinah",
    routeTo: "jeddah airport",
    intro: "Arrange a private transfer from your Madinah address to King Abdulaziz International Airport in Jeddah. Share your flight departure information and preferred pickup details so the team can review the journey and quote.",
    journey: "This journey runs from your agreed Madinah pickup address to Jeddah Airport. Confirm the departure terminal, required airport arrival time and estimated driving time with the team before agreeing a pickup schedule.",
    pickupInformation: [
      "Provide your exact Madinah pickup address and a reachable contact number.",
      "Share your departure flight number, date and terminal if known so the team can review the requested airport arrival time.",
      "Confirm the pickup point, luggage capacity, planned stops and any waiting arrangements before travel.",
    ],
    planning: [
      "Provide the flight number, airport terminal if known, and your required airport arrival time.",
      "Share the exact Madinah pickup address, travel date, passenger count and luggage details.",
      "Discuss the pickup time with the team; the route and traffic conditions affect how much time to allow.",
    ],
    booking: [
      "Enter Madinah as pickup and Jeddah Airport as destination in the request form.",
      "Ask the team to confirm the vehicle preference, route, total fare in SAR and pickup time.",
      "Keep your booking reference and contact the team if your flight or hotel arrangements change.",
    ],
    related: [
      {label: "Compare published route prices", href: "/routes"},
      {label: "Browse Umrah taxi fare information", href: "/umrah-taxi-prices"},
      {label: "Read the airport transfer planning guide", href: "/travel-guides/arrange-umrah-airport-transfers"},
    ],
  },
];

export function routeLanding(slug: string) {
  return routeLandings.find(page => page.slug === slug);
}

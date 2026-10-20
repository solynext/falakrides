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

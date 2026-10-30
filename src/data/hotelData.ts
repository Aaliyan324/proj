export interface Room {
  id: string;
  name: string;
  roomNumber: string;
  category: 'deluxe' | 'suite' | 'standard';
  isAvailable: boolean;
  featuredImage: string;
  gallery: string[];
  description: string;
  amenities: string[];
  badge?: string;
  bedType: string;
  view: string;
}

export interface AmenityService {
  id: string;
  title: string;
  iconClass: string;
  shortDesc: string;
  fullDesc: string;
  schedule: string;
  image: string;
}

export interface GalleryItem {
  id: string;
  stepNumber: number;
  sequenceNumber: string;
  sequenceLabel: string;
  title: string;
  category: 'parking' | 'scenery' | 'night';
  image: string;
  caption: string;
  roomNumber?: string;
  roomType?: string;
  isVerifiedPhoto: boolean;
}

export const HOTEL_INFO = {
  name: "Red Rock Hotel",
  shortName: "Red Rock",
  brandSubtitle: "Rooms & Suites • Comfort & Hospitality",
  address: "Red Rock Hotel",
  phone: "Contact via WhatsApp",
  // TODO(before launch): replace with the hotel's real, verified email address.
  email: "info@redrockhotel.example",
  checkInTime: "2:00 PM",
  checkOutTime: "12:00 PM",
  paymentPolicy: "Cash Payment upon arrival at hotel reception. Booking confirmed via WhatsApp."
};

export const RESORT_AMENITIES: AmenityService[] = [
  {
    id: "amenity-reception",
    title: "24/7 Front Desk Concierge",
    iconClass: "fa-concierge-bell",
    shortDesc: "Dedicated hospitality team available around the clock for guest assistance.",
    fullDesc: "Our 24-hour reception desk is always ready to assist with seamless check-ins, room assistance, and local guidance.",
    schedule: "24 Hours Daily",
    image: "/images/01-reception.jpg"
  },
  {
    id: "amenity-wifi",
    title: "High-Speed Wi-Fi Internet",
    iconClass: "fa-wifi",
    shortDesc: "Complimentary ultra-fast optical fiber broadband in all rooms and lounges.",
    fullDesc: "Stay connected effortlessly throughout the property with seamless high-speed wireless connectivity.",
    schedule: "Available 24/7",
    image: "/images/room_suite_king.jpg"
  },
  {
    id: "amenity-ac",
    title: "Climate Control & Air Conditioning",
    iconClass: "fa-snowflake",
    shortDesc: "Individual climate-controlled rooms ensuring year-round optimal comfort.",
    fullDesc: "Modern whisper-quiet air conditioning and heating units inside every room for restful sleep.",
    schedule: "In-Room Control",
    image: "/images/room_suite_double.jpg"
  },
  {
    id: "amenity-housekeeping",
    title: "Daily Housekeeping & Fresh Linens",
    iconClass: "fa-broom",
    shortDesc: "Immaculate room cleaning, fresh sanitization, and premium crisp linens.",
    fullDesc: "Our housekeeping staff maintains rigorous hygiene standards, providing spotless rooms and plush towels daily.",
    schedule: "Daily Service",
    image: "/images/room_suite_lounge.jpg"
  },
  {
    id: "amenity-dining",
    title: "In-Room Dining Service",
    iconClass: "fa-utensils",
    shortDesc: "Freshly prepared meals delivered directly to your suite during service hours.",
    fullDesc: "Enjoy our kitchen's specialties served warm and fresh in the privacy and comfort of your room.",
    schedule: "Kitchen Hours",
    image: "/images/room_suite_double.jpg"
  },
  {
    id: "amenity-power",
    title: "Uninterrupted Power Backup",
    iconClass: "fa-bolt",
    shortDesc: "Automatic backup power generator ensuring non-stop electrical comfort.",
    fullDesc: "Heavy-duty standby generators guarantee continuous lighting, cooling, and internet at all times.",
    schedule: "24/7 Standby",
    image: "/images/room_suite_king.jpg"
  },
  {
    id: "amenity-parking",
    title: "On-Site Parking Available",
    iconClass: "fa-parking",
    shortDesc: "Secure, spacious on-site vehicle parking for all hotel guests.",
    fullDesc: "Red Rock Hotel provides dedicated on-site parking for all guests. Our secure parking area accommodates cars and larger vehicles with easy access to the hotel entrance. Parking is complimentary for all staying guests.",
    schedule: "24/7 Available",
    image: "/images/multi-storey-car-park-1271919_1280.jpg"
  }
];

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "gallery-parking-01",
    stepNumber: 1,
    sequenceNumber: "01",
    sequenceLabel: "Parking",
    title: "Car Park Corridor",
    category: "parking",
    image: "/images/gallery/parking-01-car-park-corridor.jpg",
    caption: "A long, well-lit covered car park with marked bays and parked vehicles along the wall.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-parking-02",
    stepNumber: 2,
    sequenceNumber: "02",
    sequenceLabel: "Parking",
    title: "Covered Parking Bays",
    category: "parking",
    image: "/images/gallery/parking-02-covered-bays.jpg",
    caption: "Covered parking with numbered pillars, bright overhead lighting and a row of parked cars.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-parking-03",
    stepNumber: 3,
    sequenceNumber: "03",
    sequenceLabel: "Parking",
    title: "Indoor Car Park",
    category: "parking",
    image: "/images/gallery/parking-03-indoor-car-park.jpg",
    caption: "A spacious indoor car park with clearly painted lanes and marked parking spaces.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-01",
    stepNumber: 4,
    sequenceNumber: "04",
    sequenceLabel: "Scenery",
    title: "Mountain Road Through Pines",
    category: "scenery",
    image: "/images/gallery/scenery-01-mountain-road-pines.jpg",
    caption: "A road winding through pine-covered hills in the Murree region.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-02",
    stepNumber: 5,
    sequenceNumber: "05",
    sequenceLabel: "Scenery",
    title: "Chairlift Over the Valley",
    category: "scenery",
    image: "/images/gallery/scenery-02-chairlift-valley.jpg",
    caption: "A chairlift cabin crossing a forested mountain valley, a popular attraction in the Murree hills.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-03",
    stepNumber: 6,
    sequenceNumber: "06",
    sequenceLabel: "Scenery",
    title: "Moon Over the Ridges",
    category: "scenery",
    image: "/images/gallery/scenery-03-moon-over-ridges.webp",
    caption: "A low moon rising over layered mountain ridges under a cloudy evening sky.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-04",
    stepNumber: 7,
    sequenceNumber: "07",
    sequenceLabel: "Scenery",
    title: "Church Tower at Dusk",
    category: "scenery",
    image: "/images/gallery/scenery-04-church-tower-dusk.webp",
    caption: "A stone church tower among the trees, with misty hills under a soft evening sky.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-05",
    stepNumber: 8,
    sequenceNumber: "08",
    sequenceLabel: "Scenery",
    title: "Hillside Town Lights",
    category: "scenery",
    image: "/images/gallery/scenery-05-hillside-town-lights.webp",
    caption: "Buildings covering a hillside at dusk, with town lights beginning to glow.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-06",
    stepNumber: 9,
    sequenceNumber: "09",
    sequenceLabel: "Scenery",
    title: "Green Hills from Above",
    category: "scenery",
    image: "/images/gallery/scenery-06-green-hills-aerial.webp",
    caption: "An aerial view of green forested hills with a road curving across the slopes.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-07",
    stepNumber: 10,
    sequenceNumber: "10",
    sequenceLabel: "Scenery",
    title: "Hill Town and Valley",
    category: "scenery",
    image: "/images/gallery/scenery-07-hill-town-valley.webp",
    caption: "A colourful hillside town beside a road, with snow-capped mountains in the distance.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-08",
    stepNumber: 11,
    sequenceNumber: "11",
    sequenceLabel: "Scenery",
    title: "Winding Forest Road",
    category: "scenery",
    image: "/images/gallery/scenery-08-winding-road-forest.jpg",
    caption: "A road with sharp bends climbing through a dense forest at sunset.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-09",
    stepNumber: 12,
    sequenceNumber: "12",
    sequenceLabel: "Scenery",
    title: "Pines at Sunset",
    category: "scenery",
    image: "/images/gallery/scenery-09-pine-silhouette-sunset.jpg",
    caption: "Pine trees in silhouette against a fading sunset sky and low clouds.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-10",
    stepNumber: 13,
    sequenceNumber: "13",
    sequenceLabel: "Scenery",
    title: "Pine Tree and Cloudy Sky",
    category: "scenery",
    image: "/images/gallery/scenery-10-pine-cloudy-sky.jpg",
    caption: "A tall pine tree framed by a dramatic cloudy sky above the valley.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-scenery-11",
    stepNumber: 14,
    sequenceNumber: "14",
    sequenceLabel: "Scenery",
    title: "Mountain Ridges, Clear Sky",
    category: "scenery",
    image: "/images/gallery/scenery-11-mountain-ridges-clear-sky.avif",
    caption: "Layers of mountain ridges under a clear blue sky, seen past a line of trees.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-night-01",
    stepNumber: 15,
    sequenceNumber: "15",
    sequenceLabel: "Evening & Night",
    title: "Town Lights Through the Trees",
    category: "night",
    image: "/images/gallery/night-01-town-lights-trees.jpg",
    caption: "Distant town lights seen through bare trees on a dark night.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-night-02",
    stepNumber: 16,
    sequenceNumber: "16",
    sequenceLabel: "Evening & Night",
    title: "Blue Hour Over the Hills",
    category: "night",
    image: "/images/gallery/night-02-blue-hour-lights.jpg",
    caption: "A deep blue night sky above a hillside scattered with town lights.",
    isVerifiedPhoto: true
  },
  {
    id: "gallery-night-03",
    stepNumber: 17,
    sequenceNumber: "17",
    sequenceLabel: "Evening & Night",
    title: "Twilight Over the Hillside",
    category: "night",
    image: "/images/gallery/night-03-twilight-hillside.jpg",
    caption: "A hillside settlement at twilight with a winding road in the foreground.",
    isVerifiedPhoto: true
  }
];

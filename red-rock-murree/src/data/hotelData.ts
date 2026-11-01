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
  name: "Red Rock Murree",
  shortName: "Red Rock Murree",
  brandSubtitle: "Hotel in Murree",
  address: "Murree, Pakistan",
  phone: "Contact via WhatsApp",
  email: "", // not supplied by the owner yet; hidden when empty (see PENDING_HOTEL_INFORMATION.md)
  // UNVERIFIED defaults carried over from the template; listed in PENDING_HOTEL_INFORMATION.md
  checkInTime: "2:00 PM",
  checkOutTime: "12:00 PM",
  timesConfirmed: false, // set true once the owner confirms check-in/out times
  paymentPolicy: "Cash payment at the hotel. Booking inquiries are sent via WhatsApp."
};

// Only facilities supported by the existing photographs/data are listed.
// Everything else (Wi-Fi, power backup, climate control, housekeeping, in-room dining, 24/7 desk, ...)
// is parked in PENDING_HOTEL_INFORMATION.md until the owner confirms it.
export const RESORT_AMENITIES: AmenityService[] = [
  {
    id: "amenity-reception",
    title: "Reception",
    iconClass: "fa-concierge-bell",
    shortDesc: "The front desk at Red Rock Murree.",
    fullDesc: "The reception desk at Red Rock Murree.",
    schedule: "",
    image: "/images/01-reception.jpg"
  },
  {
    id: "amenity-parking",
    title: "Parking",
    iconClass: "fa-parking",
    shortDesc: "On-site parking.",
    fullDesc: "Parking is available at Red Rock Murree.",
    schedule: "",
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

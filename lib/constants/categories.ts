import { Tractor, Hammer, Camera, Fan } from 'lucide-react';

export const ASSET_CATEGORIES = [
  {
    id: 'farming',
    name: 'Farming & Heavy Machinery',
    icon: Tractor,
    subCategories: [
      { id: 'tractor', name: 'Tractors & Attachments', basePrice: 1500 },
      { id: 'harvesting', name: 'Harvesting Gear', basePrice: 4000 },
      { id: 'irrigation', name: 'Irrigation Tools', basePrice: 500 },
      { id: 'land_prep', name: 'Land Prep & Tillers', basePrice: 800 },
    ]
  },
  {
    id: 'construction',
    name: 'Construction & Power Tools',
    icon: Hammer,
    subCategories: [
      { id: 'heavy_duty', name: 'Concrete & Heavy Duty', basePrice: 1000 },
      { id: 'power_tools', name: 'Handheld Power Tools', basePrice: 300 },
      { id: 'lifting', name: 'Scaffolding & Ladders', basePrice: 400 },
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics & Professional Gadgets',
    icon: Camera,
    subCategories: [
      { id: 'photography', name: 'Cameras & Lighting', basePrice: 800 },
      { id: 'office', name: 'Projectors & Scanners', basePrice: 500 },
      { id: 'computing', name: 'High-end Computing', basePrice: 1200 },
    ]
  },
  {
    id: 'home_outdoor',
    name: 'Home & Outdoor Appliances',
    icon: Fan,
    subCategories: [
      { id: 'cleaning', name: 'Pressure & Steam Cleaners', basePrice: 400 },
      { id: 'climate', name: 'Portable Coolers & Fans', basePrice: 300 },
      { id: 'camping', name: 'Tents & Generators', basePrice: 600 },
    ]
  }
];

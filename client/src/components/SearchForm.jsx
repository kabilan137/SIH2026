import {
  BriefcaseBusiness,
  MapPin,
  Radar,
  Search,
  Coffee,
  Utensils,
  BookOpen,
  Dumbbell,
  Shirt,
  Croissant,
  Sparkles,
  Plus,
  Landmark,
  Shield,
  HeartPulse,
  GraduationCap,
  Plane,
  Trees,
  Car,
  Film,
  ShoppingBag,
  Hammer,
  Scissors,
  Scale,
  Library,
  MoreHorizontal,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import MapPicker from './MapPicker.jsx';
import LiquidGlass from './LiquidGlass.jsx';
import { getNicheSuggestions } from '../api/analysisApi.js';

const initialValues = {
  location: '',
  businessType: '',
  niche: '',
  radius: 5000,
  maxCompetitors: 10
};

const BUSINESS_TILES = [
  { id: 'coffee', label: 'Coffee shop', icon: Coffee, image: '/images/coffee_shop.png' },
  { id: 'restaurant', label: 'Restaurant', icon: Utensils, image: '/images/restaurant.png' },
  { id: 'bookstore', label: 'Bookstore', icon: BookOpen, image: '/images/bookstore.png' },
  { id: 'gym', label: 'Gym', icon: Dumbbell, image: '/images/gym.png' },
  { id: 'boutique', label: 'Clothing boutique', icon: Shirt, image: '/images/boutique.png' },
  { id: 'bakery', label: 'Bakery', icon: Croissant, image: '/images/bakery.png' }
];

const GOOGLE_PLACE_TYPES = [
  { id: 'accounting', label: 'Accounting' },
  { id: 'airport', label: 'Airport' },
  { id: 'amusement_park', label: 'Amusement park' },
  { id: 'aquarium', label: 'Aquarium' },
  { id: 'art_gallery', label: 'Art gallery' },
  { id: 'atm', label: 'Atm' },
  { id: 'bakery', label: 'Bakery' },
  { id: 'bank', label: 'Bank' },
  { id: 'bar', label: 'Bar' },
  { id: 'beauty_salon', label: 'Beauty salon' },
  { id: 'bicycle_store', label: 'Bicycle store' },
  { id: 'book_store', label: 'Book store' },
  { id: 'bowling_alley', label: 'Bowling alley' },
  { id: 'bus_station', label: 'Bus station' },
  { id: 'cafe', label: 'Cafe' },
  { id: 'campground', label: 'Campground' },
  { id: 'car_dealer', label: 'Car dealer' },
  { id: 'car_rental', label: 'Car rental' },
  { id: 'car_repair', label: 'Car repair' },
  { id: 'car_wash', label: 'Car wash' },
  { id: 'casino', label: 'Casino' },
  { id: 'cemetery', label: 'Cemetery' },
  { id: 'church', label: 'Church' },
  { id: 'city_hall', label: 'City hall' },
  { id: 'clothing_store', label: 'Clothing store' },
  { id: 'convenience_store', label: 'Convenience store' },
  { id: 'courthouse', label: 'Courthouse' },
  { id: 'dentist', label: 'Dentist' },
  { id: 'department_store', label: 'Department store' },
  { id: 'doctor', label: 'Doctor' },
  { id: 'drugstore', label: 'Drugstore' },
  { id: 'electrician', label: 'Electrician' },
  { id: 'electronics_store', label: 'Electronics store' },
  { id: 'embassy', label: 'Embassy' },
  { id: 'fire_station', label: 'Fire station' },
  { id: 'florist', label: 'Florist' },
  { id: 'funeral_home', label: 'Funeral home' },
  { id: 'furniture_store', label: 'Furniture store' },
  { id: 'gas_station', label: 'Gas station' },
  { id: 'gym', label: 'Gym' },
  { id: 'hair_care', label: 'Hair care' },
  { id: 'hardware_store', label: 'Hardware store' },
  { id: 'hindu_temple', label: 'Hindu temple' },
  { id: 'home_goods_store', label: 'Home goods store' },
  { id: 'hospital', label: 'Hospital' },
  { id: 'insurance_agency', label: 'Insurance agency' },
  { id: 'jewelry_store', label: 'Jewelry store' },
  { id: 'laundry', label: 'Laundry' },
  { id: 'lawyer', label: 'Lawyer' },
  { id: 'library', label: 'Library' },
  { id: 'light_rail_station', label: 'Light rail station' },
  { id: 'liquor_store', label: 'Liquor store' },
  { id: 'local_government_office', label: 'Local government office' },
  { id: 'locksmith', label: 'Locksmith' },
  { id: 'lodging', label: 'Lodging' },
  { id: 'meal_delivery', label: 'Meal delivery' },
  { id: 'meal_takeaway', label: 'Meal takeaway' },
  { id: 'mosque', label: 'Mosque' },
  { id: 'movie_rental', label: 'Movie rental' },
  { id: 'movie_theater', label: 'Movie theater' },
  { id: 'moving_company', label: 'Moving company' },
  { id: 'museum', label: 'Museum' },
  { id: 'night_club', label: 'Night club' },
  { id: 'painter', label: 'Painter' },
  { id: 'park', label: 'Park' },
  { id: 'parking', label: 'Parking' },
  { id: 'pet_store', label: 'Pet store' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'physiotherapist', label: 'Physiotherapist' },
  { id: 'plumber', label: 'Plumber' },
  { id: 'police', label: 'Police' },
  { id: 'post_office', label: 'Post office' },
  { id: 'primary_school', label: 'Primary school' },
  { id: 'real_estate_agency', label: 'Real estate agency' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'roofing_contractor', label: 'Roofing contractor' },
  { id: 'rv_park', label: 'Rv park' },
  { id: 'school', label: 'School' },
  { id: 'secondary_school', label: 'Secondary school' },
  { id: 'shoe_store', label: 'Shoe store' },
  { id: 'shopping_mall', label: 'Shopping mall' },
  { id: 'spa', label: 'Spa' },
  { id: 'stadium', label: 'Stadium' },
  { id: 'storage', label: 'Storage' },
  { id: 'store', label: 'Store' },
  { id: 'subway_station', label: 'Subway station' },
  { id: 'supermarket', label: 'Supermarket' },
  { id: 'synagogue', label: 'Synagogue' },
  { id: 'taxi_stand', label: 'Taxi stand' },
  { id: 'tourist_attraction', label: 'Tourist attraction' },
  { id: 'train_station', label: 'Train station' },
  { id: 'transit_station', label: 'Transit station' },
  { id: 'travel_agency', label: 'Travel agency' },
  { id: 'university', label: 'University' },
  { id: 'veterinary_care', label: 'Veterinary care' },
  { id: 'zoo', label: 'Zoo' }
];

const ICON_MAP = {
  accounting: Landmark,
  airport: Plane,
  amusement_park: Trees,
  aquarium: Sparkles,
  art_gallery: Sparkles,
  atm: Landmark,
  bakery: Croissant,
  bank: Landmark,
  bar: Utensils,
  beauty_salon: Scissors,
  bicycle_store: Car,
  book_store: BookOpen,
  bowling_alley: Film,
  bus_station: Car,
  cafe: Coffee,
  campground: Trees,
  car_dealer: Car,
  car_rental: Car,
  car_repair: Car,
  car_wash: Car,
  casino: Film,
  cemetery: Trees,
  church: Landmark,
  city_hall: BriefcaseBusiness,
  clothing_store: Shirt,
  convenience_store: ShoppingBag,
  courthouse: Scale,
  dentist: HeartPulse,
  department_store: ShoppingBag,
  doctor: HeartPulse,
  drugstore: ShoppingBag,
  electrician: Hammer,
  electronics_store: ShoppingBag,
  embassy: BriefcaseBusiness,
  fire_station: Shield,
  florist: ShoppingBag,
  funeral_home: Trees,
  furniture_store: ShoppingBag,
  gas_station: Car,
  gym: Dumbbell,
  hair_care: Scissors,
  hardware_store: Hammer,
  hindu_temple: Landmark,
  home_goods_store: ShoppingBag,
  hospital: HeartPulse,
  insurance_agency: Landmark,
  jewelry_store: ShoppingBag,
  laundry: Sparkles,
  lawyer: Scale,
  library: BookOpen,
  light_rail_station: Car,
  liquor_store: ShoppingBag,
  local_government_office: BriefcaseBusiness,
  locksmith: Hammer,
  lodging: Trees,
  meal_delivery: Utensils,
  meal_takeaway: Utensils,
  mosque: Landmark,
  movie_rental: Film,
  movie_theater: Film,
  moving_company: Car,
  museum: Sparkles,
  night_club: Utensils,
  painter: Hammer,
  park: Trees,
  parking: Car,
  pet_store: ShoppingBag,
  pharmacy: HeartPulse,
  physiotherapist: HeartPulse,
  plumber: Hammer,
  police: Shield,
  post_office: BriefcaseBusiness,
  primary_school: GraduationCap,
  real_estate_agency: Landmark,
  restaurant: Utensils,
  roofing_contractor: Hammer,
  rv_park: Trees,
  school: GraduationCap,
  secondary_school: GraduationCap,
  shoe_store: Shirt,
  shopping_mall: ShoppingBag,
  spa: Scissors,
  stadium: Film,
  storage: ShoppingBag,
  store: ShoppingBag,
  subway_station: Car,
  supermarket: ShoppingBag,
  synagogue: Landmark,
  taxi_stand: Car,
  tourist_attraction: Sparkles,
  train_station: Car,
  transit_station: Car,
  travel_agency: Sparkles,
  university: GraduationCap,
  veterinary_care: HeartPulse,
  zoo: Trees
};

function getTypeIcon(typeId) {
  return ICON_MAP[typeId] || BriefcaseBusiness;
}

function getTypeImage(typeId) {
  const imageMap = {
    bakery: '/images/bakery.png',
    cafe: '/images/coffee_shop.png',
    restaurant: '/images/restaurant.png',
    bar: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=80',
    night_club: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80',
    meal_delivery: 'https://images.unsplash.com/photo-1526367790999-0150786486a9?auto=format&fit=crop&w=400&q=80',
    meal_takeaway: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=400&q=80',
    
    book_store: '/images/bookstore.png',
    clothing_store: '/images/boutique.png',
    shoe_store: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80',
    shopping_mall: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80',
    supermarket: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    convenience_store: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80',
    department_store: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80',
    electronics_store: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&q=80',
    florist: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=400&q=80',
    furniture_store: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=80',
    hardware_store: 'https://images.unsplash.com/photo-1581781898089-9158ac9d48ad?auto=format&fit=crop&w=400&q=80',
    home_goods_store: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
    jewelry_store: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=400&q=80',
    pet_store: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=400&q=80',
    liquor_store: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=400&q=80',

    gym: '/images/gym.png',
    spa: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
    beauty_salon: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80',
    hair_care: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=400&q=80',
    dentist: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=400&q=80',
    doctor: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80',
    hospital: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=400&q=80',
    pharmacy: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=400&q=80',
    physiotherapist: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80',
    veterinary_care: 'https://images.unsplash.com/photo-1581888227599-779811939961?auto=format&fit=crop&w=400&q=80',

    amusement_park: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
    aquarium: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&w=400&q=80',
    art_gallery: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80',
    museum: 'https://images.unsplash.com/photo-1566121318599-4148e8e34898?auto=format&fit=crop&w=400&q=80',
    movie_theater: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80',
    stadium: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    tourist_attraction: 'https://images.unsplash.com/photo-1500835595337-f7400171131b?auto=format&fit=crop&w=400&q=80',
    casino: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=400&q=80',
    campground: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=400&q=80',
    lodging: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
    rv_park: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=400&q=80',

    airport: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=400&q=80',
    bus_station: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80',
    car_rental: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=400&q=80',
    taxi_stand: 'https://images.unsplash.com/photo-1492664738948-2ec93a5c0942?auto=format&fit=crop&w=400&q=80',
    train_station: 'https://images.unsplash.com/photo-1532245128407-bf40f991ca82?auto=format&fit=crop&w=400&q=80',
    subway_station: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80',

    library: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=400&q=80',
    school: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=400&q=80',
    primary_school: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80',
    secondary_school: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=400&q=80',
    university: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5c?auto=format&fit=crop&w=400&q=80',
    city_hall: 'https://images.unsplash.com/photo-1548345680-f5475ea5df84?auto=format&fit=crop&w=400&q=80',
    courthouse: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
    embassy: 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=400&q=80',
    local_government_office: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80',

    accounting: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
    bank: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?auto=format&fit=crop&w=400&q=80',
    atm: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?auto=format&fit=crop&w=400&q=80',
    insurance_agency: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80',
    lawyer: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
    real_estate_agency: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80',

    car_repair: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=400&q=80',
    car_wash: 'https://images.unsplash.com/photo-1520340356584-f9917d1ecc69?auto=format&fit=crop&w=400&q=80',
    electrician: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
    locksmith: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    painter: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80',
    plumber: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
    roofing_contractor: 'https://images.unsplash.com/photo-1632759162443-4137c413e657?auto=format&fit=crop&w=400&q=80',
    moving_company: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=400&q=80',
    laundry: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=400&q=80',
    storage: 'https://images.unsplash.com/photo-1580913179261-26786c12b7a2?auto=format&fit=crop&w=400&q=80',
    travel_agency: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',

    church: 'https://images.unsplash.com/photo-1438274970820-53fda83b8b14?auto=format&fit=crop&w=400&q=80',
    mosque: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&q=80',
    synagogue: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&w=400&q=80',
    hindu_temple: 'https://images.unsplash.com/photo-1609137144813-91b42fa9161a?auto=format&fit=crop&w=400&q=80',
    cemetery: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=400&q=80',

    fire_station: 'https://images.unsplash.com/photo-1598006509650-7170135d5dfa?auto=format&fit=crop&w=400&q=80',
    police: 'https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?auto=format&fit=crop&w=400&q=80',
    post_office: 'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?auto=format&fit=crop&w=400&q=80'
  };

  return imageMap[typeId] || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80';
}

function SearchForm({ onSubmit, loading }) {
  const [values, setValues] = useState(initialValues);
  const [selectedTile, setSelectedTile] = useState(null);
  const [nicheSuggestions, setNicheSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState(null);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value
    }));
  }

  // Handle tile selection
  function handleTileSelect(tile) {
    if (tile === 'custom') {
      setSelectedTile('custom');
      updateField('businessType', '');
    } else {
      setSelectedTile(tile.id);
      updateField('businessType', tile.label);
    }
    setNicheSuggestions([]); // Clear suggestions when business type changes
  }

  // Fetch niche suggestions using Mistral AI
  async function fetchNicheSuggestions() {
    if (!values.businessType || values.businessType.trim().length < 2) return;
    
    setLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const data = await getNicheSuggestions(values.businessType, values.location);
      if (Array.isArray(data)) {
        setNicheSuggestions(data);
        setShowSuggestionsModal(true);
      } else {
        setSuggestionError('Failed to fetch suggestions');
      }
    } catch (err) {
      console.error('Niche suggestions fetch failed:', err);
      setSuggestionError(err.message || 'Error calling suggestions API');
    } finally {
      setLoadingSuggestions(false);
    }
  }

  const matchedCoreTile = BUSINESS_TILES.find(t => t.label === values.businessType);
  const isCoreSelected = !!matchedCoreTile && selectedTile === matchedCoreTile.id;
  const isCustomSelected = selectedTile === 'custom' || selectedTile === 'custom-selection';

  // Let's determine if a non-core tile should be rendered
  let nonCoreTile = null;
  if (values.businessType && !matchedCoreTile) {
    const matchedPlaceType = GOOGLE_PLACE_TYPES.find(
      t => t.label.toLowerCase() === values.businessType.toLowerCase() ||
           t.id === values.businessType.toLowerCase().replace(/\s+/g, '_')
    );
    if (matchedPlaceType) {
      nonCoreTile = {
        id: matchedPlaceType.id,
        label: matchedPlaceType.label,
        icon: getTypeIcon(matchedPlaceType.id),
        image: getTypeImage(matchedPlaceType.id)
      };
    } else {
      nonCoreTile = {
        id: 'custom-selection',
        label: values.businessType,
        icon: BriefcaseBusiness,
        image: getTypeImage('custom')
      };
    }
  }

  // Fetch suggestions automatically when businessType changes (after typing stop or on tile click)
  useEffect(() => {
    if (selectedTile && !isCustomSelected) {
      fetchNicheSuggestions();
    }
  }, [values.businessType, selectedTile]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...values,
      radius: Number(values.radius),
      maxCompetitors: Number(values.maxCompetitors),
      niche: values.niche.trim() || undefined
    });
  }

  return (
    <>
      <form className="search-form panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">New analysis</p>
          <h1>Evaluate a launch location</h1>
        </div>
      </div>

      {/* ── Two-Column Command Console ─────────────────────────── */}
      <div className="console-columns">
        {/* ── Left Panel: Location & Map ─────────────────────── */}
        <div className="console-left-panel">
          {/* Pinpoint Location (Map Selection) */}
          <div className="field">
            <span>
              <MapPin size={16} aria-hidden="true" />
              Location
            </span>
            <MapPicker
              value={values.location}
              onChange={(val) => updateField('location', val)}
            />
          </div>

          <div className="form-row">
            <label className="field">
              <span>
                <Radar size={16} aria-hidden="true" />
                Radius
              </span>
              <select value={values.radius} onChange={(event) => updateField('radius', event.target.value)}>
                <option value={1000}>1 km</option>
                <option value={3000}>3 km</option>
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
                <option value={25000}>25 km</option>
              </select>
            </label>

            <label className="field">
              <span>Competitors</span>
              <input
                type="number"
                value={values.maxCompetitors}
                onChange={(event) => updateField('maxCompetitors', event.target.value)}
                min={1}
                max={20}
              />
            </label>
          </div>
        </div>

        {/* ── Right Panel: Business Type & Niche ────────────── */}
        <div className="console-right-panel">
          {/* Business Type Tiles */}
          <div className="field">
            <span>
              <BriefcaseBusiness size={16} aria-hidden="true" />
              Business type
            </span>
            <div className="business-tiles-grid">
              {BUSINESS_TILES.map((tile) => {
                const IconComponent = tile.icon;
                const isActive = isCoreSelected && selectedTile === tile.id;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={`business-tile ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedTile(tile.id);
                      updateField('businessType', tile.label);
                      setNicheSuggestions([]);
                      setShowSuggestionsModal(true);
                    }}
                    style={{ '--tile-bg': `url(${tile.image})` }}
                  >
                    <div className="business-tile-bg" />
                    <div className="business-tile-content">
                      <IconComponent size={16} className="tile-icon" />
                      <span className="tile-label">{tile.label}</span>
                    </div>
                  </button>
                );
              })}

              {/* Dynamic Non-Core Tile if selected */}
              {nonCoreTile && (
                <button
                  type="button"
                  className="business-tile active"
                  onClick={() => {
                    // Clicking does nothing as it's already active
                  }}
                  style={{ '--tile-bg': `url(${nonCoreTile.image})` }}
                >
                  <div className="business-tile-bg" style={{ opacity: 0.35, filter: 'blur(0) brightness(0.5)', transform: 'scale(1.02)' }} />
                  <div className="business-tile-content">
                    <nonCoreTile.icon size={16} className="tile-icon" />
                    <span className="tile-label">{nonCoreTile.label}</span>
                  </div>
                </button>
              )}
              
              {/* Show More option tile */}
              <button
                type="button"
                className="business-tile custom-tile"
                onClick={() => setShowMoreModal(true)}
              >
                <div className="business-tile-content">
                  <MoreHorizontal size={16} className="tile-icon" />
                  <span className="tile-label">Show More</span>
                </div>
              </button>
            </div>
          </div>

          {/* Niche Input with AI suggestions */}
          <div className="field niche-field-container">
            <span>Niche (Optional)</span>
            
            <div className="niche-input-wrapper">
              <input
                type="text"
                value={values.niche}
                onChange={(event) => updateField('niche', event.target.value)}
                placeholder="Enter a custom niche (e.g. Specialty espresso, Vegan bakery)..."
                maxLength={120}
                className="niche-input"
              />
              {values.businessType && values.businessType.trim().length >= 2 && (
                <button
                  type="button"
                  className={`suggestions-toggle-btn ${nicheSuggestions.length > 0 ? 'active' : ''}`}
                  onClick={() => {
                    setShowSuggestionsModal(true);
                    if (nicheSuggestions.length === 0 && !loadingSuggestions) {
                      fetchNicheSuggestions();
                    }
                  }}
                  title="AI suggestions"
                >
                  <Sparkles size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Full-Width Submit CTA ─────────────────────────────── */}
      <button
        type="submit"
        className="primary-button"
        disabled={loading || !values.location || !values.businessType}
      >
        <Search size={18} aria-hidden="true" />
        {loading ? 'Analyzing' : 'Run analysis'}
      </button>
    </form>

    {/* Select Business Type Modal overlay */}
    {showMoreModal && (
      <SelectBusinessTypeModal
        onClose={() => {
          setShowMoreModal(false);
        }}
        onSelect={(label, id) => {
          setSelectedTile(id);
          updateField('businessType', label);
          setNicheSuggestions([]);
          setShowSuggestionsModal(true);
          setShowMoreModal(false);
        }}
        currentSelection={values.businessType}
      />
    )}

    {/* Select Niche Suggestions Modal overlay */}
    {showSuggestionsModal && (
      <SelectNicheModal
        onClose={() => setShowSuggestionsModal(false)}
        suggestions={nicheSuggestions}
        loading={loadingSuggestions}
        error={suggestionError}
        onSelect={(suggestion) => {
          updateField('niche', suggestion);
          setShowSuggestionsModal(false);
        }}
        currentSelection={values.niche}
        onGenerate={fetchNicheSuggestions}
        businessType={values.businessType}
      />
    )}
  </>
);
}

function SelectBusinessTypeModal({ onClose, onSelect, currentSelection }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Google Place Types based on searchQuery
  const filteredTypes = GOOGLE_PLACE_TYPES.filter(type => {
    return (
      type.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Check if there is an exact or near match in GOOGLE_PLACE_TYPES or BUSINESS_TILES
  const hasExactMatch = GOOGLE_PLACE_TYPES.some(
    type => type.label.toLowerCase() === searchQuery.trim().toLowerCase()
  ) || BUSINESS_TILES.some(
    tile => tile.label.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  function handleCustomSelect(e) {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      onSelect(searchQuery.trim(), 'custom');
    }
  }

  // Handle clicking on overlay background to close
  function handleOverlayClick(e) {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2>Select Business Type</h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Scrollable grid of place type tiles */}
          <div className="modal-tiles-wrapper">
            <div className="modal-tiles-grid">
              {filteredTypes.map((type) => {
                const IconComponent = getTypeIcon(type.id);
                const imageUrl = getTypeImage(type.id);
                const isActive = currentSelection.toLowerCase() === type.label.toLowerCase();
                
                return (
                  <button
                    key={type.id}
                    type="button"
                    className={`business-tile ${isActive ? 'active' : ''}`}
                    onClick={() => onSelect(type.label, type.id)}
                    style={{ '--tile-bg': `url(${imageUrl})` }}
                  >
                    <div className="business-tile-bg" />
                    <div className="business-tile-content">
                      <IconComponent size={22} className="tile-icon" />
                      <span className="tile-label" style={{ fontSize: '0.8rem' }}>{type.label}</span>
                    </div>
                  </button>
                );
              })}

              {filteredTypes.length === 0 && (
                <div className="no-results-message">
                  No standard business types match "{searchQuery}"
                </div>
              )}
            </div>
          </div>

          {/* Text box at the end for search & custom selection */}
          <div className="modal-footer-search-container">
            <span className="modal-footer-search-label">
              Search types or type a custom business:
            </span>
            
            <form onSubmit={handleCustomSelect} className="modal-footer-input-row">
              <div className="modal-search-wrapper">
                <Search className="modal-search-icon" size={16} />
                <input
                  type="text"
                  placeholder="Type to search or enter custom type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="modal-search-input"
                  minLength={2}
                  maxLength={100}
                  autoFocus
                />
              </div>
            </form>

            {/* Custom type action recommendation */}
            {searchQuery.trim().length >= 2 && !hasExactMatch && (
              <div className="modal-custom-type-action">
                <span className="modal-custom-type-text">
                  Treat <strong>"{searchQuery.trim()}"</strong> as a custom type
                </span>
                <button
                  type="button"
                  className="modal-custom-type-btn"
                  onClick={() => onSelect(searchQuery.trim(), 'custom')}
                >
                  <Plus size={14} />
                  Use Custom Type
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectNicheModal({ onClose, onSelect, suggestions, loading, error, currentSelection, onGenerate, businessType }) {
  // Handle clicking on overlay background to close
  function handleOverlayClick(e) {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container niche-modal-container">
        <div className="modal-header">
          <div className="niche-modal-header-title">
            <Sparkles size={18} className="sparkle-icon" />
            <h2>AI Generated Suggestions</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="niche-modal-loading">
              <div className="suggestion-bubble loading-bubble">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
                <span>Generating suggestions for "{businessType}"...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="niche-modal-error">
              <div className="suggestion-bubble error-bubble">
                <span>⚠️ {error}</span>
              </div>
              <button type="button" className="secondary-button retry-btn" onClick={onGenerate}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div className="niche-modal-empty">
              <p>No suggestions generated for "{businessType || 'this business type'}" yet.</p>
              <button type="button" className="primary-button generate-btn" onClick={onGenerate}>
                <Sparkles size={16} />
                Generate suggestions
              </button>
            </div>
          )}

          {!loading && !error && suggestions.length > 0 && (
            <div className="niche-modal-list">
              {suggestions.map((suggestion, idx) => {
                const isSelected = currentSelection === suggestion;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`suggestion-bubble ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelect(suggestion)}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchForm;

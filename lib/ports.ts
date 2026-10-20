/**
 * Reference data for the expedition destination form.
 *
 * COUNTRIES is a plain list of country / territory names.
 * PORTS is a curated list of harbours and anchorages in the regions SailFuture
 * expeditions sail (Florida, Gulf and East Coast, Bahamas, Caribbean, Central
 * America, Atlantic islands and Western Europe). Coordinates are approximate
 * harbour positions in decimal degrees and are meant as a starting point that
 * staff can fine-tune. Timezone strings match the TIMEZONES options used by
 * the destination dialog.
 */

export interface PortDefinition {
  name: string
  country: string
  lat: number
  long: number
  timezone: string
}

// Unicode minus sign, matching the timezone option labels ("UTC−4").
const M = "−"
const UTC_M6 = `UTC${M}6`
const UTC_M5 = `UTC${M}5`
const UTC_M4 = `UTC${M}4`
const UTC_M1 = `UTC${M}1`
const UTC_0 = "UTC±0"
const UTC_P1 = "UTC+1"
const UTC_P2 = "UTC+2"

export const COUNTRIES: string[] = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Anguilla", "Antigua & Barbuda", "Argentina", "Armenia",
  "Aruba", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia", "Bonaire", "Bosnia & Herzegovina", "Botswana", "Brazil",
  "British Virgin Islands", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada",
  "Cape Verde", "Cayman Islands", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Curaçao", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini",
  "Ethiopia", "Fiji", "Finland", "France", "French Guiana", "French Polynesia", "Gabon", "Gambia", "Georgia",
  "Germany", "Ghana", "Gibraltar", "Greece", "Greenland", "Grenada", "Guadeloupe", "Guatemala", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Martinique",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Montserrat",
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
  "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Puerto Rico", "Qatar", "Romania",
  "Russia", "Rwanda", "Saba", "Saint Barthélemy", "Saint Kitts & Nevis", "Saint Lucia", "Saint Martin",
  "Saint Vincent & the Grenadines", "Samoa", "San Marino", "São Tomé & Príncipe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Sint Eustatius", "Sint Maarten", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste",
  "Togo", "Tonga", "Trinidad & Tobago", "Tunisia", "Turkey", "Turkmenistan", "Turks & Caicos Islands", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "US Virgin Islands",
  "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
]

function p(name: string, country: string, lat: number, long: number, timezone: string): PortDefinition {
  return { name, country, lat, long, timezone }
}

export const PORTS: PortDefinition[] = [
  // United States – Florida
  p("St. Petersburg", "United States", 27.7676, -82.6403, UTC_M5),
  p("Tampa", "United States", 27.9506, -82.4572, UTC_M5),
  p("Clearwater", "United States", 27.9659, -82.8001, UTC_M5),
  p("Fort Myers", "United States", 26.6406, -81.8723, UTC_M5),
  p("Naples", "United States", 26.1420, -81.7948, UTC_M5),
  p("Key West", "United States", 24.5551, -81.7800, UTC_M5),
  p("Marathon", "United States", 24.7137, -81.0905, UTC_M5),
  p("Key Largo", "United States", 25.0865, -80.4473, UTC_M5),
  p("Dry Tortugas", "United States", 24.6285, -82.8732, UTC_M5),
  p("Miami", "United States", 25.7617, -80.1918, UTC_M5),
  p("Fort Lauderdale", "United States", 26.1224, -80.1373, UTC_M5),
  p("West Palm Beach", "United States", 26.7153, -80.0534, UTC_M5),
  p("Fort Pierce", "United States", 27.4467, -80.3256, UTC_M5),
  p("Cape Canaveral", "United States", 28.4058, -80.6048, UTC_M5),
  p("St. Augustine", "United States", 29.9012, -81.3124, UTC_M5),
  p("Jacksonville", "United States", 30.3322, -81.6557, UTC_M5),
  p("Pensacola", "United States", 30.4213, -87.2169, UTC_M6),
  // United States – Gulf and East Coast
  p("Mobile", "United States", 30.6954, -88.0399, UTC_M6),
  p("New Orleans", "United States", 29.9511, -90.0715, UTC_M6),
  p("Galveston", "United States", 29.3013, -94.7977, UTC_M6),
  p("Savannah", "United States", 32.0809, -81.0912, UTC_M5),
  p("Charleston", "United States", 32.7765, -79.9311, UTC_M5),
  p("Beaufort", "United States", 34.7182, -76.6638, UTC_M5),
  p("Norfolk", "United States", 36.8508, -76.2859, UTC_M5),
  p("Annapolis", "United States", 38.9784, -76.4922, UTC_M5),
  p("Newport", "United States", 41.4901, -71.3128, UTC_M5),
  // Canada
  p("Halifax", "Canada", 44.6488, -63.5752, UTC_M4),
  // Bermuda
  p("St. George's", "Bermuda", 32.3817, -64.6781, UTC_M4),
  p("Hamilton", "Bermuda", 32.2949, -64.7814, UTC_M4),
  // Bahamas
  p("Nassau", "Bahamas", 25.0480, -77.3554, UTC_M5),
  p("Bimini", "Bahamas", 25.7279, -79.2973, UTC_M5),
  p("Freeport", "Bahamas", 26.5333, -78.7000, UTC_M5),
  p("Marsh Harbour", "Bahamas", 26.5412, -77.0636, UTC_M5),
  p("Hope Town", "Bahamas", 26.5361, -76.9578, UTC_M5),
  p("Green Turtle Cay", "Bahamas", 26.7667, -77.3333, UTC_M5),
  p("Andros Town", "Bahamas", 24.7000, -77.7833, UTC_M5),
  p("Staniel Cay", "Bahamas", 24.1710, -76.4428, UTC_M5),
  p("George Town", "Bahamas", 23.5063, -75.7682, UTC_M5),
  p("Clarence Town", "Bahamas", 23.1000, -74.9833, UTC_M5),
  p("Matthew Town", "Bahamas", 20.9500, -73.6833, UTC_M5),
  // Turks & Caicos
  p("Providenciales", "Turks & Caicos Islands", 21.7740, -72.2660, UTC_M5),
  p("Grand Turk", "Turks & Caicos Islands", 21.4675, -71.1389, UTC_M5),
  // Cuba
  p("Havana", "Cuba", 23.1136, -82.3666, UTC_M5),
  p("Varadero", "Cuba", 23.1389, -81.2861, UTC_M5),
  p("Cienfuegos", "Cuba", 22.1461, -80.4356, UTC_M5),
  p("Santiago de Cuba", "Cuba", 20.0247, -75.8219, UTC_M5),
  // Cayman Islands
  p("George Town", "Cayman Islands", 19.2869, -81.3674, UTC_M5),
  // Jamaica
  p("Montego Bay", "Jamaica", 18.4762, -77.8939, UTC_M5),
  p("Ocho Rios", "Jamaica", 18.4075, -77.1031, UTC_M5),
  p("Port Antonio", "Jamaica", 18.1763, -76.4555, UTC_M5),
  p("Kingston", "Jamaica", 17.9714, -76.7931, UTC_M5),
  // Haiti
  p("Cap-Haïtien", "Haiti", 19.7580, -72.2043, UTC_M5),
  p("Port-au-Prince", "Haiti", 18.5944, -72.3074, UTC_M5),
  // Dominican Republic
  p("Luperón", "Dominican Republic", 19.8911, -70.9600, UTC_M4),
  p("Puerto Plata", "Dominican Republic", 19.7934, -70.6884, UTC_M4),
  p("Samaná", "Dominican Republic", 19.2058, -69.3364, UTC_M4),
  p("Punta Cana", "Dominican Republic", 18.5601, -68.3725, UTC_M4),
  p("La Romana", "Dominican Republic", 18.4273, -68.9728, UTC_M4),
  p("Boca Chica", "Dominican Republic", 18.4500, -69.6000, UTC_M4),
  p("Santo Domingo", "Dominican Republic", 18.4861, -69.9312, UTC_M4),
  // Puerto Rico
  p("San Juan", "Puerto Rico", 18.4655, -66.1057, UTC_M4),
  p("Fajardo", "Puerto Rico", 18.3258, -65.6524, UTC_M4),
  p("Culebra", "Puerto Rico", 18.3103, -65.3031, UTC_M4),
  p("Vieques", "Puerto Rico", 18.1263, -65.4401, UTC_M4),
  p("Ponce", "Puerto Rico", 17.9700, -66.6141, UTC_M4),
  p("Salinas", "Puerto Rico", 17.9774, -66.2974, UTC_M4),
  p("Mayagüez", "Puerto Rico", 18.2013, -67.1397, UTC_M4),
  // US Virgin Islands
  p("Charlotte Amalie", "US Virgin Islands", 18.3419, -64.9307, UTC_M4),
  p("Cruz Bay", "US Virgin Islands", 18.3315, -64.7937, UTC_M4),
  p("Christiansted", "US Virgin Islands", 17.7466, -64.7032, UTC_M4),
  // British Virgin Islands
  p("Road Town", "British Virgin Islands", 18.4286, -64.6185, UTC_M4),
  p("Spanish Town", "British Virgin Islands", 18.4480, -64.4350, UTC_M4),
  p("Jost Van Dyke", "British Virgin Islands", 18.4458, -64.7500, UTC_M4),
  p("Anegada", "British Virgin Islands", 18.7300, -64.3200, UTC_M4),
  // Leeward Islands
  p("Road Bay", "Anguilla", 18.2000, -63.0833, UTC_M4),
  p("Marigot", "Saint Martin", 18.0671, -63.0824, UTC_M4),
  p("Philipsburg", "Sint Maarten", 18.0255, -63.0450, UTC_M4),
  p("Gustavia", "Saint Barthélemy", 17.8962, -62.8498, UTC_M4),
  p("Fort Bay", "Saba", 17.6167, -63.2500, UTC_M4),
  p("Oranjestad", "Sint Eustatius", 17.4833, -62.9833, UTC_M4),
  p("Basseterre", "Saint Kitts & Nevis", 17.3026, -62.7177, UTC_M4),
  p("Charlestown", "Saint Kitts & Nevis", 17.1383, -62.6217, UTC_M4),
  p("English Harbour", "Antigua & Barbuda", 17.0050, -61.7640, UTC_M4),
  p("Jolly Harbour", "Antigua & Barbuda", 17.0718, -61.8880, UTC_M4),
  p("St. John's", "Antigua & Barbuda", 17.1274, -61.8468, UTC_M4),
  p("Little Bay", "Montserrat", 16.7950, -62.2100, UTC_M4),
  p("Pointe-à-Pitre", "Guadeloupe", 16.2410, -61.5331, UTC_M4),
  p("Deshaies", "Guadeloupe", 16.3060, -61.7940, UTC_M4),
  p("Terre-de-Haut", "Guadeloupe", 15.8650, -61.5840, UTC_M4),
  p("Portsmouth", "Dominica", 15.5833, -61.4667, UTC_M4),
  p("Roseau", "Dominica", 15.3017, -61.3881, UTC_M4),
  // Windward Islands
  p("Saint-Pierre", "Martinique", 14.7431, -61.1758, UTC_M4),
  p("Fort-de-France", "Martinique", 14.6161, -61.0588, UTC_M4),
  p("Le Marin", "Martinique", 14.4667, -60.8667, UTC_M4),
  p("Rodney Bay", "Saint Lucia", 14.0760, -60.9490, UTC_M4),
  p("Castries", "Saint Lucia", 14.0101, -60.9875, UTC_M4),
  p("Marigot Bay", "Saint Lucia", 13.9661, -61.0239, UTC_M4),
  p("Soufrière", "Saint Lucia", 13.8561, -61.0569, UTC_M4),
  p("Kingstown", "Saint Vincent & the Grenadines", 13.1600, -61.2248, UTC_M4),
  p("Port Elizabeth (Bequia)", "Saint Vincent & the Grenadines", 13.0105, -61.2355, UTC_M4),
  p("Mustique", "Saint Vincent & the Grenadines", 12.8833, -61.1833, UTC_M4),
  p("Canouan", "Saint Vincent & the Grenadines", 12.7042, -61.3236, UTC_M4),
  p("Tobago Cays", "Saint Vincent & the Grenadines", 12.6300, -61.3500, UTC_M4),
  p("Clifton (Union Island)", "Saint Vincent & the Grenadines", 12.5953, -61.4153, UTC_M4),
  p("Bridgetown", "Barbados", 13.0969, -59.6145, UTC_M4),
  p("Hillsborough (Carriacou)", "Grenada", 12.4833, -61.4583, UTC_M4),
  p("St. George's", "Grenada", 12.0561, -61.7488, UTC_M4),
  p("Prickly Bay", "Grenada", 12.0017, -61.7633, UTC_M4),
  // Trinidad & Tobago
  p("Chaguaramas", "Trinidad & Tobago", 10.6764, -61.6380, UTC_M4),
  p("Port of Spain", "Trinidad & Tobago", 10.6596, -61.5086, UTC_M4),
  p("Scarborough", "Trinidad & Tobago", 11.1817, -60.7350, UTC_M4),
  p("Charlotteville", "Trinidad & Tobago", 11.3233, -60.5500, UTC_M4),
  // ABC Islands and Venezuela
  p("Oranjestad", "Aruba", 12.5186, -70.0358, UTC_M4),
  p("Willemstad", "Curaçao", 12.1091, -68.9316, UTC_M4),
  p("Kralendijk", "Bonaire", 12.1508, -68.2767, UTC_M4),
  p("Los Roques", "Venezuela", 11.9500, -66.6667, UTC_M4),
  p("Porlamar", "Venezuela", 10.9577, -63.8697, UTC_M4),
  // Colombia
  p("Santa Marta", "Colombia", 11.2408, -74.1990, UTC_M5),
  p("Cartagena", "Colombia", 10.3910, -75.4794, UTC_M5),
  p("Providencia", "Colombia", 13.3500, -81.3667, UTC_M5),
  p("San Andrés", "Colombia", 12.5847, -81.7006, UTC_M5),
  // Panama
  p("Shelter Bay", "Panama", 9.3697, -79.9524, UTC_M5),
  p("Colón", "Panama", 9.3547, -79.9003, UTC_M5),
  p("Portobelo", "Panama", 9.5547, -79.6553, UTC_M5),
  p("El Porvenir (San Blas)", "Panama", 9.5569, -78.9499, UTC_M5),
  p("Bocas del Toro", "Panama", 9.3403, -82.2420, UTC_M5),
  p("Balboa (Panama City)", "Panama", 8.9500, -79.5667, UTC_M5),
  p("Contadora (Las Perlas)", "Panama", 8.6267, -79.0367, UTC_M5),
  // Costa Rica
  p("Puerto Limón", "Costa Rica", 9.9907, -83.0360, UTC_M6),
  p("Golfito", "Costa Rica", 8.6400, -83.1700, UTC_M6),
  p("Quepos", "Costa Rica", 9.4306, -84.1619, UTC_M6),
  p("Puntarenas", "Costa Rica", 9.9763, -84.8384, UTC_M6),
  p("Playa del Coco", "Costa Rica", 10.5500, -85.7000, UTC_M6),
  // Nicaragua
  p("San Juan del Sur", "Nicaragua", 11.2529, -85.8705, UTC_M6),
  p("Bluefields", "Nicaragua", 12.0137, -83.7639, UTC_M6),
  // Honduras
  p("French Harbour (Roatán)", "Honduras", 16.3500, -86.4333, UTC_M6),
  p("Coxen Hole (Roatán)", "Honduras", 16.3167, -86.5333, UTC_M6),
  p("Utila", "Honduras", 16.0989, -86.8912, UTC_M6),
  p("Guanaja", "Honduras", 16.4500, -85.9000, UTC_M6),
  p("La Ceiba", "Honduras", 15.7597, -86.7822, UTC_M6),
  // Guatemala
  p("Río Dulce", "Guatemala", 15.6600, -88.9900, UTC_M6),
  p("Livingston", "Guatemala", 15.8275, -88.7500, UTC_M6),
  p("Puerto Barrios", "Guatemala", 15.7278, -88.5944, UTC_M6),
  // Belize
  p("Belize City", "Belize", 17.5046, -88.1962, UTC_M6),
  p("San Pedro (Ambergris Caye)", "Belize", 17.9214, -87.9611, UTC_M6),
  p("Caye Caulker", "Belize", 17.7500, -88.0333, UTC_M6),
  p("Placencia", "Belize", 16.5141, -88.3667, UTC_M6),
  // Mexico
  p("Isla Mujeres", "Mexico", 21.2322, -86.7319, UTC_M5),
  p("Cancún", "Mexico", 21.1619, -86.8515, UTC_M5),
  p("Puerto Morelos", "Mexico", 20.8470, -86.8757, UTC_M5),
  p("Cozumel", "Mexico", 20.5083, -86.9458, UTC_M5),
  p("Progreso", "Mexico", 21.2830, -89.6630, UTC_M6),
  p("Veracruz", "Mexico", 19.1738, -96.1342, UTC_M6),
  // Atlantic islands
  p("Horta", "Portugal", 38.5347, -28.6263, UTC_M1),
  p("Ponta Delgada", "Portugal", 37.7412, -25.6756, UTC_M1),
  p("Angra do Heroísmo", "Portugal", 38.6553, -27.2170, UTC_M1),
  p("Funchal", "Portugal", 32.6669, -16.9241, UTC_0),
  p("Las Palmas", "Spain", 28.1235, -15.4363, UTC_0),
  p("Santa Cruz de Tenerife", "Spain", 28.4636, -16.2518, UTC_0),
  p("Arrecife", "Spain", 28.9630, -13.5477, UTC_0),
  p("Marina Rubicón", "Spain", 28.8600, -13.8160, UTC_0),
  p("Mindelo", "Cape Verde", 16.8864, -24.9881, UTC_M1),
  p("Praia", "Cape Verde", 14.9330, -23.5133, UTC_M1),
  // Western Europe and Mediterranean
  p("Lisbon", "Portugal", 38.7223, -9.1393, UTC_0),
  p("Lagos", "Portugal", 37.1028, -8.6730, UTC_0),
  p("Porto", "Portugal", 41.1496, -8.6109, UTC_0),
  p("Cádiz", "Spain", 36.5271, -6.2886, UTC_P1),
  p("Málaga", "Spain", 36.7213, -4.4214, UTC_P1),
  p("Barcelona", "Spain", 41.3874, 2.1686, UTC_P1),
  p("Palma de Mallorca", "Spain", 39.5696, 2.6502, UTC_P1),
  p("Gibraltar", "Gibraltar", 36.1408, -5.3536, UTC_P1),
  p("Tangier", "Morocco", 35.7595, -5.8340, UTC_P1),
  p("Agadir", "Morocco", 30.4278, -9.5981, UTC_P1),
  p("Dakar", "Senegal", 14.7167, -17.4677, UTC_0),
  p("Banjul", "Gambia", 13.4549, -16.5790, UTC_0),
  p("Marseille", "France", 43.2965, 5.3698, UTC_P1),
  p("Nice", "France", 43.7102, 7.2620, UTC_P1),
  p("Naples", "Italy", 40.8518, 14.2681, UTC_P1),
  p("Palermo", "Italy", 38.1157, 13.3615, UTC_P1),
  p("Valletta", "Malta", 35.8989, 14.5146, UTC_P1),
  p("Split", "Croatia", 43.5081, 16.4402, UTC_P1),
  p("Piraeus", "Greece", 37.9475, 23.6372, UTC_P2),
]

/** Lowercase, accent-stripped form used for matching search text. */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}
